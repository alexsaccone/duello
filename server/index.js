import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

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
const createUser = (username, socketId) => ({
  id: uuidv4(),
  username,
  socketId,
  wins: 0,
  losses: 0,
  followers: 0,
  posts: []
});

// Post object structure
const createPost = (userId, username, content) => ({
  id: uuidv4(),
  userId,
  username,
  content,
  timestamp: new Date().toISOString(),
  duelRequests: []
});

// Duel request object structure
const createDuelRequest = (fromUserId, fromUsername, toUserId, toUsername, postId) => ({
  id: uuidv4(),
  fromUserId,
  fromUsername,
  toUserId,
  toUsername,
  postId,
  status: 'pending', // pending, accepted, declined
  timestamp: new Date().toISOString(),
  fromUserMove: null,
  toUserMove: null,
  gameState: 'waiting_for_moves'
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
  originalPostContent
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User authentication/registration
  socket.on('register', (username) => {
    if (Array.from(users.values()).some(user => user.username === username)) {
      socket.emit('error', 'Username already taken');
      return;
    }

    const user = createUser(username, socket.id);
    users.set(socket.id, user);
    socket.emit('authenticated', user);

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

    const post = createPost(user.id, user.username, content);
    posts.unshift(post); // Add to beginning of array
    user.posts.push(post.id);

    // Broadcast the new post to all connected clients
    io.emit('newPost', post);

    console.log(`New post by ${user.username}: ${content}`);
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
      targetUserId,
      targetUser.username,
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
      .map(u => ({ id: u.id, username: u.username, wins: u.wins, losses: u.losses, followers: u.followers }));

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
      wins: targetUser.wins,
      losses: targetUser.losses,
      followers: targetUser.followers,
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

    const post = createPost(user.id, user.username, resultText);
    posts.unshift(post);
    user.posts.push(post.id);

    // Broadcast the new post to all connected clients
    io.emit('newPost', post);

    console.log(`Duel result forwarded by ${user.username}`);
  });

  // Submit move for duel
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
      console.log(`Stored fromUserMove: ${move} for user ${user.username}`);
    } else {
      duelRequest.toUserMove = move;
      console.log(`Stored toUserMove: ${move} for user ${user.username}`);
    }

    console.log(`Move submitted by ${user.username}: ${move}`);

    // Check if both players have moved
    console.log(`Checking moves: fromUserMove=${duelRequest.fromUserMove}, toUserMove=${duelRequest.toUserMove}`);
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
        // Tie - both win (for now)
        winnerId = 'tie';
        winnerUsername = 'tie';
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
        winnerUsername,
        originalPost ? originalPost.content : ''
      );

      duelHistory.set(historyEntry.id, historyEntry);

      // Update user stats
      if (winnerId === 'tie') {
        // Both players get a win for ties
        const fromUser = Array.from(users.values()).find(u => u.id === duelRequest.fromUserId);
        const toUser = Array.from(users.values()).find(u => u.id === duelRequest.toUserId);
        if (fromUser) fromUser.wins++;
        if (toUser) toUser.wins++;
      } else if (winnerId === duelRequest.fromUserId) {
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

      // Mark duel as completed and remove from active requests
      duelRequest.gameState = 'completed';
      duelRequests.delete(requestId);

      // Notify both users
      const fromUser = Array.from(users.values()).find(u => u.id === duelRequest.fromUserId);
      const toUser = Array.from(users.values()).find(u => u.id === duelRequest.toUserId);

      if (fromUser && fromUser.socketId) {
        io.to(fromUser.socketId).emit('duelCompleted', historyEntry);
        io.to(fromUser.socketId).emit('duelRequests', Array.from(duelRequests.values()).filter(
          req => req.fromUserId === fromUser.id || req.toUserId === fromUser.id
        ));
      }
      if (toUser && toUser.socketId) {
        io.to(toUser.socketId).emit('duelCompleted', historyEntry);
        io.to(toUser.socketId).emit('duelRequests', Array.from(duelRequests.values()).filter(
          req => req.fromUserId === toUser.id || req.toUserId === toUser.id
        ));
      }

      console.log(`Duel completed: ${winnerUsername} won (${duelRequest.fromUserMove} vs ${duelRequest.toUserMove})`);
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

      console.log(`Waiting for other player's move in duel ${requestId}`);
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