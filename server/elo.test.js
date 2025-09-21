import { v4 as uuidv4 } from 'uuid';

// ELO calculation constants
const K_FACTOR = 32;

// Helper function to calculate ELO change
const calculateEloChange = (playerElo, opponentElo, outcome) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(K_FACTOR * (outcome - expectedScore));
};

// Mock server for ELO testing
class EloTestServer {
  constructor() {
    this.users = new Map();
    this.duelRequests = new Map();
  }

  createUser(username, socketId, initialElo = 1000) {
    const user = {
      id: uuidv4(),
      username,
      socketId,
      wins: 0,
      losses: 0,
      followers: 0,
      elo: initialElo,
      posts: []
    };
    this.users.set(socketId, user);
    return user;
  }

  createDuelRequest(fromUser, toUser, postId) {
    const duelRequest = {
      id: uuidv4(),
      fromUserId: fromUser.id,
      fromUsername: fromUser.username,
      fromUserElo: fromUser.elo,
      toUserId: toUser.id,
      toUsername: toUser.username,
      toUserElo: toUser.elo,
      postId,
      status: 'pending',
      timestamp: new Date().toISOString(),
      fromUserMove: null,
      toUserMove: null,
      gameState: 'pending'
    };
    this.duelRequests.set(duelRequest.id, duelRequest);
    return duelRequest;
  }

  completeDuel(duelRequest, fromUserMove, toUserMove) {
    const fromUser = Array.from(this.users.values()).find(u => u.id === duelRequest.fromUserId);
    const toUser = Array.from(this.users.values()).find(u => u.id === duelRequest.toUserId);

    if (!fromUser || !toUser) {
      throw new Error('Users not found');
    }

    let fromUserOutcome, toUserOutcome;

    if (fromUserMove > toUserMove) {
      fromUserOutcome = 1;
      toUserOutcome = 0;
      fromUser.wins++;
      toUser.losses++;
    } else if (toUserMove > fromUserMove) {
      fromUserOutcome = 0;
      toUserOutcome = 1;
      toUser.wins++;
      fromUser.losses++;
    } else {
      fromUserOutcome = 0.5;
      toUserOutcome = 0.5;
      fromUser.wins++;
      toUser.wins++;
    }

    // Calculate and apply ELO changes
    const fromUserEloChange = calculateEloChange(fromUser.elo, toUser.elo, fromUserOutcome);
    const toUserEloChange = calculateEloChange(toUser.elo, fromUser.elo, toUserOutcome);

    fromUser.elo += fromUserEloChange;
    toUser.elo += toUserEloChange;

    return {
      fromUserEloChange,
      toUserEloChange,
      fromUserNewElo: fromUser.elo,
      toUserNewElo: toUser.elo
    };
  }
}

describe('ELO Rating System Tests', () => {
  let server;
  let user1, user2;
  let duelRequest;

  beforeEach(() => {
    server = new EloTestServer();
    user1 = server.createUser('alice', 'socket1', 1000); // Starting ELO: 1000
    user2 = server.createUser('bob', 'socket2', 1000);   // Starting ELO: 1000
    duelRequest = server.createDuelRequest(user1, user2, 'post123');
  });

  describe('Initial ELO Settings', () => {
    test('new users should start with 1000 ELO', () => {
      const newUser = server.createUser('carol', 'socket3');
      expect(newUser.elo).toBe(1000);
    });

    test('should allow custom initial ELO ratings', () => {
      const expertUser = server.createUser('dave', 'socket4', 1500);
      expect(expertUser.elo).toBe(1500);
    });
  });

  describe('ELO Calculations', () => {
    test('equal rated players should have symmetric ELO changes', () => {
      const result = server.completeDuel(duelRequest, 1000, 500); // user1 wins
      
      expect(Math.abs(result.fromUserEloChange)).toBe(Math.abs(result.toUserEloChange));
      expect(result.fromUserEloChange).toBe(16); // Winning against equal rated player
      expect(result.toUserEloChange).toBe(-16);
    });

    test('higher rated player should gain fewer points for winning against lower rated', () => {
      // Set up players with different ratings
      user1.elo = 1200; // Higher rated player
      user2.elo = 1000; // Lower rated player
      duelRequest = server.createDuelRequest(user1, user2, 'post124');

      const result = server.completeDuel(duelRequest, 1000, 500); // Higher rated player wins
      
      expect(result.fromUserEloChange).toBeLessThan(16); // Should gain fewer points
      expect(Math.abs(result.toUserEloChange)).toBeLessThan(16);
    });

    test('lower rated player should gain more points for winning against higher rated', () => {
      // Set up players with different ratings
      user1.elo = 1000; // Lower rated player
      user2.elo = 1200; // Higher rated player
      duelRequest = server.createDuelRequest(user1, user2, 'post125');

      const result = server.completeDuel(duelRequest, 1000, 500); // Lower rated player wins
      
      expect(result.fromUserEloChange).toBeGreaterThan(16); // Should gain more points
      expect(Math.abs(result.toUserEloChange)).toBeGreaterThan(16);
    });

    test('draws should result in smaller ELO changes', () => {
      const result = server.completeDuel(duelRequest, 500, 500); // Draw
      
      expect(Math.abs(result.fromUserEloChange)).toBeLessThan(16);
      expect(Math.abs(result.toUserEloChange)).toBeLessThan(16);
      expect(result.fromUserEloChange).toBe(0); // Equal rated players should not change ELO on draw
      expect(result.toUserEloChange).toBe(0);
    });
  });

  describe('ELO Integration with Stats', () => {
    test('winning should increase both ELO and win count', () => {
      const initialElo = user1.elo;
      const initialWins = user1.wins;
      
      server.completeDuel(duelRequest, 1000, 500); // user1 wins
      
      expect(user1.elo).toBeGreaterThan(initialElo);
      expect(user1.wins).toBe(initialWins + 1);
    });

    test('losing should decrease ELO but increase loss count', () => {
      const initialElo = user2.elo;
      const initialLosses = user2.losses;
      
      server.completeDuel(duelRequest, 1000, 500); // user2 loses
      
      expect(user2.elo).toBeLessThan(initialElo);
      expect(user2.losses).toBe(initialLosses + 1);
    });

    test('draws should update both players win counts but minimally affect ELO', () => {
      const user1InitialElo = user1.elo;
      const user2InitialElo = user2.elo;
      const user1InitialWins = user1.wins;
      const user2InitialWins = user2.wins;
      
      server.completeDuel(duelRequest, 500, 500); // Draw
      
      expect(user1.wins).toBe(user1InitialWins + 1);
      expect(user2.wins).toBe(user2InitialWins + 1);
      expect(Math.abs(user1.elo - user1InitialElo)).toBeLessThanOrEqual(16);
      expect(Math.abs(user2.elo - user2InitialElo)).toBeLessThanOrEqual(16);
    });
  });
});