import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Link } from 'react-router-dom';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const { searchUsers, searchResults } = useSocket();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchUsers(query.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      searchUsers(value.trim());
    }
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 'No duels';
    return `${Math.round((wins / total) * 100)}% (${wins}W-${losses}L)`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Search Users</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search for users..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </form>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {searchResults.map((user) => (
              <Link
                key={user.id}
                to={`/profile/${user.username}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-blue-600 hover:text-blue-800">
                      @{user.username}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>👥 {user.followers} followers</span>
                      <span>⚔️ {getWinRate(user.wins, user.losses)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {user.wins + user.losses === 0 ? (
                        <span className="text-gray-400">New user</span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-green-600">{user.wins} wins</span>
                          <span className="text-red-600">{user.losses} losses</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {query && searchResults.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No users found matching "{query}"</p>
        </div>
      )}

      {!query && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Start typing to search for users</p>
        </div>
      )}
    </div>
  );
};

export default Search;