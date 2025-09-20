import { v4 as uuidv4 } from 'uuid';

// Mock the server functionality for testing
class DuelServer {
  constructor() {
    this.users = new Map();
    this.posts = [];
    this.duelRequests = new Map();
    this.duelHistory = new Map();
  }

  createUser(username, socketId) {
    return {
      id: uuidv4(),
      username,
      socketId,
      wins: 0,
      losses: 0,
      followers: 0,
      posts: []
    };
  }

  createDuelRequest(fromUserId, fromUsername, toUserId, toUsername, postId) {
    return {
      id: uuidv4(),
      fromUserId,
      fromUsername,
      toUserId,
      toUsername,
      postId,
      status: 'pending',
      timestamp: new Date().toISOString(),
      fromUserMove: null,
      toUserMove: null,
      gameState: 'pending'
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
      timestamp: new Date().toISOString(),
      originalPostContent
    };
  }

  addUser(username, socketId) {
    const user = this.createUser(username, socketId);
    this.users.set(socketId, user);
    return user;
  }

  submitDuelMove(requestId, move, userId) {
    const duelRequest = this.duelRequests.get(requestId);
    if (!duelRequest) {
      throw new Error('Invalid duel request');
    }

    if (duelRequest.status !== 'accepted') {
      throw new Error('Duel is not active');
    }

    if (duelRequest.gameState === 'completed') {
      throw new Error('Duel already completed');
    }

    // Determine which user is submitting the move
    const isFromUser = duelRequest.fromUserId === userId;

    // Check if this user has already submitted a move
    if ((isFromUser && duelRequest.fromUserMove !== null) ||
        (!isFromUser && duelRequest.toUserMove !== null)) {
      throw new Error('Move already submitted');
    }

    // Store the move
    if (isFromUser) {
      duelRequest.fromUserMove = move;
    } else {
      duelRequest.toUserMove = move;
    }

    // Check if both players have moved
    if (duelRequest.fromUserMove !== null && duelRequest.fromUserMove !== undefined &&
        duelRequest.toUserMove !== null && duelRequest.toUserMove !== undefined) {

      // Both players have moved, calculate winner
      let winnerId, winnerUsername;

      if (duelRequest.fromUserMove > duelRequest.toUserMove) {
        winnerId = duelRequest.fromUserId;
        winnerUsername = duelRequest.fromUsername;
      } else if (duelRequest.toUserMove > duelRequest.fromUserMove) {
        winnerId = duelRequest.toUserId;
        winnerUsername = duelRequest.toUsername;
      } else {
        // Tie
        winnerId = 'tie';
        winnerUsername = 'tie';
      }

      // Create duel history entry
      const historyEntry = this.createDuelHistory(
        duelRequest.fromUserId,
        duelRequest.fromUsername,
        duelRequest.toUserId,
        duelRequest.toUsername,
        duelRequest.postId,
        winnerId,
        winnerUsername,
        'Test post content'
      );

      this.duelHistory.set(historyEntry.id, historyEntry);

      // Update user stats
      if (winnerId === 'tie') {
        // Both players get a win for ties
        const fromUser = Array.from(this.users.values()).find(u => u.id === duelRequest.fromUserId);
        const toUser = Array.from(this.users.values()).find(u => u.id === duelRequest.toUserId);
        if (fromUser) fromUser.wins++;
        if (toUser) toUser.wins++;
      } else if (winnerId === duelRequest.fromUserId) {
        const winnerUser = Array.from(this.users.values()).find(u => u.id === duelRequest.fromUserId);
        const loserUser = Array.from(this.users.values()).find(u => u.id === duelRequest.toUserId);
        if (winnerUser) winnerUser.wins++;
        if (loserUser) loserUser.losses++;
      } else {
        const winnerUser = Array.from(this.users.values()).find(u => u.id === duelRequest.toUserId);
        const loserUser = Array.from(this.users.values()).find(u => u.id === duelRequest.fromUserId);
        if (winnerUser) winnerUser.wins++;
        if (loserUser) loserUser.losses++;
      }

      // Mark duel as completed and remove from active requests
      duelRequest.gameState = 'completed';
      this.duelRequests.delete(requestId);

      return { completed: true, winnerId, historyEntry };
    }

    return { completed: false };
  }

  acceptDuelRequest(requestId) {
    const duelRequest = this.duelRequests.get(requestId);
    if (duelRequest) {
      duelRequest.status = 'accepted';
    }
  }
}

describe('Duel System Tests', () => {
  let server;
  let user1, user2;
  let duelRequest;

  beforeEach(() => {
    server = new DuelServer();

    // Add two users
    user1 = server.addUser('alice', 'socket1');
    user2 = server.addUser('bob', 'socket2');

    // Create a duel request
    duelRequest = server.createDuelRequest(
      user1.id, user1.username,
      user2.id, user2.username,
      'post123'
    );

    server.duelRequests.set(duelRequest.id, duelRequest);
    server.acceptDuelRequest(duelRequest.id);
  });

  describe('Win-Loss Ratio Updates', () => {
    test('should correctly update win-loss ratios when user1 wins', () => {
      // Initial stats
      expect(user1.wins).toBe(0);
      expect(user1.losses).toBe(0);
      expect(user2.wins).toBe(0);
      expect(user2.losses).toBe(0);

      // User1 submits higher move first
      server.submitDuelMove(duelRequest.id, 750, user1.id);

      // User2 submits lower move, completing the duel
      const result = server.submitDuelMove(duelRequest.id, 500, user2.id);

      // Verify duel completed
      expect(result.completed).toBe(true);
      expect(result.winnerId).toBe(user1.id);

      // Verify stats updated correctly
      expect(user1.wins).toBe(1);
      expect(user1.losses).toBe(0);
      expect(user2.wins).toBe(0);
      expect(user2.losses).toBe(1);
    });

    test('should correctly update win-loss ratios when user2 wins', () => {
      // User1 submits lower move
      server.submitDuelMove(duelRequest.id, 300, user1.id);

      // User2 submits higher move, completing the duel
      const result = server.submitDuelMove(duelRequest.id, 800, user2.id);

      // Verify duel completed
      expect(result.completed).toBe(true);
      expect(result.winnerId).toBe(user2.id);

      // Verify stats updated correctly
      expect(user1.wins).toBe(0);
      expect(user1.losses).toBe(1);
      expect(user2.wins).toBe(1);
      expect(user2.losses).toBe(0);
    });

    test('should correctly handle ties (both users get wins)', () => {
      // Both users submit same move
      server.submitDuelMove(duelRequest.id, 500, user1.id);
      const result = server.submitDuelMove(duelRequest.id, 500, user2.id);

      // Verify duel completed as tie
      expect(result.completed).toBe(true);
      expect(result.winnerId).toBe('tie');

      // Both users should get a win for ties
      expect(user1.wins).toBe(1);
      expect(user1.losses).toBe(0);
      expect(user2.wins).toBe(1);
      expect(user2.losses).toBe(0);
    });
  });

  describe('Duplicate Move Submission Prevention', () => {
    test('should prevent duplicate move submissions from the same user', () => {
      // User1 submits a move
      const result1 = server.submitDuelMove(duelRequest.id, 750, user1.id);
      expect(result1.completed).toBe(false); // Duel not completed yet

      // User1 tries to submit another move - should be rejected
      expect(() => {
        server.submitDuelMove(duelRequest.id, 800, user1.id);
      }).toThrow('Move already submitted');

      // Verify original move is still stored
      const storedRequest = server.duelRequests.get(duelRequest.id);
      expect(storedRequest.fromUserMove).toBe(750);
      expect(storedRequest.toUserMove).toBe(null);
    });

    test('should allow different users to submit moves', () => {
      // User1 submits a move
      server.submitDuelMove(duelRequest.id, 750, user1.id);

      // Verify first move is stored and duel is still active
      let storedRequest = server.duelRequests.get(duelRequest.id);
      expect(storedRequest.fromUserMove).toBe(750);
      expect(storedRequest.toUserMove).toBe(null);

      // User2 should be able to submit a move
      expect(() => {
        server.submitDuelMove(duelRequest.id, 500, user2.id);
      }).not.toThrow();

      // After both moves, duel should be completed and removed from active requests
      // But we can verify it completed successfully by checking user stats
      expect(user1.wins).toBe(1);
      expect(user2.losses).toBe(1);
    });

    test('should prevent move submission after duel completion', () => {
      // Complete the duel
      server.submitDuelMove(duelRequest.id, 750, user1.id);
      server.submitDuelMove(duelRequest.id, 500, user2.id);

      // Create a new duel request to test against
      const newDuelRequest = server.createDuelRequest(
        user1.id, user1.username,
        user2.id, user2.username,
        'post456'
      );
      newDuelRequest.gameState = 'completed';
      server.duelRequests.set(newDuelRequest.id, newDuelRequest);
      server.acceptDuelRequest(newDuelRequest.id);

      // Trying to submit a move to completed duel should fail
      expect(() => {
        server.submitDuelMove(newDuelRequest.id, 600, user1.id);
      }).toThrow('Duel already completed');
    });

    test('should prevent move submission to non-accepted duels', () => {
      // Create a pending duel request
      const pendingDuel = server.createDuelRequest(
        user1.id, user1.username,
        user2.id, user2.username,
        'post789'
      );
      server.duelRequests.set(pendingDuel.id, pendingDuel);
      // Don't accept it, leave it as 'pending'

      // Trying to submit a move to pending duel should fail
      expect(() => {
        server.submitDuelMove(pendingDuel.id, 600, user1.id);
      }).toThrow('Duel is not active');
    });
  });

  describe('Duel History Creation', () => {
    test('should create duel history entry when duel completes', () => {
      // Complete a duel
      server.submitDuelMove(duelRequest.id, 750, user1.id);
      const result = server.submitDuelMove(duelRequest.id, 500, user2.id);

      // Verify history entry was created
      expect(result.historyEntry).toBeDefined();
      expect(result.historyEntry.fromUserId).toBe(user1.id);
      expect(result.historyEntry.toUserId).toBe(user2.id);
      expect(result.historyEntry.winnerId).toBe(user1.id);
      expect(result.historyEntry.winnerUsername).toBe(user1.username);

      // Verify it's stored in history
      const historyEntries = Array.from(server.duelHistory.values());
      expect(historyEntries.length).toBe(1);
      expect(historyEntries[0].id).toBe(result.historyEntry.id);
    });

    test('should remove completed duel from active requests', () => {
      // Verify duel is initially in active requests
      expect(server.duelRequests.has(duelRequest.id)).toBe(true);

      // Complete the duel
      server.submitDuelMove(duelRequest.id, 750, user1.id);
      server.submitDuelMove(duelRequest.id, 500, user2.id);

      // Verify duel is removed from active requests
      expect(server.duelRequests.has(duelRequest.id)).toBe(false);
    });
  });
});