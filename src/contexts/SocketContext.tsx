import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Post, DuelRequest, UserProfile, DuelHistory, CanvasMove, Comment } from '../types';

interface SocketContextType {
  socket: Socket | null;
  user: User | null;
  posts: Post[];
  commentsByPost: Record<string, Comment[]>;
  duelRequests: DuelRequest[];
  duelHistory: DuelHistory[];
  isConnected: boolean;
  login: (username: string, password?: string, profilePicture?: File | null) => void;
  logout: () => void;
  createPost: (content: string) => void;
  createComment: (postId: string, content: string) => void;
  sendDuelRequest: (postId: string, targetUserId: string) => void;
  sendDuelRequestOnComment: (postId: string, commentId: string, targetUserId: string) => void;
  respondToDuelRequest: (requestId: string, response: 'accepted' | 'declined') => void;
  completeDuel: (requestId: string, winnerId: string) => void;
  submitDuelMove: (requestId: string, move: CanvasMove) => void;
  searchUsers: (query: string) => void;
  getUserProfile: (userId: string) => void;
  getUserProfileByUsername: (username: string) => void;
  getComments: (postId: string) => void;
  refreshDuelRequests: () => void;
  refreshDuelHistory: () => void;
  forwardDuelResult: (historyId: string) => void;
  destroyPost: (historyId: string) => void;
  postOnBehalf: (historyId: string, content: string) => void;
  calculateEloChange: (playerElo: number, opponentElo: number, outcome: 0 | 0.5 | 1) => number;
  likePost: (postId: string) => void;
  unlikePost: (postId: string) => void;
  likeComment: (commentId: string) => void;
  unlikeComment: (commentId: string) => void;
  searchResults: User[];
  selectedUserProfile: UserProfile | null;
  followUser: (targetUserId: string) => void;
  unfollowUser: (targetUserId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [duelRequests, setDuelRequests] = useState<DuelRequest[]>([]);
  const [duelHistory, setDuelHistory] = useState<DuelHistory[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('authenticated', (userData: User) => {
      setUser(userData);
    });

    newSocket.on('allPosts', (allPosts: Post[]) => {
      setPosts(allPosts);
    });

    // Post liked/unliked (updated post object)
    const applyUpdatedPost = (updatedPost: Post) => {
      setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
      // Update selectedUserProfile if it contains this post
      setSelectedUserProfile(prev => {
        if (!prev) return prev;
        const updatedPosts = prev.posts.map(p => p.id === updatedPost.id ? updatedPost : p);
        return { ...prev, posts: updatedPosts };
      });
      // Update authenticated user's posts if present
      setUser(prev => {
        if (!prev) return prev;
        if (!prev.posts) return prev;
        const updatedPosts = prev.posts.map((p: any) => p.id === updatedPost.id ? updatedPost : p);
        return { ...prev, posts: updatedPosts } as User;
      });
    };

    newSocket.on('postLiked', applyUpdatedPost);
    newSocket.on('postUpdated', applyUpdatedPost);

    newSocket.on('newPost', (newPost: Post) => {
      setPosts(prev => [newPost, ...prev]);
    });

    // Comments events
    newSocket.on('newComment', (comment: Comment) => {
      setCommentsByPost(prev => ({
        ...prev,
        [comment.postId]: [...(prev[comment.postId] || []), comment].sort((a, b) => a.index - b.index)
      }));
    });

    newSocket.on('commentsForPost', ({ postId, comments }: { postId: string, comments: Comment[] }) => {
      setCommentsByPost(prev => ({ ...prev, [postId]: comments.sort((a, b) => a.index - b.index) }));
    });

    newSocket.on('commentLiked', (updatedComment: Comment) => {
      setCommentsByPost(prev => {
        const list = prev[updatedComment.postId] || [];
        return { ...prev, [updatedComment.postId]: list.map(c => c.id === updatedComment.id ? updatedComment : c) };
      });
    });

    newSocket.on('commentDeleted', ({ postId, commentId }: { postId: string; commentId: string }) => {
      setCommentsByPost(prev => {
        const list = prev[postId] || [];
        return { ...prev, [postId]: list.filter(c => c.id !== commentId) };
      });
    });

    newSocket.on('duelRequestReceived', (request: DuelRequest) => {
      setDuelRequests(prev => [...prev, request]);
    });


    newSocket.on('duelRequestSent', (request: DuelRequest) => {
      setDuelRequests(prev => [...prev, request]);
    });

    newSocket.on('duelRequestResponse', ({ requestId, response }: { requestId: string; response: string }) => {
      setDuelRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status: response as 'accepted' | 'declined' } : req
        )
      );
    });

    newSocket.on('duelRequests', (requests: DuelRequest[]) => {
      setDuelRequests(requests);
    });

    newSocket.on('searchResults', (results: User[]) => {
      setSearchResults(results);
    });

    newSocket.on('userProfile', (profile: UserProfile) => {
      setSelectedUserProfile(profile);
    });

    newSocket.on('duelHistory', (history: DuelHistory[]) => {
      setDuelHistory(history);
    });

    newSocket.on('duelCompleted', (historyEntry: DuelHistory) => {
      setDuelHistory(prev => [historyEntry, ...prev]);
      // Refresh duel requests to remove completed duel
      newSocket.emit('getDuelRequests');
    });

    newSocket.on('postDeleted', ({ postId }: { postId: string }) => {
      setPosts(prev => prev.filter(post => post.id !== postId));
    });

    newSocket.on('error', (message: string) => {
      alert(`Error: ${message}`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const login = (username: string, password?: string, profilePicture?: File | null) => {
    if (socket) {
      // Convert profile picture to base64 if provided
      if (profilePicture) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target?.result as string;
          socket.emit('register', { username, password, profilePicture: base64String });
        };
        reader.readAsDataURL(profilePicture);
      } else {
        socket.emit('register', { username, password });
      }
    }
  };

  const logout = () => {
    setUser(null);
    setPosts([]);
    setDuelRequests([]);
    setDuelHistory([]);
    setSearchResults([]);
    setSelectedUserProfile(null);
    if (socket) {
      socket.disconnect();
    }
  };

  const createPost = (content: string) => {
    if (socket) {
      socket.emit('createPost', content);
    }
  };

  const createComment = (postId: string, content: string) => {
    if (socket) {
      socket.emit('createComment', { postId, content });
    }
  };

  const sendDuelRequest = (postId: string, targetUserId: string) => {
    if (socket) {
      socket.emit('sendDuelRequest', { postId, targetUserId });
    }
  };

  const sendDuelRequestOnComment = (postId: string, commentId: string, targetUserId: string) => {
    if (socket) {
      socket.emit('sendDuelRequest', { postId, targetUserId, targetType: 'comment', commentId });
    }
  };

  const respondToDuelRequest = (requestId: string, response: 'accepted' | 'declined') => {
    if (socket) {
      socket.emit('respondToDuelRequest', { requestId, response });
      refreshDuelRequests();
    }
  };

  const searchUsers = (query: string) => {
    if (socket) {
      socket.emit('searchUsers', query);
    }
  };

  const getUserProfile = (userId: string) => {
    if (socket) {
      socket.emit('getUserProfile', userId);
    }
  };

  const getUserProfileByUsername = (username: string) => {
    if (socket) {
      socket.emit('getUserProfileByUsername', username);
    }
  };

  const getComments = (postId: string) => {
    if (socket) {
      socket.emit('getComments', { postId });
    }
  };

  const refreshDuelRequests = () => {
    if (socket) {
      socket.emit('getDuelRequests');
    }
  };

  const completeDuel = (requestId: string, winnerId: string) => {
    if (socket) {
      socket.emit('completeDuel', { requestId, winnerId });
    }
  };

  const refreshDuelHistory = () => {
    if (socket) {
      socket.emit('getDuelHistory');
    }
  };

  const forwardDuelResult = (historyId: string) => {
    if (socket) {
      socket.emit('forwardDuelResult', { historyId });
    }
  };

  const followUser = (targetUserId: string) => {
    if (socket) {
      socket.emit('followUser', { targetUserId });
    }
  };

  const unfollowUser = (targetUserId: string) => {
    if (socket) {
      socket.emit('unfollowUser', { targetUserId });
    }
  };

  const submitDuelMove = (requestId: string, move: CanvasMove) => {
    if (socket) {
      socket.emit('submitDuelMove', { requestId, move });
    }
  };

  const K_FACTOR = 32; // Max ELO adjustment per game

  // Emit like/unlike events to server
  const likePost = (postId: string) => {
    if (socket) socket.emit('likePost', { postId });
  };

  const unlikePost = (postId: string) => {
    if (socket) socket.emit('unlikePost', { postId });
  };

  const likeComment = (commentId: string) => {
    if (socket) socket.emit('likeComment', { commentId });
  };

  const unlikeComment = (commentId: string) => {
    if (socket) socket.emit('unlikeComment', { commentId });
  };

  const calculateEloChange = (playerElo: number, opponentElo: number, outcome: 0 | 0.5 | 1) => {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    return Math.round(K_FACTOR * (outcome - expectedScore));
  };

  const destroyPost = (historyId: string) => {
    if (socket) {
      socket.emit('destroyPost', { historyId });
    }
  };

  const postOnBehalf = (historyId: string, content: string) => {
    if (socket) {
      socket.emit('postOnBehalf', { historyId, content });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      user,
      posts,
      commentsByPost,
      duelRequests,
      duelHistory,
      isConnected,
      login,
      logout,
      createPost,
      createComment,
      sendDuelRequest,
      sendDuelRequestOnComment,
      respondToDuelRequest,
      completeDuel,
      submitDuelMove,
      searchUsers,
      getUserProfile,
      getUserProfileByUsername,
      getComments,
      refreshDuelRequests,
      refreshDuelHistory,
      forwardDuelResult,
  followUser,
  unfollowUser,
    destroyPost,
      postOnBehalf,
      calculateEloChange,
    likePost,
    unlikePost,
    likeComment,
    unlikeComment,
      searchResults,
      selectedUserProfile
    }}>
      {children}
    </SocketContext.Provider>
  );
};