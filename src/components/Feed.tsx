import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Post } from '../types';

interface FeedProps {
  onUserClick: (userId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ onUserClick }) => {
  const [newPost, setNewPost] = useState('');
  const { user, posts, createPost, sendDuelRequest } = useSocket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim()) {
      createPost(newPost.trim());
      setNewPost('');
    }
  };

  const handleDuelRequest = (post: Post) => {
    if (user && post.userId !== user.id) {
      sendDuelRequest(post.id, post.userId);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's happening?"
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            maxLength={280}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{newPost.length}/280</span>
            <button
              type="submit"
              disabled={!newPost.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => onUserClick(post.userId)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    @{post.username}
                  </button>
                  <span className="text-gray-500 text-sm">
                    {formatTimestamp(post.timestamp)}
                  </span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
              </div>

              {user && post.userId !== user.id && (
                <button
                  onClick={() => handleDuelRequest(post)}
                  className="ml-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center space-x-2"
                >
                  <span>⚔️</span>
                  <span>Duel</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No posts yet. Be the first to post something!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;