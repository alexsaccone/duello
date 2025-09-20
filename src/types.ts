export interface User {
  id: string;
  username: string;
  wins: number;
  losses: number;
  followers: number;
  posts?: string[];
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  duelRequests?: string[];
}

export interface DuelRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
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
  wins: number;
  losses: number;
  followers: number;
  posts: Post[];
}