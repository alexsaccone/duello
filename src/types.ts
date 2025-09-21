export interface User {
  id: string;
  username: string;
  password?: string; // Private field, not exposed in public interfaces
  profilePicture?: string; // URL or base64 string for profile picture
  wins: number;
  losses: number;
  followers: number;
  elo: number;
  posts?: string[];
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  profilePicture?: string; // URL or base64 string for profile picture
  content: string;
  timestamp: string;
  authorElo: number;
  duelRequests?: string[];
}

export interface DuelRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromUserElo: number;
  toUserId: string;
  toUsername: string;
  toUserElo: number;
  postId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
  fromUserMove?: number | null;
  toUserMove?: number | null;
  gameState?: 'waiting_for_moves' | 'completed';
}

export interface DuelHistory {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  postId: string;
  winnerId: string;
  winnerUsername: string;
  timestamp: string;
  originalPostContent?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  profilePicture?: string; // URL or base64 string for profile picture
  wins: number;
  losses: number;
  followers: number;
  elo: number;
  posts: Post[];
}