import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, CalendarDays, User } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Bringo
            </h1>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-neutral-300 font-medium">{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-red-500/20 border border-neutral-700 hover:border-red-500/50 rounded-xl text-sm font-medium text-neutral-300 hover:text-red-400 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
