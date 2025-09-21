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
  commentCount?: number; // number of comments on this post
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
  postId: string; // For backward compatibility (also present when target is a comment)
  commentId?: string; // Present when the duel was initiated on a comment
  targetType?: 'post' | 'comment';
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
  commentId?: string;
  targetType?: 'post' | 'comment';
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

// Comment structure mirrors Post plus linkage back to original post and a stable index for ordering
export interface Comment {
  id: string;
  postId: string; // ID of the post this comment belongs to
  index: number; // Order index within the post's comments (0-based)
  userId: string;
  username: string;
  profilePicture?: string;
  content: string;
  timestamp: string;
  authorElo: number;
  likes?: number;
  likedBy?: string[];
}