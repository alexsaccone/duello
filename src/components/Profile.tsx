import React, { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useParams, Link } from 'react-router-dom';

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user, selectedUserProfile, getUserProfileByUsername, sendDuelRequest, followUser, unfollowUser, likePost, unlikePost } = useSocket();

  const isOwnProfile = !username || username === user?.username;
  // Use the logged-in user object when viewing own profile, otherwise use selectedUserProfile
  const profileData = isOwnProfile ? user : selectedUserProfile;

  useEffect(() => {
    if (username && username !== user?.username) {
      getUserProfileByUsername(username);
    }
  }, [username, user?.username, getUserProfileByUsername]);

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
          <div className="flex items-center space-x-4">
            {profileData.profilePicture ? (
              <img
                src={profileData.profilePicture}
                alt={`${profileData.username}'s profile`}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-300">
                <span className="text-2xl text-gray-600">👤</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">@{profileData.username}</h1>
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-6">
                  <span>👥 {profileData.followers} followers</span>
                  <span>⚔️ Win Rate: {getWinRate()}</span>
                  <span>📊 ELO: {profileData.elo}</span>
                </div>

                {/* Follow/Following button (only when viewing another user's profile) */}
                {!isOwnProfile && user && (
                  <div className="mt-2">
                    { (user.followingSet && user.followingSet.includes(profileData.id)) || (user.followingSet === undefined && false) ? (
                      <button
                        onClick={() => unfollowUser(profileData.id)}
                        className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 text-sm"
                      >
                        Following
                      </button>
                    ) : (
                      <button
                        onClick={() => followUser(profileData.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Follow
                      </button>
                    )}
                  </div>
                )}
              </div>
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
          {profileData?.posts && profileData.posts.length > 0 ? (
            profileData.posts.map((post: any) => (
              <div key={post.id} className="p-4">
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
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                    <div className="mt-3 flex items-center space-x-2">
                      {user && (
                        (() => {
                          const hasLiked = post.likedBy?.includes(user.id) || false;
                          const heartClass = hasLiked ? 'text-red-600' : 'text-gray-400';
                          return (
                            <button
                              onClick={() => {
                                if (hasLiked) {
                                  unlikePost(post.id);
                                } else {
                                  likePost(post.id);
                                }
                              }}
                              className="focus:outline-none"
                              aria-label={hasLiked ? 'Unlike' : 'Like'}
                            >
                              <span className={`${heartClass} text-xl`}>
                                {hasLiked ? '❤️' : '🤍'}
                              </span>
                            </button>
                          );
                        })()
                      )}

                      <span className="text-sm text-gray-600">{post.likes || 0}</span>
                    </div>
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
            ))
          ) : user && isOwnProfile && user.posts ? (
            // Fallback for own profile when only post IDs are available
            (user.posts as string[]).filter((p: any) => typeof p === 'string').map((postId: any) => (
              <div key={postId as string} className="p-4">
                <p className="text-gray-500">Post {postId}</p>
              </div>
            ))
          ) : (
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