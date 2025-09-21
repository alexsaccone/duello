import { v4 as uuidv4 } from 'uuid';

// Minimal mock server to exercise follow/unfollow behavior
class FollowersTestServer {
  constructor() {
    this.users = new Map(); // map socketId -> user
    this.usersById = new Map(); // map userId -> user
  }

  createUser(username, socketId) {
    const user = {
      id: uuidv4(),
      username,
      socketId,
      wins: 0,
      losses: 0,
      followers: 0,
      followersSet: new Set(),
      followingSet: new Set(),
      posts: []
    };
    this.users.set(socketId, user);
    this.usersById.set(user.id, user);
    return user;
  }

  follow(actorId, targetId) {
    const actor = this.usersById.get(actorId);
    const target = this.usersById.get(targetId);
    if (!actor || !target) throw new Error('User not found');
    if (actor.followingSet.has(targetId)) {
      return { ok: false, reason: 'already_following' };
    }
    actor.followingSet.add(targetId);
    target.followersSet.add(actorId);
    target.followers = target.followersSet.size;
    return { ok: true };
  }

  unfollow(actorId, targetId) {
    const actor = this.usersById.get(actorId);
    const target = this.usersById.get(targetId);
    if (!actor || !target) throw new Error('User not found');
    if (!actor.followingSet.has(targetId)) {
      return { ok: false, reason: 'not_following' };
    }
    actor.followingSet.delete(targetId);
    target.followersSet.delete(actorId);
    target.followers = target.followersSet.size;
    return { ok: true };
  }
}

describe('Followers feature', () => {
  let server;
  let alice, bob, carol;

  beforeEach(() => {
    server = new FollowersTestServer();
    alice = server.createUser('alice', 'socket1');
    bob = server.createUser('bob', 'socket2');
    carol = server.createUser('carol', 'socket3');
  });

  test('following increments target followers and updates sets', () => {
    expect(bob.followers).toBe(0);
    const res = server.follow(alice.id, bob.id);
    expect(res.ok).toBe(true);
    expect(bob.followers).toBe(1);
    expect(bob.followersSet.has(alice.id)).toBe(true);
    expect(alice.followingSet.has(bob.id)).toBe(true);
  });

  test('unfollowing decrements target followers and updates sets', () => {
    server.follow(alice.id, bob.id);
    expect(bob.followers).toBe(1);
    const res = server.unfollow(alice.id, bob.id);
    expect(res.ok).toBe(true);
    expect(bob.followers).toBe(0);
    expect(bob.followersSet.has(alice.id)).toBe(false);
    expect(alice.followingSet.has(bob.id)).toBe(false);
  });

  test('cannot follow twice (idempotent)', () => {
    const first = server.follow(alice.id, bob.id);
    expect(first.ok).toBe(true);
    const second = server.follow(alice.id, bob.id);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('already_following');
    expect(bob.followers).toBe(1);
  });

  test('cannot unfollow when not following', () => {
    const res = server.unfollow(alice.id, bob.id);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('not_following');
  });

  test('multiple followers update counts correctly', () => {
    server.follow(alice.id, bob.id);
    server.follow(carol.id, bob.id);
    expect(bob.followers).toBe(2);
    expect(bob.followersSet.has(alice.id)).toBe(true);
    expect(bob.followersSet.has(carol.id)).toBe(true);
    // One user unfollows
    server.unfollow(alice.id, bob.id);
    expect(bob.followers).toBe(1);
    expect(bob.followersSet.has(alice.id)).toBe(false);
  });
});
