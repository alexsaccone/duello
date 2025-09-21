import React, { useState } from "react";
import { SocketProvider } from "./contexts/SocketContext";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Feed from "./components/Feed";
import Search from "./components/Search";
import Profile from "./components/Profile";
import Duels from "./components/Duels";

type AppContentProps = {
  user: any;
};

const AppContent: React.FC<AppContentProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState("feed");
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const handleUserClick = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "profile") {
      setViewingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />

      <main className="py-8 px-4">
        {activeTab === "feed" && <Feed onUserClick={handleUserClick} />}
        {activeTab === "search" && <Search onUserClick={handleUserClick} />}
        {activeTab === "duels" && <Duels onUserClick={handleUserClick} />}
        {activeTab === "profile" && (
          <Profile
            userId={viewingUserId || undefined}
            onUserClick={handleUserClick}
          />
        )}
      </main>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<any>(null);

  return (
    <SocketProvider>
      {!user ? (
        <Login onAuthSuccess={(u) => setUser(u)} />
      ) : (
        <AppContent user={user} />
      )}
    </SocketProvider>
  );
}

export default App;
