# Duello

A Twitter-style social media app with dueling functionality built for Big Red Hacks 2025.

## Features

- **Post Creation**: Users can create and share text posts (up to 280 characters)
- **Real-time Feed**: See all posts from connected users in real-time
- **Duel System**: Challenge other users to duels on their posts
- **User Profiles**: View user profiles with win/loss ratios and follower counts
- **User Search**: Search for other users by username
- **Duel Management**: Accept/decline duel requests and view active duels

## Tech Stack

- **Frontend**: React.js with TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, Socket.io
- **Real-time Communication**: WebSockets via Socket.io

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies for both client and server:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

### Running the Application

You can run both the client and server together:

```bash
npm run dev
```

Or run them separately:

**Terminal 1 (Server):**
```bash
npm run server
```

**Terminal 2 (Client):**
```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

## How to Use

1. **Login**: Enter a unique username to join the platform
2. **Create Posts**: Share your thoughts in the main feed
3. **Send Duel Requests**: Click the "Duel" button on any post to challenge the author
4. **Manage Duels**: Use the Duels tab to accept/decline requests and view active duels
5. **Search Users**: Find other users and view their profiles
6. **View Profiles**: Click on usernames to see user profiles with stats and posts

## Features Not Yet Implemented

- **Actual Dueling Mechanics**: Currently only handles duel requests and notifications
- **User Registration/Persistence**: Users are stored in memory only
- **Following System**: Follower counts are placeholder values
- **Real-time Notifications**: Basic notifications via Socket.io

## Project Structure

```
duel-social/
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React context providers
│   ├── types.ts           # TypeScript type definitions
│   └── ...
├── server/
│   ├── index.js           # Express server with Socket.io
│   └── package.json       # Server dependencies
└── ...
```

## Demo Notes

This is a hackathon demo focused on core functionality. The app uses in-memory storage, so data will be lost when the server restarts. For a production version, you would want to add:

- Database persistence (MongoDB, PostgreSQL, etc.)
- User authentication with passwords
- Actual game mechanics for duels
- Real-time notifications
- File uploads for avatars
- Mobile responsiveness improvements
