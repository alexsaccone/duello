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
  timestamp: new Date().toISOString()
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