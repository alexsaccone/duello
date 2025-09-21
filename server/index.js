import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {CANVAS_HEIGHT, CANVAS_WIDTH, GUESS_AREA_RADIUS} from "./constants.js"

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory data storage (for demo purposes)
const users = new Map();
const posts = [];
const duelRequests = new Map();
const duelHistory = new Map();

// User object structure
const createUser = (username, socketId, password, profilePicture) => ({
  id: uuidv4(),
  username,
  password, // Store password (not hashed for demo purposes)
  profilePicture, // Store profile picture as base64 string
  socketId,
  wins: 0,
  losses: 0,
  followers: 0,
  elo: 1000, // Initialize ELO for new users
  posts: []
});

// ELO calculation constants
const K_FACTOR = 32; // Max ELO adjustment per game

// Helper function to calculate ELO change
const calculateEloChange = (playerElo, opponentElo, outcome) => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(K_FACTOR * (outcome - expectedScore));
};

// Post object structure
const createPost = (user, content) => ({
  id: uuidv4(),
  userId: user.id,
  username: user.username,
  profilePicture: user.profilePicture, // Include profile picture in posts
  content,
  timestamp: new Date().toISOString(),
  authorElo: user.elo,
  duelRequests: []
});
// Generate random point source for canvas duels
const generatePointSource = () => ({
  x: Math.random() * CANVAS_WIDTH,
  y: Math.random() * CANVAS_HEIGHT
});

// Calculate euclidean distance between two points
const calculateDistance = (point1, point2) => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Check if a point is inside a circular area
const isPointInCircle = (point, circleCenter, radius) => {
  const distance = calculateDistance(point, circleCenter);
  return distance <= radius;
};

// Calculate score based on distance to point source
const calculateScore = (kingPosition, pointSource, isKingGuessed) => {
  if (isKingGuessed) {
    return 0; // No points if king was guessed
  }
  const distance = calculateDistance(kingPosition, pointSource);
  return 1 / (distance + 1);
};

// Determine winner based on canvas duel scoring rules
const calculateCanvasDuelWinner = (move1, move2, pointSource) => {
  // Extract data from moves
  const king1 = move1.kingPosition;
  const guessedArea1 = move1.guessedArea;
  const king2 = move2.kingPosition;
  const guessedArea2 = move2.guessedArea;

  // Check if kings are guessed by opponents
  const king1Guessed = isPointInCircle(king1, guessedArea2.center, guessedArea2.radius);
  const king2Guessed = isPointInCircle(king2, guessedArea1.center, guessedArea1.radius);

  // Calculate scores
  const player1Score = calculateScore(king1, pointSource, king1Guessed);
  const player2Score = calculateScore(king2, pointSource, king2Guessed);

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
};

// Validate canvas move structure
const validateCanvasMove = (move) => {
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
};

// Duel request object structure
const createDuelRequest = (fromUserId, fromUsername, fromUserElo, toUserId, toUsername, toUserElo, postId) => ({
  id: uuidv4(),
  fromUserId,
  fromUsername,
  fromUserElo,
  toUserId,
  toUsername,
  toUserElo,
  postId,
  status: 'pending', // pending, accepted, declined
  timestamp: new Date().toISOString(),
  fromUserMove: null,
  toUserMove: null,
  gameState: 'waiting_for_moves',
  pointSource: generatePointSource() // Generate random point source for this duel
});

// Duel history object structure
const createDuelHistory = (fromUserId, fromUsername, toUserId, toUsername, postId, winnerId, winnerUsername, originalPostContent) => ({
  id: uuidv4(),
  fromUserId,
  fromUsername,
  toUserId,
  toUsername,
  postId,
  winnerId,
  winnerUsername,
  timestamp: new Date().toISOString(),
  originalPostContent,
  postDestroyed: false,
  hijackPostUsed: false
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Helper to build authenticated payload with full post objects
  const makeUserResponse = (u) => {
    const fullPosts = posts.filter(p => p.userId === u.id);
    const userResponse = { ...u, posts: fullPosts, elo: u.elo };
    delete userResponse.password;
    return userResponse;
  };

  // User authentication/registration
  socket.on('register', (data) => {
    // Handle both old format (string) and new format (object)
    const username = typeof data === 'string' ? data : data.username;
    const password = typeof data === 'object' ? data.password : undefined;
    const profilePicture = typeof data === 'object' ? data.profilePicture : undefined;

    if (Array.from(users.values()).some(user => user.username === username)) {
      socket.emit('error', 'Username already taken');
      return;
    }

    const user = createUser(username, socket.id, password, profilePicture);
    users.set(socket.id, user);
    
  // Send authenticated payload with full post objects
  socket.emit('authenticated', makeUserResponse(user));

    // Send existing posts to the new user
    socket.emit('allPosts', posts);

    console.log(`User registered: ${username}`);
  });

  // Create a new post
  socket.on('createPost', (content) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const post = createPost(user, content);
    posts.unshift(post); // Add to beginning of array
    user.posts.push(post.id);

    // Broadcast the new post to all connected clients
    io.emit('newPost', post);

    console.log(`New post by ${user.username}: ${content}`);
  // Send updated authenticated payload (including full posts) to the creator
  socket.emit('authenticated', makeUserResponse(user));
  });

  // Send duel request
  socket.on('sendDuelRequest', ({ postId, targetUserId }) => {
    const requester = users.get(socket.id);
    if (!requester) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    // Find target user by ID
    const targetUser = Array.from(users.values()).find(user => user.id === targetUserId);
    if (!targetUser) {
      socket.emit('error', 'Target user not found');
      return;
    }

    // Check if duel request already exists
    const existingRequest = Array.from(duelRequests.values()).find(
      req => req.fromUserId === requester.id && req.toUserId === targetUserId && req.postId === postId
    );

    if (existingRequest) {
      socket.emit('error', 'Duel request already sent');
      return;
    }

    const duelRequest = createDuelRequest(
      requester.id,
      requester.username,
      requester.elo,
      targetUserId,
      targetUser.username,
      targetUser.elo,
      postId
    );

    duelRequests.set(duelRequest.id, duelRequest);

    // Notify the target user
    if (targetUser.socketId) {
      io.to(targetUser.socketId).emit('duelRequestReceived', duelRequest);
    }

    // Confirm to sender
    socket.emit('duelRequestSent', duelRequest);

    console.log(`Duel request from ${requester.username} to ${targetUser.username}`);
  });

  // Respond to duel request
  socket.on('respondToDuelRequest', ({ requestId, response }) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const duelRequest = duelRequests.get(requestId);
    if (!duelRequest || duelRequest.toUserId !== user.id) {
      socket.emit('error', 'Invalid duel request');
      return;
    }

    duelRequest.status = response; // 'accepted' or 'declined'

    // Find the requester
    const requester = Array.from(users.values()).find(u => u.id === duelRequest.fromUserId);
    if (requester && requester.socketId) {
      io.to(requester.socketId).emit('duelRequestResponse', {
        requestId,
        response,
        responderUsername: user.username
      });
    }

    console.log(`Duel request ${response} by ${user.username}`);
  });

  // Get user's duel requests
  socket.on('getDuelRequests', () => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const userDuelRequests = Array.from(duelRequests.values()).filter(
      req => req.fromUserId === user.id || req.toUserId === user.id
    );

    socket.emit('duelRequests', userDuelRequests);
  });

  // Search users
  socket.on('searchUsers', (query) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const matchingUsers = Array.from(users.values())
      .filter(u => u.username.toLowerCase().includes(query.toLowerCase()) && u.id !== user.id)
      .map(u => ({ id: u.id, username: u.username, profilePicture: u.profilePicture, wins: u.wins, losses: u.losses, followers: u.followers, elo: u.elo }));

    socket.emit('searchResults', matchingUsers);
  });

  // Get user profile
  socket.on('getUserProfile', (userId) => {
    const targetUser = Array.from(users.values()).find(user => user.id === userId);
    if (!targetUser) {
      socket.emit('error', 'User not found');
      return;
    }

    const userPosts = posts.filter(post => post.userId === userId);
    const profile = {
      id: targetUser.id,
      username: targetUser.username,
      profilePicture: targetUser.profilePicture,
      wins: targetUser.wins,
      losses: targetUser.losses,
      followers: targetUser.followers,
      elo: targetUser.elo,
      posts: userPosts
    };

    // Emit to both generic and specific event for caching
    socket.emit('userProfile', profile);
    socket.emit(`userProfile_${userId}`, {
      id: targetUser.id,
      username: targetUser.username,
      profilePicture: targetUser.profilePicture,
      wins: targetUser.wins,
      losses: targetUser.losses,
      followers: targetUser.followers,
      elo: targetUser.elo,
    });
  });

  // Get user profile by username
  socket.on('getUserProfileByUsername', (username) => {
    const targetUser = Array.from(users.values()).find(user => user.username === username);
    if (!targetUser) {
      socket.emit('error', 'User not found');
      return;
    }

    const userPosts = posts.filter(post => post.userId === targetUser.id);
    const profile = {
      id: targetUser.id,
      username: targetUser.username,
      profilePicture: targetUser.profilePicture,
      wins: targetUser.wins,
      losses: targetUser.losses,
      followers: targetUser.followers,
      elo: targetUser.elo,
      posts: userPosts
    };

    socket.emit('userProfile', profile);
  });

  // Get all posts
  socket.on('getAllPosts', () => {
    socket.emit('allPosts', posts);
  });

  // Complete duel and record result
  socket.on('completeDuel', ({ requestId, winnerId }) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const duelRequest = duelRequests.get(requestId);
    if (!duelRequest || (duelRequest.fromUserId !== user.id && duelRequest.toUserId !== user.id)) {
      socket.emit('error', 'Invalid duel request');
      return;
    }

    if (duelRequest.status !== 'accepted') {
      socket.emit('error', 'Duel is not active');
      return;
    }

    // Find the winner
    const winner = Array.from(users.values()).find(u => u.id === winnerId);
    if (!winner) {
      socket.emit('error', 'Winner not found');
      return;
    }

    // Find the original post
    const originalPost = posts.find(p => p.id === duelRequest.postId);

    // Create duel history entry
    const historyEntry = createDuelHistory(
      duelRequest.fromUserId,
      duelRequest.fromUsername,
      duelRequest.toUserId,
      duelRequest.toUsername,
      duelRequest.postId,
      winnerId,
      winner.username,
      originalPost ? originalPost.content : ''
    );

    duelHistory.set(historyEntry.id, historyEntry);

    // Update user stats
    if (winnerId === duelRequest.fromUserId) {
      const winnerUser = Array.from(users.values()).find(u => u.id === duelRequest.fromUserId);
      const loserUser = Array.from(users.values()).find(u => u.id === duelRequest.toUserId);
      if (winnerUser) winnerUser.wins++;
      if (loserUser) loserUser.losses++;
    } else {
      const winnerUser = Array.from(users.values()).find(u => u.id === duelRequest.toUserId);
      const loserUser = Array.from(users.values()).find(u => u.id === duelRequest.fromUserId);
      if (winnerUser) winnerUser.wins++;
      if (loserUser) loserUser.losses++;
    }

    // Remove completed duel from active requests
    duelRequests.delete(requestId);

    // Notify both users
    const otherUserId = duelRequest.fromUserId === user.id ? duelRequest.toUserId : duelRequest.fromUserId;
    const otherUser = Array.from(users.values()).find(u => u.id === otherUserId);

    if (otherUser && otherUser.socketId) {
      io.to(otherUser.socketId).emit('duelCompleted', historyEntry);
    }
    socket.emit('duelCompleted', historyEntry);

    console.log(`Duel completed: ${winner.username} won`);
  });

  // Get user's duel history
  socket.on('getDuelHistory', () => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const userDuelHistory = Array.from(duelHistory.values()).filter(
      history => history.fromUserId === user.id || history.toUserId === user.id
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    socket.emit('duelHistory', userDuelHistory);
  });

  // Forward duel result as a post
  socket.on('forwardDuelResult', ({ historyId }) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const historyEntry = duelHistory.get(historyId);
    if (!historyEntry || (historyEntry.fromUserId !== user.id && historyEntry.toUserId !== user.id)) {
      socket.emit('error', 'Invalid duel history entry');
      return;
    }

    const isWinner = historyEntry.winnerId === user.id;
    const opponentUsername = historyEntry.fromUserId === user.id ? historyEntry.toUsername : historyEntry.fromUsername;

    const resultText = isWinner
      ? `🏆 I just won a duel against @${opponentUsername}!`
      : `⚔️ I had an epic duel with @${opponentUsername} - they got me this time!`;

    const post = createPost(user, resultText);
    posts.unshift(post);
    user.posts.push(post.id);

    // Broadcast the new post to all connected clients
    io.emit('newPost', post);

    // Send updated authenticated payload to the creator
    socket.emit('authenticated', makeUserResponse(user));

    console.log(`Duel result forwarded by ${user.username}`);
  });

  // Destroy post (challenger wins scenario)
  socket.on('destroyPost', ({ historyId }) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const historyEntry = duelHistory.get(historyId);
    if (!historyEntry) {
      socket.emit('error', 'Duel history not found');
      return;
    }

    // Only challenger can destroy if they won
    if (historyEntry.fromUserId !== user.id || historyEntry.winnerId !== user.id) {
      socket.emit('error', 'Only the winning challenger can destroy the post');
      return;
    }

    if (historyEntry.postDestroyed) {
      socket.emit('error', 'Post already destroyed');
      return;
    }

    // Find and mark post as deleted
    const postIndex = posts.findIndex(p => p.id === historyEntry.postId);
    if (postIndex !== -1) {
      posts.splice(postIndex, 1); // Remove from posts array
    }

    // Mark in history
    historyEntry.postDestroyed = true;

    // Broadcast post deletion to all users
    io.emit('postDeleted', { postId: historyEntry.postId });

    // Send updated duel history to both participants
    const fromUser = Array.from(users.values()).find(u => u.id === historyEntry.fromUserId);
    const toUser = Array.from(users.values()).find(u => u.id === historyEntry.toUserId);

    if (fromUser && fromUser.socketId) {
      io.to(fromUser.socketId).emit('duelHistory', Array.from(duelHistory.values()).filter(
        h => h.fromUserId === fromUser.id || h.toUserId === fromUser.id
      ));
    }
    if (toUser && toUser.socketId) {
      io.to(toUser.socketId).emit('duelHistory', Array.from(duelHistory.values()).filter(
        h => h.fromUserId === toUser.id || h.toUserId === toUser.id
      ));
    }

    console.log(`Post ${historyEntry.postId} destroyed by ${user.username}`);
  });

  // Post on behalf of loser (challenger loses scenario)
  socket.on('postOnBehalf', ({ historyId, content }) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const historyEntry = duelHistory.get(historyId);
    if (!historyEntry) {
      socket.emit('error', 'Duel history not found');
      return;
    }

    // Only winner can post on behalf if challenger lost
    if (historyEntry.winnerId !== user.id || historyEntry.fromUserId === user.id) {
      socket.emit('error', 'Only the winner can post on behalf when challenger loses');
      return;
    }

    if (historyEntry.hijackPostUsed) {
      socket.emit('error', 'Hijack post privilege already used');
      return;
    }

    // Determine who to post as (the loser)
    const loserId = historyEntry.fromUserId === historyEntry.winnerId ? historyEntry.toUserId : historyEntry.fromUserId;
    const loserUser = Array.from(users.values()).find(u => u.id === loserId);

    if (!loserUser) {
      socket.emit('error', 'Target user not found');
      return;
    }

    // Create post as the loser
    const hijackPost = createPost(loserUser, content);
    posts.unshift(hijackPost);
    loserUser.posts.push(hijackPost.id);

    // Mark privilege as used
    historyEntry.hijackPostUsed = true;

    // Broadcast the hijack post to all users
    io.emit('newPost', hijackPost);

    // Send updated duel history to both participants
    const fromUser = Array.from(users.values()).find(u => u.id === historyEntry.fromUserId);
    const toUser = Array.from(users.values()).find(u => u.id === historyEntry.toUserId);

    if (fromUser && fromUser.socketId) {
      io.to(fromUser.socketId).emit('duelHistory', Array.from(duelHistory.values()).filter(
        h => h.fromUserId === fromUser.id || h.toUserId === fromUser.id
      ));
    }
    if (toUser && toUser.socketId) {
      io.to(toUser.socketId).emit('duelHistory', Array.from(duelHistory.values()).filter(
        h => h.fromUserId === toUser.id || h.toUserId === toUser.id
      ));
    }

    console.log(`${user.username} posted on behalf of ${loserUser.username}: ${content}`);
  });

  // Submit canvas move for duel
  socket.on('submitDuelMove', ({ requestId, move }) => {
    const user = users.get(socket.id);
    if (!user) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    const duelRequest = duelRequests.get(requestId);
    if (!duelRequest || (duelRequest.fromUserId !== user.id && duelRequest.toUserId !== user.id)) {
      socket.emit('error', 'Invalid duel request');
      return;
    }

    if (duelRequest.status !== 'accepted') {
      socket.emit('error', 'Duel is not active');
      return;
    }

    if (duelRequest.gameState === 'completed') {
      socket.emit('error', 'Duel already completed');
      return;
    }

    // Validate canvas move structure
    if (!validateCanvasMove(move)) {
      socket.emit('error', 'Invalid move data');
      return;
    }

    // Determine which user is submitting the move
    const isFromUser = duelRequest.fromUserId === user.id;

    // Check if this user has already submitted a move
    if ((isFromUser && duelRequest.fromUserMove !== null) ||
        (!isFromUser && duelRequest.toUserMove !== null)) {
      socket.emit('error', 'Move already submitted');
      return;
    }

    // Store the move
    if (isFromUser) {
      duelRequest.fromUserMove = move;
      console.log(`Stored canvas move for user ${user.username}:`, move);
    } else {
      duelRequest.toUserMove = move;
      console.log(`Stored canvas move for user ${user.username}:`, move);
    }

    console.log(`Canvas move submitted by ${user.username}`);

    // Check if both players have moved
    if (duelRequest.fromUserMove !== null && duelRequest.fromUserMove !== undefined &&
        duelRequest.toUserMove !== null && duelRequest.toUserMove !== undefined) {
  
      // Both players have moved, calculate winner
      let fromUserOutcome, toUserOutcome; // 1 for win, 0.5 for draw, 0 for loss

      const fromUser = Array.from(users.values()).find(u => u.id === duelRequest.fromUserId);
      const toUser = Array.from(users.values()).find(u => u.id === duelRequest.toUserId);

      if (!fromUser || !toUser) {
        console.error('Error: Duel participants not found for ELO calculation');
        socket.emit('error', 'Duel participants not found');
        return;
      }

      // Store original ELO for potential change calculation
      const oldFromUserElo = fromUser.elo;
      const oldToUserElo = toUser.elo;

      // Both players have moved, calculate winner using canvas scoring
      const result = calculateCanvasDuelWinner(
        duelRequest.fromUserMove,
        duelRequest.toUserMove,
        duelRequest.pointSource
      );

      let winnerId, winnerUsername;
      if (result.winnerId === 0) {
        fromUserOutcome = 1
        toUserOutcome = 0
        winnerId = duelRequest.fromUserId;
        winnerUsername = duelRequest.fromUsername;
      } else if (result.winnerId === 1) {
        fromUserOutcome = 0;
        toUserOutcome = 1;
        winnerId = duelRequest.toUserId;
        winnerUsername = duelRequest.toUsername;
        fromUserOutcome = 0;
        toUserOutcome = 1;
      } else {
        fromUserOutcome = 0.5;
        toUserOutcome = 0.5;
        winnerId = 'tie';
        winnerUsername = 'tie';
      }

      // Calculate ELO changes
      const fromUserEloChange = calculateEloChange(fromUser.elo, toUser.elo, fromUserOutcome);
      const toUserEloChange = calculateEloChange(toUser.elo, fromUser.elo, toUserOutcome);

      // Update user stats and ELO
      if (winnerId === 'tie') {
        fromUser.wins++;
        toUser.wins++;
      } else if (winnerId === duelRequest.fromUserId) {
        fromUser.wins++;
        toUser.losses++;
      } else {
        toUser.wins++;
        fromUser.losses++;
      }

      fromUser.elo += fromUserEloChange;
      toUser.elo += toUserEloChange;

      // Find the original post
      const originalPost = posts.find(p => p.id === duelRequest.postId);

      // Create duel history entry
      const historyEntry = createDuelHistory(
        duelRequest.fromUserId,
        duelRequest.fromUsername,
        duelRequest.toUserId,
        duelRequest.toUsername,
        duelRequest.postId,
        winnerId,
        winnerUsername,
        originalPost ? originalPost.content : ''
      );

      duelHistory.set(historyEntry.id, historyEntry);

      // Mark duel as completed and remove from active requests
      duelRequest.gameState = 'completed';
      duelRequests.delete(requestId);

      // Notify both users
      if (fromUser && fromUser.socketId) {
        io.to(fromUser.socketId).emit('duelCompleted', historyEntry);
        io.to(fromUser.socketId).emit('duelRequests', Array.from(duelRequests.values()).filter(
          req => req.fromUserId === fromUser.id || req.toUserId === fromUser.id
        ));
  // Send updated user stats including full posts and ELO
  io.to(fromUser.socketId).emit('authenticated', makeUserResponse(fromUser));
      }
      if (toUser && toUser.socketId) {
        io.to(toUser.socketId).emit('duelCompleted', historyEntry);
        io.to(toUser.socketId).emit('duelRequests', Array.from(duelRequests.values()).filter(
          req => req.fromUserId === toUser.id || req.toUserId === toUser.id
        ));
  // Send updated user stats including full posts and ELO
  io.to(toUser.socketId).emit('authenticated', makeUserResponse(toUser));
      }
      console.log(`Duel completed: ${winnerUsername} won (${duelRequest.fromUserMove} vs ${duelRequest.toUserMove}). ELO changes: ${fromUser.username} (${fromUserEloChange}), ${toUser.username} (${toUserEloChange})`);
    } else {
      // Only one player has moved, notify both players of the update
      const otherUserId = isFromUser ? duelRequest.toUserId : duelRequest.fromUserId;
      const otherUser = Array.from(users.values()).find(u => u.id === otherUserId);

      // Send updated duel requests to both players
      socket.emit('duelRequests', Array.from(duelRequests.values()).filter(
        req => req.fromUserId === user.id || req.toUserId === user.id
      ));

      if (otherUser && otherUser.socketId) {
        io.to(otherUser.socketId).emit('duelRequests', Array.from(duelRequests.values()).filter(
          req => req.fromUserId === otherUser.id || req.toUserId === otherUser.id
        ));
      }

      console.log(`Waiting for other player's canvas move in duel ${requestId}`);
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User disconnected: ${user.username}`);
      users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});