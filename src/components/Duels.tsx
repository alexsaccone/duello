import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import DuelPopup from './DuelPopup';

interface DuelsProps {
  onUserClick: (userId: string) => void;
}

const Duels: React.FC<DuelsProps> = ({ onUserClick }) => {
  const {
    user,
    duelRequests,
    duelHistory,
    respondToDuelRequest,
    refreshDuelRequests,
    refreshDuelHistory,
    forwardDuelResult,
    completeDuel
  } = useSocket();

  const [activeDuelPopup, setActiveDuelPopup] = useState<string | null>(null);

  useEffect(() => {
    refreshDuelRequests();
    refreshDuelHistory();
  }, [refreshDuelRequests, refreshDuelHistory]);

  // Close popup if the active duel is no longer in the duel requests (i.e., completed)
  useEffect(() => {
    if (activeDuelPopup) {
      const currentDuel = duelRequests.find(req => req.id === activeDuelPopup);
      if (!currentDuel) {
        console.log('Duel completed, closing popup');
        setActiveDuelPopup(null);
      }
    }
  }, [activeDuelPopup, duelRequests]);

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

  const handleCompleteDuel = (requestId: string, winnerId: string) => {
    completeDuel(requestId, winnerId);
  };

  const handleForwardResult = (historyId: string) => {
    forwardDuelResult(historyId);
  };

  const handleBeginDuel = (requestId: string) => {
    setActiveDuelPopup(requestId);
  };

  const handleCloseDuelPopup = () => {
    setActiveDuelPopup(null);
  };

  const getDuelButtonState = (request: any) => {
    if (!user) return 'begin';

    const isFromUser = request.fromUserId === user.id;
    const userMove = isFromUser ? request.fromUserMove : request.toUserMove;
    const opponentMove = isFromUser ? request.toUserMove : request.fromUserMove;

    if (userMove !== null && userMove !== undefined) {
      if (opponentMove !== null && opponentMove !== undefined) {
        return 'completed'; // Both have moved
      } else {
        return 'waiting'; // User has moved, waiting for opponent
      }
    } else {
      return 'begin'; // User hasn't moved yet
    }
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
                        <button
                          onClick={() => onUserClick(request.fromUserId)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          @{request.fromUsername}
                        </button>
                        {' '}wants to duel you!
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
                        <button
                          onClick={() => onUserClick(request.toUserId)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          @{request.toUsername}
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(request.timestamp)}
                      </p>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
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
        <div className="mb-8">
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
                        <button
                          onClick={() => onUserClick(
                            request.fromUserId === user.id ? request.toUserId : request.fromUserId
                          )}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          @{request.fromUserId === user.id ? request.toUsername : request.fromUsername}
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Accepted on {formatTimestamp(request.timestamp)}
                      </p>
                    </div>
                    <div>
                      {(() => {
                        const buttonState = getDuelButtonState(request);

                        switch (buttonState) {
                          case 'begin':
                            return (
                              <button
                                onClick={() => handleBeginDuel(request.id)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                              >
                                Begin Duel
                              </button>
                            );
                          case 'waiting':
                            return (
                              <button
                                disabled
                                className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-md text-sm cursor-not-allowed"
                              >
                                Awaiting Other Player
                              </button>
                            );
                          case 'completed':
                            return (
                              <span className="text-sm text-gray-500 italic">
                                Calculating results...
                              </span>
                            );
                          default:
                            return null;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No active duels</p>
          )}
        </div>

        {/* Duel History */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Duel History ({duelHistory.length})
          </h2>
          {duelHistory.length > 0 ? (
            <div className="space-y-3">
              {duelHistory.map((history) => {
                const isWinner = history.winnerId === user.id;
                const isTie = history.winnerId === 'tie';
                const opponentUsername = history.fromUserId === user.id ? history.toUsername : history.fromUsername;
                const opponentUserId = history.fromUserId === user.id ? history.toUserId : history.fromUserId;

                return (
                  <div key={history.id} className={`border border-gray-200 rounded-lg p-4 ${
                    isTie ? 'bg-yellow-50' : isWinner ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">
                            {isTie ? '🤝' : isWinner ? '🏆' : '💔'}
                          </span>
                          <p className="text-sm text-gray-900">
                            {isTie ? 'Tied with' : isWinner ? 'Won against' : 'Lost to'}{' '}
                            <button
                              onClick={() => onUserClick(opponentUserId)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              @{opponentUsername}
                            </button>
                          </p>
                        </div>
                        {history.originalPostContent && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            "{history.originalPostContent}"
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(history.timestamp)}
                        </p>
                      </div>
                      <div>
                        <button
                          onClick={() => handleForwardResult(history.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm flex items-center space-x-1"
                        >
                          <span>Forward</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No duel history yet</p>
          )}
        </div>

        {duelRequests.length === 0 && duelHistory.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No duel activity yet. Send a duel request on someone's post!</p>
          </div>
        )}
      </div>

      {/* Duel Popup */}
      {activeDuelPopup && (() => {
        const currentDuel = duelRequests.find(req => req.id === activeDuelPopup);
        return currentDuel ? (
          <DuelPopup
            duel={currentDuel}
            onClose={handleCloseDuelPopup}
          />
        ) : null;
      })()}
    </div>
  );
};

export default Duels;