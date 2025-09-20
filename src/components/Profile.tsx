import React, { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface ProfileProps {
  userId?: string; // If provided, shows another user's profile
  onUserClick: (userId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ userId, onUserClick }) => {
  const { user, selectedUserProfile, getUserProfile, sendDuelRequest } = useSocket();

  const profileData = userId ? selectedUserProfile : user;
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    if (userId && userId !== user?.id) {
      getUserProfile(userId);
    }
  }, [userId, user?.id, getUserProfile]);

  if (!profileData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getWinRate = () => {
    const total = profileData.wins + profileData.losses;
    if (total === 0) return 'No duels yet';
    return `${Math.round((profileData.wins / total) * 100)}%`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDuelRequest = (postId: string) => {
    if (user && profileData.id !== user.id) {
      sendDuelRequest(postId, profileData.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">@{profileData.username}</h1>
            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
              <span>👥 {profileData.followers} followers</span>
              <span>⚔️ Win Rate: {getWinRate()}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-lg font-bold text-green-600">{profileData.wins}</div>
                <div className="text-xs text-green-600">Wins</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-lg font-bold text-red-600">{profileData.losses}</div>
                <div className="text-xs text-red-600">Losses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {isOwnProfile ? 'Your Posts' : `Posts by @${profileData.username}`}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {selectedUserProfile?.posts?.map((post) => (
            <div key={post.id} className="p-4">
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

                {!isOwnProfile && user && (
                  <button
                    onClick={() => handleDuelRequest(post.id)}
                    className="ml-4 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm"
                  >
                    ⚔️ Duel
                  </button>
                )}
              </div>
            </div>
          )) || (user && isOwnProfile && user.posts?.map((postId) => (
            // For own profile, we'd need to get actual post data - simplified for demo
            <div key={postId} className="p-4">
              <p className="text-gray-500">Post {postId}</p>
            </div>
          )))}

          {(!selectedUserProfile?.posts || selectedUserProfile.posts.length === 0) && (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;