import React, { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Link } from 'react-router-dom';

const Duels: React.FC = () => {
  const { user, duelRequests, respondToDuelRequest, refreshDuelRequests } = useSocket();

  useEffect(() => {
    refreshDuelRequests();
  }, [refreshDuelRequests]);

  if (!user) return null;

  const incomingRequests = duelRequests.filter(
    req => req.toUserId === user.id && req.status === 'pending'
  );

  const outgoingRequests = duelRequests.filter(
    req => req.fromUserId === user.id
  );

  const acceptedDuels = duelRequests.filter(
    req => (req.fromUserId === user.id || req.toUserId === user.id) && req.status === 'accepted'
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleResponse = (requestId: string, response: 'accepted' | 'declined') => {
    respondToDuelRequest(requestId, response);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">⚔️ Duel Management</h1>

        {/* Incoming Requests */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Incoming Duel Requests ({incomingRequests.length})
          </h2>
          {incomingRequests.length > 0 ? (
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        <Link
                          to={`/profile/${request.fromUsername}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          @{request.fromUsername}
                        </Link>
                        {' '}
                        wants to duel you!
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(request.timestamp)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResponse(request.id, 'accepted')}
                        className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResponse(request.id, 'declined')}
                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No incoming duel requests</p>
          )}
        </div>

        {/* Outgoing Requests */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sent Duel Requests ({outgoingRequests.length})
          </h2>
          {outgoingRequests.length > 0 ? (
            <div className="space-y-3">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        Duel request to{' '}
                        <Link
                          to={`/profile/${request.toUsername}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          @{request.toUsername}
                        </Link>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(request.timestamp)}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No sent duel requests</p>
          )}
        </div>

        {/* Accepted Duels */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Duels ({acceptedDuels.length})
          </h2>
          {acceptedDuels.length > 0 ? (
            <div className="space-y-3">
              {acceptedDuels.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        Duel with{' '}
                        <Link
                          to={`/profile/${request.fromUserId === user.id ? request.toUsername : request.fromUsername}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          @
                          {request.fromUserId === user.id
                            ? request.toUsername
                            : request.fromUsername}
                        </Link>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Accepted on {formatTimestamp(request.timestamp)}
                      </p>
                    </div>
                    <div>
                      <button
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                        disabled
                      >
                        Play Duel (Coming Soon)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No active duels</p>
          )}
        </div>

        {duelRequests.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No duel activity yet. Send a duel request on someone's post!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Duels;