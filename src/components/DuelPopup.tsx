import React, { useState, useEffect } from 'react';
import { DuelRequest, CanvasMove, Point } from '../types';
import { useSocket } from '../contexts/SocketContext';
import DuelCanvas from './DuelCanvas';

interface DuelPopupProps {
  duel: DuelRequest;
  onClose: () => void;
}

const DuelPopup: React.FC<DuelPopupProps> = ({ duel, onClose }) => {
  const { user, submitDuelMove } = useSocket();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if current user has already submitted a move
  useEffect(() => {
    if (user) {
      const isFromUser = duel.fromUserId === user.id;
      const userMove = isFromUser ? duel.fromUserMove : duel.toUserMove;
      setHasSubmitted(userMove !== null && userMove !== undefined);
    }
  }, [duel, user]);

  const handleCanvasSubmit = async (move: CanvasMove) => {
    if (isSubmitting || hasSubmitted) return;

    setIsSubmitting(true);
    submitDuelMove(duel.id, move);

    // Close popup immediately after submission
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  const opponentUsername = user?.id === duel.fromUserId ? duel.toUsername : duel.fromUsername;
  const isFromUser = user?.id === duel.fromUserId;
  const opponentMove = isFromUser ? duel.toUserMove : duel.fromUserMove;
  const opponentHasSubmitted = opponentMove !== null && opponentMove !== undefined;

  // Default point source if not provided (for backward compatibility)
  const pointSource: Point = duel.pointSource || { x: 400, y: 300 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">⚔️ Duel Arena</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            Dueling against <span className="font-medium text-blue-600">@{opponentUsername}</span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Strategic canvas-based duel! Place your king close to the target and guess where your opponent will place theirs.
          </p>
          {opponentHasSubmitted && (
            <p className="text-xs text-green-600">
              ✓ @{opponentUsername} has submitted their move
            </p>
          )}
          {!opponentHasSubmitted && hasSubmitted && (
            <p className="text-xs text-yellow-600">
              ⏳ Waiting for @{opponentUsername} to submit their move
            </p>
          )}
        </div>

        {hasSubmitted ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-lg font-medium text-gray-900 mb-2">Move Submitted!</p>
            <p className="text-sm text-gray-600">
              Waiting for @{opponentUsername} to make their move...
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <DuelCanvas
              pointSource={pointSource}
              onSubmitMove={handleCanvasSubmit}
              canSubmit={!isSubmitting && !hasSubmitted}
            />

            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuelPopup;