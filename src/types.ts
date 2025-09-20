export interface User {
  id: string;
  username: string;
  password?: string; // Private field, not exposed in public interfaces
  profilePicture?: string; // URL or base64 string for profile picture
  wins: number;
  losses: number;
  followers: number;
  posts?: string[];
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  profilePicture?: string; // URL or base64 string for profile picture
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
}

export interface UserProfile {
  id: string;
  username: string;
  profilePicture?: string; // URL or base64 string for profile picture
  wins: number;
  losses: number;
  followers: number;
  posts: Post[];
}