export interface User {
  id: string;
  username: string;
  password?: string; // Private field, not exposed in public interfaces
  profilePicture?: string; // URL or base64 string for profile picture
  wins: number;
  losses: number;
  followers: number;
  followersSet?: string[]; // list of user IDs who follow this user
  followingSet?: string[]; // list of user IDs this user follows
  elo: number;
  posts?: string[] | Post[];
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  profilePicture?: string; // URL or base64 string for profile picture
  content: string;
  timestamp: string;
  authorElo: number;
  likes?: number; // number of likes
  likedBy?: string[]; // list of user IDs who liked this post
  duelRequests?: string[];
}

export interface Point {
  x: number;
  y: number;
}

export interface GuessedArea {
  center: Point;
  radius: number;
}

export interface CanvasMove {
  kingPosition: Point;
  guessedArea: GuessedArea;
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
  fromUserMove?: CanvasMove | null;
  toUserMove?: CanvasMove | null;
  gameState?: 'waiting_for_moves' | 'completed';
  pointSource?: Point; // The target point for the duel
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
  postDestroyed: boolean;
  hijackPostUsed: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  profilePicture?: string; // URL or base64 string for profile picture
  wins: number;
  losses: number;
  followers: number;
  followersSet?: string[];
  followingSet?: string[];
  elo: number;
  posts: Post[];
}