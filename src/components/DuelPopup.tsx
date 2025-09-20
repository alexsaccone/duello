import React, { useState, useEffect } from 'react';
import { DuelRequest } from '../types';
import { useSocket } from '../contexts/SocketContext';
import { calculateEloChange } from '../utils/elo';

interface DuelPopupProps {
  duel: DuelRequest;
  onClose: () => void;
}

const DuelPopup: React.FC<DuelPopupProps> = ({ duel, onClose }) => {
  const { user, submitDuelMove } = useSocket();
  const [move, setMove] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if current user has already submitted a move
  useEffect(() => {
    if (user) {
      const isFromUser = duel.fromUserId === user.id;
      const userMove = isFromUser ? duel.fromUserMove : duel.toUserMove;
      setHasSubmitted(userMove !== null && userMove !== undefined);

      // If user has submitted, set the move value for display
      if (userMove !== null && userMove !== undefined) {
        setMove(userMove);
      }
    }
  }, [duel, user]);

  // Remove the auto-close effect since we want manual control

  // Generate random move
  const generateRandomMove = () => {
    const randomMove = Math.floor(Math.random() * 1001); // 0 to 1000
    setMove(randomMove);
  };

  const handleSubmit = async () => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-90vw">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">⚔️ Duel Arena</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            Dueling against <span className="font-medium text-blue-600">@{opponentUsername}</span>
          </p>
          <div className="bg-gray-50 p-3 rounded-lg mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Your ELO: {isFromUser ? duel.fromUserElo : duel.toUserElo}</span>
              <span>Their ELO: {isFromUser ? duel.toUserElo : duel.fromUserElo}</span>
            </div>
            <div className="text-xs text-gray-500">
              <span>Potential changes: </span>
              <span className="text-green-600">Win: +{Math.abs(calculateEloChange(
                isFromUser ? duel.fromUserElo : duel.toUserElo,
                isFromUser ? duel.toUserElo : duel.fromUserElo,
                1
              ))}</span>
              <span className="text-gray-600 mx-1">|</span>
              <span className="text-yellow-600">Draw: {calculateEloChange(
                isFromUser ? duel.fromUserElo : duel.toUserElo,
                isFromUser ? duel.toUserElo : duel.fromUserElo,
                0.5
              )}</span>
              <span className="text-gray-600 mx-1">|</span>
              <span className="text-red-600">Loss: {calculateEloChange(
                isFromUser ? duel.fromUserElo : duel.toUserElo,
                isFromUser ? duel.toUserElo : duel.fromUserElo,
                0
              )}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Submit a number between 0 and 1000. Higher number wins!
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
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Move
              </label>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={move}
                  onChange={(e) => setMove(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number (0-1000)"
                />
                <button
                  onClick={generateRandomMove}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Random
                </button>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{move}</div>
                <div className="text-xs text-gray-500">Your current move</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || move < 0 || move > 1000}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Move'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DuelPopup;