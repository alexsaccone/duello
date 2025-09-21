import { v4 as uuidv4 } from 'uuid';

// Test class for duel stakes functionality
class DuelStakesServer {
  constructor() {
    this.users = new Map();
    this.posts = [];
    this.duelHistory = new Map();
    this.duelRequests = new Map();
  }

  createUser(username, socketId) {
    return {
      id: uuidv4(),
      username,
      socketId,
      elo: 1000,
      wins: 0,
      losses: 0
    };
  }

  createPost(userId, username, content) {
    return {
      id: uuidv4(),
      userId,
      username,
      content,
      timestamp: new Date().toISOString(),
      deleted: false
    };
  }

  createDuelHistory(fromUserId, fromUsername, toUserId, toUsername, postId, winnerId, winnerUsername, originalPostContent) {
    return {
      id: uuidv4(),
      fromUserId,
      fromUsername,
      toUserId,
      toUsername,
      postId,
      winnerId,
      winnerUsername,
      originalPostContent,
      timestamp: new Date().toISOString(),
      postDestroyed: false,
      hijackPostUsed: false
    };
  }

  // Destroy post (challenger wins)
  destroyPost(historyId, userId) {
    const history = this.duelHistory.get(historyId);
    if (!history) {
      throw new Error('Duel history not found');
    }

    // Only challenger can destroy if they won
    if (history.fromUserId !== userId || history.winnerId !== userId) {
      throw new Error('Only the winning challenger can destroy the post');
    }

    if (history.postDestroyed) {
      throw new Error('Post already destroyed');
    }

    // Find and mark post as deleted
    const post = this.posts.find(p => p.id === history.postId);
    if (post) {
      post.deleted = true;
    }

    // Mark in history
    history.postDestroyed = true;

    return { success: true, postId: history.postId };
  }

  // Post on behalf of loser (challenger loses)
  postOnBehalf(historyId, userId, content) {
    const history = this.duelHistory.get(historyId);
    if (!history) {
      throw new Error('Duel history not found');
    }

    // Only winner can post on behalf if challenger lost
    if (history.winnerId !== userId || history.fromUserId === userId) {
      throw new Error('Only the winner can post on behalf when challenger loses');
    }

    if (history.hijackPostUsed) {
      throw new Error('Hijack post privilege already used');
    }

    // Determine who to post as (the loser)
    const loserId = history.fromUserId === history.winnerId ? history.toUserId : history.fromUserId;
    const loserUsername = history.fromUserId === history.winnerId ? history.toUsername : history.fromUsername;

    // Create post as the loser
    const hijackPost = this.createPost(loserId, loserUsername, content);
    this.posts.unshift(hijackPost);

    // Mark privilege as used
    history.hijackPostUsed = true;

    return { success: true, post: hijackPost };
  }

  // Get available actions for a duel history entry
  getAvailableActions(historyId, userId) {
    const history = this.duelHistory.get(historyId);
    if (!history) {
      return { canDestroy: false, canPostOnBehalf: false, canForward: false };
    }

    const isWinner = history.winnerId === userId;
    const isChallenger = history.fromUserId === userId;
    const challengerWon = history.winnerId === history.fromUserId;

    return {
      canDestroy: isChallenger && challengerWon && !history.postDestroyed,
      canPostOnBehalf: isWinner && !challengerWon && !history.hijackPostUsed,
      canForward: challengerWon // Only show forward when challenger won
    };
  }

  addUser(username, socketId) {
    const user = this.createUser(username, socketId);
    this.users.set(socketId, user);
    return user;
  }
}

describe('Duel Stakes System Tests', () => {
  let server;
  let challenger, defender;
  let originalPost;

  beforeEach(() => {
    server = new DuelStakesServer();

    // Create users
    challenger = server.addUser('alice', 'socket1');
    defender = server.addUser('bob', 'socket2');

    // Create original post that duel is about
    originalPost = server.createPost(defender.id, defender.username, 'This is a controversial post');
    server.posts.push(originalPost);
  });

  describe('Challenger Wins Scenario', () => {
    let challengerWinHistory;

    beforeEach(() => {
      // Create duel history where challenger won
      challengerWinHistory = server.createDuelHistory(
        challenger.id, challenger.username,
        defender.id, defender.username,
        originalPost.id,
        challenger.id, challenger.username, // challenger won
        originalPost.content
      );
      server.duelHistory.set(challengerWinHistory.id, challengerWinHistory);
    });

    test('should allow challenger to destroy post when they win', () => {
      const result = server.destroyPost(challengerWinHistory.id, challenger.id);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(originalPost.id);

      // Check post is marked as deleted
      const post = server.posts.find(p => p.id === originalPost.id);
      expect(post.deleted).toBe(true);

      // Check history is updated
      expect(challengerWinHistory.postDestroyed).toBe(true);
    });

    test('should prevent destroying post twice', () => {
      server.destroyPost(challengerWinHistory.id, challenger.id);

      expect(() => {
        server.destroyPost(challengerWinHistory.id, challenger.id);
      }).toThrow('Post already destroyed');
    });

    test('should prevent defender from destroying post', () => {
      expect(() => {
        server.destroyPost(challengerWinHistory.id, defender.id);
      }).toThrow('Only the winning challenger can destroy the post');
    });

    test('should show correct available actions for challenger who won', () => {
      const actions = server.getAvailableActions(challengerWinHistory.id, challenger.id);

      expect(actions.canDestroy).toBe(true);
      expect(actions.canPostOnBehalf).toBe(false);
      expect(actions.canForward).toBe(true);
    });

    test('should show correct available actions for defender who lost', () => {
      const actions = server.getAvailableActions(challengerWinHistory.id, defender.id);

      expect(actions.canDestroy).toBe(false);
      expect(actions.canPostOnBehalf).toBe(false);
      expect(actions.canForward).toBe(true);
    });
  });

  describe('Challenger Loses Scenario', () => {
    let challengerLoseHistory;

    beforeEach(() => {
      // Create duel history where defender won
      challengerLoseHistory = server.createDuelHistory(
        challenger.id, challenger.username,
        defender.id, defender.username,
        originalPost.id,
        defender.id, defender.username, // defender won
        originalPost.content
      );
      server.duelHistory.set(challengerLoseHistory.id, challengerLoseHistory);
    });

    test('should allow winner to post on behalf of challenger when challenger loses', () => {
      const hijackContent = 'I was wrong about everything, sorry everyone!';
      const result = server.postOnBehalf(challengerLoseHistory.id, defender.id, hijackContent);

      expect(result.success).toBe(true);
      expect(result.post.content).toBe(hijackContent);
      expect(result.post.username).toBe(challenger.username); // Posted as challenger
      expect(result.post.userId).toBe(challenger.id); // From challenger's account

      // Check post is in feed
      const newPost = server.posts.find(p => p.content === hijackContent);
      expect(newPost).toBeDefined();
      expect(newPost.username).toBe(challenger.username);

      // Check privilege is marked as used
      expect(challengerLoseHistory.hijackPostUsed).toBe(true);
    });

    test('should prevent using hijack privilege twice', () => {
      server.postOnBehalf(challengerLoseHistory.id, defender.id, 'First hijack post');

      expect(() => {
        server.postOnBehalf(challengerLoseHistory.id, defender.id, 'Second hijack post');
      }).toThrow('Hijack post privilege already used');
    });

    test('should prevent challenger from posting on their own behalf', () => {
      expect(() => {
        server.postOnBehalf(challengerLoseHistory.id, challenger.id, 'Trying to post');
      }).toThrow('Only the winner can post on behalf when challenger loses');
    });

    test('should show correct available actions for defender who won', () => {
      const actions = server.getAvailableActions(challengerLoseHistory.id, defender.id);

      expect(actions.canDestroy).toBe(false);
      expect(actions.canPostOnBehalf).toBe(true);
      expect(actions.canForward).toBe(false); // No forward when challenger loses
    });

    test('should show correct available actions for challenger who lost', () => {
      const actions = server.getAvailableActions(challengerLoseHistory.id, challenger.id);

      expect(actions.canDestroy).toBe(false);
      expect(actions.canPostOnBehalf).toBe(false);
      expect(actions.canForward).toBe(false); // No forward when challenger loses
    });
  });

  describe('Edge Cases', () => {
    test('should handle non-existent duel history', () => {
      const fakeId = uuidv4();

      expect(() => {
        server.destroyPost(fakeId, challenger.id);
      }).toThrow('Duel history not found');

      expect(() => {
        server.postOnBehalf(fakeId, defender.id, 'content');
      }).toThrow('Duel history not found');
    });

    test('should handle tie scenarios correctly', () => {
      const tieHistory = server.createDuelHistory(
        challenger.id, challenger.username,
        defender.id, defender.username,
        originalPost.id,
        'tie', 'tie', // tie result
        originalPost.content
      );
      server.duelHistory.set(tieHistory.id, tieHistory);

      const challengerActions = server.getAvailableActions(tieHistory.id, challenger.id);
      const defenderActions = server.getAvailableActions(tieHistory.id, defender.id);

      // In ties, no special actions should be available
      expect(challengerActions.canDestroy).toBe(false);
      expect(challengerActions.canPostOnBehalf).toBe(false);
      expect(defenderActions.canDestroy).toBe(false);
      expect(defenderActions.canPostOnBehalf).toBe(false);
    });
  });
});