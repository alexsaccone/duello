import { v4 as uuidv4 } from 'uuid';
import {CANVAS_WIDTH, CANVAS_HEIGHT, GUESS_AREA_RADIUS} from "./constants.js"

// New duel scoring system for canvas-based gameplay
class CanvasDuelServer {
  constructor() {
    this.users = new Map();
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
      gameState: 'pending',
      pointSource: this.generatePointSource() // Generate random point source for this duel
    };
  }

  generatePointSource() {
    // Generate random point source location within canvas bounds
    return {
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT
    };
  }

  // Calculate euclidean distance between two points
  calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Check if a point is inside a circular area
  isPointInCircle(point, circleCenter, radius) {
    const distance = this.calculateDistance(point, circleCenter);
    return distance <= radius;
  }

  // Calculate score based on distance to point source
  calculateScore(kingPosition, pointSource, isKingGuessed) {
    if (isKingGuessed) {
      return 0; // No points if king was guessed
    }

    const distance = this.calculateDistance(kingPosition, pointSource);
    return 1 / (distance + 1);
  }

  // Determine winner based on new scoring rules
  // Returns { winnerId: string, player1Score: number, player2Score: number }
  calculateDuelWinner(move1, move2, pointSource) {
    // Extract data from moves
    const king1 = move1.kingPosition;
    const guessedArea1 = move1.guessedArea;
    const king2 = move2.kingPosition;
    const guessedArea2 = move2.guessedArea;

    // Check if kings are guessed by opponents
    const king1Guessed = this.isPointInCircle(king1, guessedArea2.center, guessedArea2.radius);
    const king2Guessed = this.isPointInCircle(king2, guessedArea1.center, guessedArea1.radius);

    // Calculate scores
    const player1Score = this.calculateScore(king1, pointSource, king1Guessed);
    const player2Score = this.calculateScore(king2, pointSource, king2Guessed);

    // Determine winner
    let winnerId;
    if (player1Score > player2Score) {
      winnerId = 0; // Player 1 wins
    } else if (player2Score > player1Score) {
      winnerId = 1; // Player 2 wins
    } else {
      winnerId = 2; // Tie
    }

    return {
      winnerId,
      player1Score,
      player2Score,
      king1Guessed,
      king2Guessed
    };
  }

  addUser(username, socketId) {
    const user = this.createUser(username, socketId);
    this.users.set(socketId, user);
    return user;
  }

  // Validate canvas move structure with bounds checking
  validateCanvasMove(move) {
    if (!move || typeof move !== 'object') {
      return false;
    }

    // Check king position
    if (!move.kingPosition ||
        typeof move.kingPosition.x !== 'number' ||
        typeof move.kingPosition.y !== 'number') {
      return false;
    }

    // Validate king position bounds
    if (move.kingPosition.x < 0 || move.kingPosition.x > CANVAS_WIDTH ||
        move.kingPosition.y < 0 || move.kingPosition.y > CANVAS_HEIGHT) {
      return false;
    }

    // Check guessed area
    if (!move.guessedArea ||
        !move.guessedArea.center ||
        typeof move.guessedArea.center.x !== 'number' ||
        typeof move.guessedArea.center.y !== 'number' ||
        typeof move.guessedArea.radius !== 'number') {
      return false;
    }

    // Validate guessed area center bounds
    if (move.guessedArea.center.x < 0 || move.guessedArea.center.x > CANVAS_WIDTH ||
        move.guessedArea.center.y < 0 || move.guessedArea.center.y > CANVAS_HEIGHT) {
      return false;
    }

    // Validate guessed area radius bounds (fixed radius)
    if (move.guessedArea.radius !== GUESS_AREA_RADIUS) {
      return false;
    }

    // Check for NaN, Infinity, or non-finite numbers
    if (!Number.isFinite(move.kingPosition.x) || !Number.isFinite(move.kingPosition.y) ||
        !Number.isFinite(move.guessedArea.center.x) || !Number.isFinite(move.guessedArea.center.y) ||
        !Number.isFinite(move.guessedArea.radius)) {
      return false;
    }

    return true;
  }

  submitCanvasDuelMove(requestId, move, userId) {
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

    // Validate move structure with bounds checking
    if (!this.validateCanvasMove(move)) {
      throw new Error('Invalid move data');
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
      const result = this.calculateDuelWinner(
        duelRequest.fromUserMove,
        duelRequest.toUserMove,
        duelRequest.pointSource
      );

      let winnerId, winnerUsername;
      if (result.winnerId === 0) {
        winnerId = duelRequest.fromUserId;
        winnerUsername = duelRequest.fromUsername;
      } else if (result.winnerId === 1) {
        winnerId = duelRequest.toUserId;
        winnerUsername = duelRequest.toUsername;
      } else {
        winnerId = 'tie';
        winnerUsername = 'tie';
      }

      // Update user stats
      if (winnerId === 'tie') {
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

      return {
        completed: true,
        winnerId,
        result: {
          ...result,
          pointSource: duelRequest.pointSource
        }
      };
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

describe('Canvas Duel System Tests', () => {
  let server;
  let user1, user2;
  let duelRequest;

  beforeEach(() => {
    server = new CanvasDuelServer();

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

  describe('Point Source Generation', () => {
    test('should generate point source within canvas bounds', () => {
      const pointSource = server.generatePointSource();
      expect(pointSource.x).toBeGreaterThanOrEqual(0);
      expect(pointSource.x).toBeLessThanOrEqual(800);
      expect(pointSource.y).toBeGreaterThanOrEqual(0);
      expect(pointSource.y).toBeLessThanOrEqual(600);
    });

    test('should include point source in duel request', () => {
      expect(duelRequest.pointSource).toBeDefined();
      expect(duelRequest.pointSource.x).toBeDefined();
      expect(duelRequest.pointSource.y).toBeDefined();
    });
  });

  describe('Distance Calculation', () => {
    test('should calculate correct euclidean distance', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      const distance = server.calculateDistance(point1, point2);
      expect(distance).toBeCloseTo(5, 5); // 3-4-5 triangle
    });

    test('should return 0 for same points', () => {
      const point = { x: 100, y: 200 };
      const distance = server.calculateDistance(point, point);
      expect(distance).toBe(0);
    });
  });

  describe('Circle Collision Detection', () => {
    test('should detect point inside circle', () => {
      const point = { x: 100, y: 100 };
      const circleCenter = { x: 100, y: 100 };
      const radius = 50;

      expect(server.isPointInCircle(point, circleCenter, radius)).toBe(true);
    });

    test('should detect point outside circle', () => {
      const point = { x: 100, y: 200 };
      const circleCenter = { x: 100, y: 100 };
      const radius = 50;

      expect(server.isPointInCircle(point, circleCenter, radius)).toBe(false);
    });

    test('should handle point exactly on circle edge', () => {
      const point = { x: 150, y: 100 };
      const circleCenter = { x: 100, y: 100 };
      const radius = 50;

      expect(server.isPointInCircle(point, circleCenter, radius)).toBe(true);
    });
  });

  describe('Score Calculation', () => {
    test('should return 0 when king is guessed', () => {
      const kingPosition = { x: 100, y: 100 };
      const pointSource = { x: 0, y: 0 };
      const score = server.calculateScore(kingPosition, pointSource, true);
      expect(score).toBe(0);
    });

    test('should calculate score based on distance when king not guessed', () => {
      const kingPosition = { x: 3, y: 4 }; // Distance 5 from origin
      const pointSource = { x: 0, y: 0 };
      const score = server.calculateScore(kingPosition, pointSource, false);
      expect(score).toBeCloseTo(1/6, 5); // 1/(5+1)
    });

    test('should give maximum score when king is at point source', () => {
      const kingPosition = { x: 100, y: 100 };
      const pointSource = { x: 100, y: 100 };
      const score = server.calculateScore(kingPosition, pointSource, false);
      expect(score).toBe(1); // 1/(0+1)
    });
  });

  describe('Duel Winner Calculation', () => {
    const pointSource = { x: 400, y: 300 };

    test('should player 1 win when closer to point source and neither guessed', () => {
      const move1 = {
        kingPosition: { x: 410, y: 310 }, // Distance ~14.14
        guessedArea: { center: { x: 100, y: 100 }, radius: 30 }
      };
      const move2 = {
        kingPosition: { x: 450, y: 350 }, // Distance ~70.71
        guessedArea: { center: { x: 200, y: 200 }, radius: 30 }
      };

      const result = server.calculateDuelWinner(move1, move2, pointSource);

      expect(result.winnerId).toBe(0); // Player 1 wins
      expect(result.player1Score).toBeGreaterThan(result.player2Score);
      expect(result.king1Guessed).toBe(false);
      expect(result.king2Guessed).toBe(false);
    });

    test('should player 2 win when player 1 king is guessed', () => {
      const move1 = {
        kingPosition: { x: 410, y: 310 },
        guessedArea: { center: { x: 100, y: 100 }, radius: 30 }
      };
      const move2 = {
        kingPosition: { x: 450, y: 350 },
        guessedArea: { center: { x: 410, y: 310 }, radius: GUESS_AREA_RADIUS } // Guesses player 1's king
      };

      const result = server.calculateDuelWinner(move1, move2, pointSource);

      expect(result.winnerId).toBe(1); // Player 2 wins
      expect(result.player1Score).toBe(0); // Player 1 gets 0 for being guessed
      expect(result.player2Score).toBeGreaterThan(0);
      expect(result.king1Guessed).toBe(true);
      expect(result.king2Guessed).toBe(false);
    });

    test('should be a tie when both kings are guessed', () => {
      const move1 = {
        kingPosition: { x: 410, y: 310 },
        guessedArea: { center: { x: 450, y: 350 }, radius: GUESS_AREA_RADIUS } // Guesses player 2's king
      };
      const move2 = {
        kingPosition: { x: 450, y: 350 },
        guessedArea: { center: { x: 410, y: 310 }, radius: GUESS_AREA_RADIUS } // Guesses player 1's king
      };

      const result = server.calculateDuelWinner(move1, move2, pointSource);

      expect(result.winnerId).toBe(2); // Tie
      expect(result.player1Score).toBe(0);
      expect(result.player2Score).toBe(0);
      expect(result.king1Guessed).toBe(true);
      expect(result.king2Guessed).toBe(true);
    });

    test('should be a tie when scores are equal', () => {
      const move1 = {
        kingPosition: { x: 410, y: 310 }, // Same distance from point source
        guessedArea: { center: { x: 100, y: 100 }, radius: 30 }
      };
      const move2 = {
        kingPosition: { x: 390, y: 290 }, // Same distance from point source
        guessedArea: { center: { x: 200, y: 200 }, radius: 30 }
      };

      const result = server.calculateDuelWinner(move1, move2, pointSource);

      expect(result.winnerId).toBe(2); // Tie
      expect(result.player1Score).toBeCloseTo(result.player2Score, 5);
    });
  });

  describe('Move Validation', () => {
    test('should accept valid canvas move', () => {
      const validMove = {
        kingPosition: { x: 100, y: 100 },
        guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
      };

      expect(() => {
        server.submitCanvasDuelMove(duelRequest.id, validMove, user1.id);
      }).not.toThrow();
    });

    test('should reject move with missing king position', () => {
      const invalidMove = {
        guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
      };

      expect(() => {
        server.submitCanvasDuelMove(duelRequest.id, invalidMove, user1.id);
      }).toThrow('Invalid move data');
    });

    test('should reject move with missing guessed area', () => {
      const invalidMove = {
        kingPosition: { x: 100, y: 100 }
      };

      expect(() => {
        server.submitCanvasDuelMove(duelRequest.id, invalidMove, user1.id);
      }).toThrow('Invalid move data');
    });
  });

  describe('Canvas Duel Integration', () => {
    test('should complete duel and update stats when both players submit canvas moves', () => {
      const move1 = {
        kingPosition: { x: 410, y: 310 },
        guessedArea: { center: { x: 100, y: 100 }, radius: GUESS_AREA_RADIUS }
      };
      const move2 = {
        kingPosition: { x: 450, y: 350 },
        guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
      };

      // Initial stats
      expect(user1.wins).toBe(0);
      expect(user1.losses).toBe(0);
      expect(user2.wins).toBe(0);
      expect(user2.losses).toBe(0);

      // Submit moves
      server.submitCanvasDuelMove(duelRequest.id, move1, user1.id);
      const result = server.submitCanvasDuelMove(duelRequest.id, move2, user2.id);

      // Verify duel completed
      expect(result.completed).toBe(true);
      expect(result.result.pointSource).toBeDefined();

      // Verify stats updated (user1 should win as they're closer to point source)
      expect(user1.wins + user1.losses).toBe(1);
      expect(user2.wins + user2.losses).toBe(1);
    });
  });

  describe('Move Validation Security', () => {
    let server, user1, user2, duelRequest;

    beforeEach(() => {
      server = new CanvasDuelServer();
      user1 = server.addUser('alice', 'socket1');
      user2 = server.addUser('bob', 'socket2');
      duelRequest = server.createDuelRequest(
        user1.id, user1.username,
        user2.id, user2.username,
        'post123'
      );
      duelRequest.status = 'accepted';
      server.duelRequests.set(duelRequest.id, duelRequest);
    });

    describe('Valid moves should pass validation', () => {
      test('should accept valid move within all bounds', () => {
        const validMove = {
          kingPosition: { x: 400, y: 300 },
          guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
        };
        expect(server.validateCanvasMove(validMove)).toBe(true);
        expect(() => {
          server.submitCanvasDuelMove(duelRequest.id, validMove, user1.id);
        }).not.toThrow();
      });

      test('should accept move at boundary values', () => {
        const validMoves = [
          {
            kingPosition: { x: 0, y: 0 },
            guessedArea: { center: { x: 800, y: 600 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 800, y: 600 },
            guessedArea: { center: { x: 0, y: 0 }, radius: GUESS_AREA_RADIUS }
          }
        ];

        validMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(true);
        });
      });
    });

    describe('King position validation', () => {
      test('should reject king position outside canvas bounds', () => {
        const invalidMoves = [
          {
            kingPosition: { x: -1, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 801, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: -1 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 601 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });

      test('should reject missing or invalid king position', () => {
        const invalidMoves = [
          {
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: null,
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: "invalid", y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });
    });

    describe('Guessed area validation', () => {
      test('should reject guessed area center outside canvas bounds', () => {
        const invalidMoves = [
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: -1, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 801, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: -1 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 601 }, radius: GUESS_AREA_RADIUS }
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });

      test('should reject invalid guessed area radius', () => {
        const invalidMoves = [
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: 19 } // Too small
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: 101 } // Too large
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: -5 } // Negative
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: "invalid" } // Non-number
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });

      test('should reject missing or malformed guessed area', () => {
        const invalidMoves = [
          {
            kingPosition: { x: 400, y: 300 }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: null
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { radius: GUESS_AREA_RADIUS } // Missing center
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200 }, radius: GUESS_AREA_RADIUS } // Missing y coordinate
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });
    });

    describe('Special number handling', () => {
      test('should reject NaN values', () => {
        const invalidMoves = [
          {
            kingPosition: { x: NaN, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: NaN, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: NaN }
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });

      test('should reject Infinity values', () => {
        const invalidMoves = [
          {
            kingPosition: { x: Infinity, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 200, y: 200 }, radius: Infinity }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: -Infinity, y: 200 }, radius: GUESS_AREA_RADIUS }
          }
        ];

        invalidMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });
    });

    describe('Client-side manipulation attacks', () => {
      test('should prevent oversized guess area attack', () => {
        // Simulate a malicious client sending a huge guess area
        const maliciousMove = {
          kingPosition: { x: 400, y: 300 },
          guessedArea: { center: { x: 400, y: 300 }, radius: 500 } // Huge radius
        };

        expect(server.validateCanvasMove(maliciousMove)).toBe(false);
        expect(() => {
          server.submitCanvasDuelMove(duelRequest.id, maliciousMove, user1.id);
        }).toThrow('Invalid move data');
      });

      test('should prevent out-of-bounds positioning attack', () => {
        // Simulate a malicious client placing elements outside canvas
        const maliciousMoves = [
          {
            kingPosition: { x: 1000, y: 300 },
            guessedArea: { center: { x: 400, y: 300 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 1000, y: 300 }, radius: GUESS_AREA_RADIUS }
          }
        ];

        maliciousMoves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });

      test('should prevent precision-based floating point attacks', () => {
        // Test with extremely precise numbers that might bypass bounds checking
        const edge_case_moves = [
          {
            kingPosition: { x: 800.0000000001, y: 300 },
            guessedArea: { center: { x: 400, y: 300 }, radius: GUESS_AREA_RADIUS }
          },
          {
            kingPosition: { x: 400, y: 300 },
            guessedArea: { center: { x: 400, y: 300 }, radius: 100.0000000001 }
          }
        ];

        edge_case_moves.forEach(move => {
          expect(server.validateCanvasMove(move)).toBe(false);
          expect(() => {
            server.submitCanvasDuelMove(duelRequest.id, move, user1.id);
          }).toThrow('Invalid move data');
        });
      });
    });
  });
});