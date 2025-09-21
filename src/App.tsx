import React from 'react';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Feed from './components/Feed';
import Search from './components/Search';
import Profile from './components/Profile';
import Duels from './components/Duels';
import { Routes, Route, Navigate } from 'react-router-dom';

const AppContent: React.FC = () => {
  const { user } = useSocket();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="py-8 px-4">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/duels" element={<Duels />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/login" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;
