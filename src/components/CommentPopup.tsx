import React, { useState } from 'react';

interface CommentPopupProps {
  onPost: (content: string) => void;
  onClose: () => void;
}

const CommentPopup: React.FC<CommentPopupProps> = ({ onPost, onClose }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    onPost(content.trim());
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">💬 Add a Comment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" disabled={isSubmitting}>✕</button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full p-3 border border-gray-300 rounded-md resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          disabled={isSubmitting}
          maxLength={280}
        />
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>{content.length}/280</span>
          <div className="space-x-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50" disabled={isSubmitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting || !content.trim()} className={`px-6 py-2 rounded-md font-medium ${isSubmitting || !content.trim() ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>{isSubmitting ? 'Posting...' : 'Post'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentPopup;
