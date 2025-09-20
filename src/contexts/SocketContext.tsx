import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Post, DuelRequest, UserProfile } from '../types';

interface SocketContextType {
  socket: Socket | null;
  user: User | null;
  posts: Post[];
  duelRequests: DuelRequest[];
  isConnected: boolean;
  login: (username: string, password?: string, profilePicture?: File | null) => void;
  logout: () => void;
  createPost: (content: string) => void;
  sendDuelRequest: (postId: string, targetUserId: string) => void;
  respondToDuelRequest: (requestId: string, response: 'accepted' | 'declined') => void;
  searchUsers: (query: string) => void;
  getUserProfile: (userId: string) => void;
  refreshDuelRequests: () => void;
  searchResults: User[];
  selectedUserProfile: UserProfile | null;
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
  const [duelRequests, setDuelRequests] = useState<DuelRequest[]>([]);
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

    newSocket.on('newPost', (newPost: Post) => {
      setPosts(prev => [newPost, ...prev]);
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

  const sendDuelRequest = (postId: string, targetUserId: string) => {
    if (socket) {
      socket.emit('sendDuelRequest', { postId, targetUserId });
    }
  };

  const respondToDuelRequest = (requestId: string, response: 'accepted' | 'declined') => {
    if (socket) {
      socket.emit('respondToDuelRequest', { requestId, response });
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

  const refreshDuelRequests = () => {
    if (socket) {
      socket.emit('getDuelRequests');
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      user,
      posts,
      duelRequests,
      isConnected,
      login,
      logout,
      createPost,
      sendDuelRequest,
      respondToDuelRequest,
      searchUsers,
      getUserProfile,
      refreshDuelRequests,
      searchResults,
      selectedUserProfile
    }}>
      {children}
    </SocketContext.Provider>
  );
};