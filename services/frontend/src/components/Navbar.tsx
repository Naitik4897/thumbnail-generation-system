'use client';

import React from 'react';
import { useAtom } from 'jotai';
import { authAtom, socketConnectedAtom } from '../state/atoms';
import { Layers, LogOut, User, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const [auth, setAuth] = useAtom(authAtom);
  const [socketConnected] = useAtom(socketConnectedAtom);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">ThumbCraft</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">Distributed Async Media Processing</p>
          </div>
        </div>

        {/* Right Actions & Auth Status */}
        <div className="flex items-center gap-4">
          {/* Socket Connection Health Indicator */}
          {auth.isAuthenticated && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                socketConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
              title={socketConnected ? 'Realtime WebSocket Connected' : 'Connecting to WebSocket...'}
            >
              {socketConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reconnecting</span>
                </>
              )}
            </div>
          )}

          {auth.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="font-medium truncate max-w-[160px]">{auth.user?.name || auth.user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-md shadow-indigo-600/20"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
