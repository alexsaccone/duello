import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { user, logout, duelRequests } = useSocket();
  const location = useLocation();

  const pendingDuels = duelRequests.filter(req =>
    req.toUserId === user?.id && req.status === 'pending'
  ).length;

  const tabs = [
    { id: 'feed', label: 'Feed', icon: '🏠', path: '/' },
    { id: 'search', label: 'Search', icon: '🔍', path: '/search' },
    { id: 'duels', label: 'Duels', icon: '⚔️', badge: pendingDuels, path: '/duels' },
    { id: 'profile', label: 'Profile', icon: '👤', path: `/profile/${user?.username}` },
  ];

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-blue-600">Duello</h1>

            <div className="flex space-x-1">
              {tabs.map(tab => (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === tab.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-medium">{user?.username}</span>
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;