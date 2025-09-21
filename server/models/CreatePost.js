import Post from "./models/post.js";
import User from "./models/user.js";

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
