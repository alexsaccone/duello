import React from 'react';
import { Comment } from '../types';
import { useSocket } from '../contexts/SocketContext';

interface CommentsListProps {
  postId: string;
  comments: Comment[];
}

const CommentsList: React.FC<CommentsListProps> = ({ postId, comments }) => {
  const { user, likeComment, unlikeComment, sendDuelRequestOnComment, duelRequests } = useSocket();

  return (
    <div className="mt-3 space-y-3">
      {comments.map((c) => {
        const hasLiked = user ? (c.likedBy || []).includes(user.id) : false;
        return (
          <div key={c.id} className="flex items-start justify-between bg-gray-50 rounded-md p-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                {c.profilePicture ? (
                  <img src={c.profilePicture} alt={`${c.username}'s profile`} className="w-6 h-6 rounded-full object-cover border border-gray-300" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center border border-gray-300">
                    <span className="text-xs text-gray-600">👤</span>
                  </div>
                )}
                <span className="text-sm font-medium text-red-600">@{c.username}</span>
                <span className="text-xs text-gray-500">{new Date(c.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{c.content}</p>
              <div className="mt-2 flex items-center space-x-2">
                {user && (
                  <button
                    onClick={() => (hasLiked ? unlikeComment(c.id) : likeComment(c.id))}
                    className="focus:outline-none"
                    aria-label={hasLiked ? 'Unlike' : 'Like'}
                  >
                    <span className={`${hasLiked ? 'text-red-600' : 'text-gray-400'} text-base`}>
                      {hasLiked ? '❤️' : '🤍'}
                    </span>
                  </button>
                )}
                <span className="text-xs text-gray-600">{c.likes || 0}</span>
              </div>
            </div>

            {user && user.id !== c.userId && (() => {
              const duelSent = (duelRequests || []).some((req: any) =>
                req.fromUserId === user.id &&
                req.toUserId === c.userId &&
                req.postId === postId &&
                req.commentId === c.id
              );
              return (
                <button
                  onClick={() => !duelSent && sendDuelRequestOnComment(postId, c.id, c.userId)}
                  disabled={duelSent}
                  className={`ml-3 px-2 py-1 rounded-md text-xs focus:outline-none ${
                    duelSent ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  title={duelSent ? 'Duel sent' : 'Duel this comment'}
                >
                  ⚔️ {duelSent ? 'Duel Sent' : 'Duel'}
                </button>
              );
            })()}
          </div>
        );
      })}
      {comments.length === 0 && (
        <div className="text-sm text-gray-500">No comments yet.</div>
      )}
    </div>
  );
};

export default CommentsList;
