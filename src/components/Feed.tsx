import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Post, User } from '../types';
import { Link } from 'react-router-dom';
import { calculateEloChange } from '../utils/elo';

const Feed: React.FC = () => {
  const [newPost, setNewPost] = useState('');
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());
  const { user, posts, duelRequests, createPost, sendDuelRequest, socket } = useSocket();

  // Load user info when encountering new user IDs
  useEffect(() => {
    posts.forEach(post => {
      if (!userCache.has(post.userId) && socket) {
        socket.emit('getUserProfile', post.userId);

        socket.once(`userProfile_${post.userId}`, (profile: User) => {
          setUserCache(cache => {
            const newCache = new Map(cache);
            newCache.set(post.userId, profile);
            return newCache;
          });
        });
      }
    });
  }, [posts, userCache, socket]);

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

  const hasSentDuelRequest = (postId: string, targetUserId: string) => {
    if (!user) return false;
    return duelRequests.some(
      req => req.fromUserId === user.id &&
             req.toUserId === targetUserId &&
             req.postId === postId
    );
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
                  {post.profilePicture ? (
                    <img
                      src={post.profilePicture}
                      alt={`${post.username}'s profile`}
                      className="w-8 h-8 rounded-full object-cover border border-gray-300"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center border border-gray-300">
                      <span className="text-sm text-gray-600">👤</span>
                    </div>
                  )}
                  <Link
                    to={`/profile/${post.username}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    @{post.username}
                  </Link>
                  <span className="text-gray-500 text-sm">
                    {formatTimestamp(post.timestamp)}
                    {userCache.has(post.userId) && ` • ELO: ${userCache.get(post.userId)?.elo}`}
                  </span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
              </div>

              {user && post.userId !== user.id && (() => {
                const duelSent = hasSentDuelRequest(post.id, post.userId);
                return (
                  <button
                    onClick={() => !duelSent && handleDuelRequest(post)}
                    disabled={duelSent}
                    title={user && userCache.get(post.userId) ? 
                      `Your ELO: ${user.elo} vs Their ELO: ${userCache.get(post.userId)?.elo}
Win: +${Math.abs(calculateEloChange(user.elo, userCache.get(post.userId)?.elo || 1000, 1))}
Loss: ${calculateEloChange(user.elo, userCache.get(post.userId)?.elo || 1000, 0)}` : ''}
                    className={`ml-4 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center space-x-2 ${
                      duelSent
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    }`}
                  >
                    <span>⚔️</span>
                    <span>{duelSent ? 'Duel Sent' : 'Duel'}</span>
                  </button>
                );
              })()}
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