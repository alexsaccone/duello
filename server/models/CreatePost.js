import Post from "./models/Post.js";
import User from "./models/User.js";

const createPost = async (userId, content) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const post = new Post({
    userId: user._id,
    username: user.username, // snapshot
    content,
  });

  await post.save();
  return post;
};
