import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Link } from 'react-router-dom';
import DuelPopup from './DuelPopup';
import PostOnBehalfPopup from './PostOnBehalfPopup';
import DuelOutcomeVisualization from './DuelOutcomeVisualization';

const Duels: React.FC = () => {
  const {
    user,
    duelRequests,
    duelHistory,
    respondToDuelRequest,
    refreshDuelRequests,
    refreshDuelHistory,
    forwardDuelResult,
    destroyPost,
    postOnBehalf,
    completeDuel
  } = useSocket();

  const [activeDuelPopup, setActiveDuelPopup] = useState<string | null>(null);
  const [postOnBehalfPopup, setPostOnBehalfPopup] = useState<{ historyId: string; targetUsername: string } | null>(null);
  const [expandedVisualizations, setExpandedVisualizations] = useState<Set<string>>(new Set());

  useEffect(() => {
    refreshDuelRequests();
    refreshDuelHistory();
  }, []);

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

  const handleDestroyPost = (historyId: string) => {
    destroyPost(historyId);
  };

  const handleOpenPostOnBehalf = (historyId: string, targetUsername: string) => {
    setPostOnBehalfPopup({ historyId, targetUsername });
  };

  const handlePostOnBehalf = (content: string) => {
    if (postOnBehalfPopup) {
      postOnBehalf(postOnBehalfPopup.historyId, content);
    }
  };

  const handleClosePostOnBehalf = () => {
    setPostOnBehalfPopup(null);
  };

  const handleBeginDuel = (requestId: string) => {
    setActiveDuelPopup(requestId);
  };

  const handleCloseDuelPopup = () => {
    setActiveDuelPopup(null);
  };

  const handleToggleVisualization = (historyId: string) => {
    setExpandedVisualizations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(historyId)) {
        newSet.delete(historyId);
      } else {
        newSet.add(historyId);
      }
      return newSet;
    });
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
                            <Link
                              to={`/profile/${opponentUsername}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              @{opponentUsername}
                            </Link>
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
                      <div className="flex space-x-2">
                        {(() => {
                          const isChallenger = history.fromUserId === user.id;
                          const challengerWon = history.winnerId === history.fromUserId;

                          if (challengerWon) {
                            // Challenger won - show forward and destroy buttons
                            return (
                              <>
                                <button
                                  onClick={() => handleForwardResult(history.id)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm flex items-center space-x-1"
                                >
                                  <span>Forward</span>
                                  <span>→</span>
                                </button>
                                {isChallenger && (
                                  <button
                                    onClick={() => history.postDestroyed ? null : handleDestroyPost(history.id)}
                                    disabled={history.postDestroyed}
                                    className={`px-3 py-1 rounded-md text-sm ${
                                      history.postDestroyed
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                  >
                                    {history.postDestroyed ? 'Destroyed' : 'Destroy'}
                                  </button>
                                )}
                              </>
                            );
                          } else {
                            // Challenger lost - only winner gets "post for them" button
                            const isWinner = history.winnerId === user.id;

                            if (isWinner && !history.hijackPostUsed) {
                              return (
                                <button
                                  onClick={() => handleOpenPostOnBehalf(history.id, isChallenger ? history.fromUsername : history.toUsername)}
                                  className="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 text-sm"
                                >
                                  Post for them
                                </button>
                              );
                            } else if (isWinner && history.hijackPostUsed) {
                              return (
                                <span className="text-sm text-gray-500 italic">
                                  Hijack used
                                </span>
                              );
                            } else {
                              return (
                                <span className="text-sm text-gray-500 italic">
                                  No actions available
                                </span>
                              );
                            }
                          }
                        })()}
                        {history.fromUserMove && history.toUserMove && history.pointSource && (
                          <button
                            onClick={() => handleToggleVisualization(history.id)}
                            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm"
                          >
                            {expandedVisualizations.has(history.id) ? 'Hide guesses' : 'Show guesses'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visualization Component */}
                    {expandedVisualizations.has(history.id) &&
                     history.fromUserMove &&
                     history.toUserMove &&
                     history.pointSource && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <DuelOutcomeVisualization
                          fromUserMove={history.fromUserMove}
                          toUserMove={history.toUserMove}
                          pointSource={history.pointSource}
                          currentUserId={user.id}
                          fromUserId={history.fromUserId}
                          fromUsername={history.fromUsername}
                          toUsername={history.toUsername}
                        />
                      </div>
                    )}
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

      {/* Post On Behalf Popup */}
      {postOnBehalfPopup && (
        <PostOnBehalfPopup
          targetUsername={postOnBehalfPopup.targetUsername}
          onPost={handlePostOnBehalf}
          onClose={handleClosePostOnBehalf}
        />
      )}
    </div>
  );
};

export default Duels;