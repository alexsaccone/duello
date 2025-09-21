# Duello
*"Have the final say."*

A text-based social media app that, harkening back to the days of yore, allows people to resolve disputes through duels. Built for Big Red Hacks 2025.

## Features

- **Text-Based Social Media**: Create and share posts (up to 280 characters) in a real-time feed
- **Duel System**: Challenge other users to single-turn, asynchronous, prediction-based duels on their posts
- **Interactive Canvas Dueling**: Place your king and guess your opponent's position to win
- **Duel Stakes**: Real consequences for dueling - winners can destroy posts or hijack accounts
- **Duel History & Visualization**: Review past duels with visual representations of moves
- **ELO Rating System**: Skill-based matchmaking with dynamic rating adjustments
- **User Profiles**: Comprehensive profiles showing stats, win/loss ratios, and ELO ratings
- **User Search**: Find and challenge other users by username
- **Real-time Updates**: Live notifications and updates via WebSocket connections

## Tech Stack

- **Frontend**: React.js with TypeScript, Tailwind CSS, Konva.js for canvas rendering
- **Backend**: Node.js with Express.js and Socket.io for real-time communication
- **Game Engine**: Custom canvas-based dueling system with move validation
- **Architecture**: Real-time WebSocket communication with in-memory state management

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
2. **Create Posts**: Share your thoughts in the main feed (up to 280 characters)
3. **Send Duel Requests**: Click the "Duel" button on any post to challenge the author
4. **Accept Duels**: Use the Duels tab to accept/decline incoming requests
5. **Play Duels**: Place your king near the target and guess where your opponent will place theirs
6. **Duel Stakes**: Winners can destroy the original post or hijack the loser's account to post on their behalf
7. **Review History**: View past duels with visual representations of both players' moves
8. **Search Users**: Find other users and view their profiles with ELO ratings and duel history

## Project Structure

```
duello/
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

This is a hackathon demo focused on core functionality. The app uses in-memory storage, so data will be lost when the server restarts. For a production version, we would want to add:

- Mobile responsiveness improvements
- Enhanced security measures
