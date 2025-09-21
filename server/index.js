import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db.js"; // MongoDB connection
import User from "./models/user.js";
import Post from "./models/post.js";
import DuelRequest from "./models/duelRequest.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/", express.static(path.join(__dirname, "../build")));
app.use(cors());
app.use(express.json());

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // User registration
  socket.on("register", async (username) => {
    try {
      // Check if username exists
      let existingUser = await User.findOne({ username });
      if (existingUser) {
        socket.emit("error", "Username already taken");
        return;
      }

      // Create user in DB
      const user = new User({ username, socketId: socket.id });
      await user.save();

      socket.emit("authenticated", user);

      // Send all posts
      const posts = await Post.find().sort({ createdAt: -1 });
      socket.emit("allPosts", posts);

      console.log(`✅ Registered user: ${username}`);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error during registration");
    }
  });

  // Create new post
  socket.on("createPost", async (content) => {
    try {
      const user = await User.findOne({ socketId: socket.id });
      if (!user) {
        socket.emit("error", "Not authenticated");
        return;
      }

      const post = new Post({
        userId: user._id,
        username: user.username,
        content,
      });

      await post.save();

      // Attach post ID to user
      user.posts.push(post._id);
      await user.save();

      io.emit("newPost", post);

      console.log(`📝 New post by ${user.username}: ${content}`);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while creating post");
    }
  });

  // Send duel request
  socket.on("sendDuelRequest", async ({ postId, targetUserId }) => {
    try {
      const requester = await User.findOne({ socketId: socket.id });
      if (!requester) {
        socket.emit("error", "Not authenticated");
        return;
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        socket.emit("error", "Target user not found");
        return;
      }

      // Check if already exists
      const existingRequest = await DuelRequest.findOne({
        fromUserId: requester._id,
        toUserId: targetUserId,
        postId,
      });

      if (existingRequest) {
        socket.emit("error", "Duel request already sent");
        return;
      }

      const duelRequest = new DuelRequest({
        fromUserId: requester._id,
        fromUsername: requester.username,
        toUserId: targetUser._id,
        toUsername: targetUser.username,
        postId,
      });

      await duelRequest.save();

      // Update post with duel request reference
      await Post.findByIdAndUpdate(postId, {
        $push: { duelRequests: duelRequest._id },
      });

      // Notify the target
      if (targetUser.socketId) {
        io.to(targetUser.socketId).emit("duelRequestReceived", duelRequest);
      }

      socket.emit("duelRequestSent", duelRequest);

      console.log(
        `⚔️ Duel request from ${requester.username} to ${targetUser.username}`
      );
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while sending duel request");
    }
  });

  // Respond to duel request
  socket.on("respondToDuelRequest", async ({ requestId, response }) => {
    try {
      const user = await User.findOne({ socketId: socket.id });
      if (!user) {
        socket.emit("error", "Not authenticated");
        return;
      }

      const duelRequest = await DuelRequest.findById(requestId);
      if (
        !duelRequest ||
        duelRequest.toUserId.toString() !== user._id.toString()
      ) {
        socket.emit("error", "Invalid duel request");
        return;
      }

      duelRequest.status = response;
      await duelRequest.save();

      const requester = await User.findById(duelRequest.fromUserId);
      if (requester?.socketId) {
        io.to(requester.socketId).emit("duelRequestResponse", {
          requestId,
          response,
          responderUsername: user.username,
        });
      }

      console.log(`✅ Duel request ${response} by ${user.username}`);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while responding to duel");
    }
  });

  // Get duel requests for user
  socket.on("getDuelRequests", async () => {
    try {
      const user = await User.findOne({ socketId: socket.id });
      if (!user) {
        socket.emit("error", "Not authenticated");
        return;
      }

      const userDuelRequests = await DuelRequest.find({
        $or: [{ fromUserId: user._id }, { toUserId: user._id }],
      });

      socket.emit("duelRequests", userDuelRequests);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while fetching duel requests");
    }
  });

  // Search users
  socket.on("searchUsers", async (query) => {
    try {
      const user = await User.findOne({ socketId: socket.id });
      if (!user) {
        socket.emit("error", "Not authenticated");
        return;
      }

      const matchingUsers = await User.find({
        username: { $regex: query, $options: "i" },
        _id: { $ne: user._id },
      }).select("username wins losses followers");

      socket.emit("searchResults", matchingUsers);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while searching users");
    }
  });

  // Get user profile
  socket.on("getUserProfile", async (userId) => {
    try {
      const targetUser = await User.findById(userId).select("-socketId");
      if (!targetUser) {
        socket.emit("error", "User not found");
        return;
      }

      const userPosts = await Post.find({ userId });
      const profile = {
        ...targetUser.toObject(),
        posts: userPosts,
      };

      socket.emit("userProfile", profile);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while fetching profile");
    }
  });

  // Get all posts
  socket.on("getAllPosts", async () => {
    try {
      const posts = await Post.find().sort({ createdAt: -1 });
      socket.emit("allPosts", posts);
    } catch (err) {
      console.error(err);
      socket.emit("error", "Server error while fetching posts");
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    try {
      const user = await User.findOneAndUpdate(
        { socketId: socket.id },
        { socketId: null }
      );
      if (user) console.log(`❌ User disconnected: ${user.username}`);
    } catch (err) {
      console.error(err);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
