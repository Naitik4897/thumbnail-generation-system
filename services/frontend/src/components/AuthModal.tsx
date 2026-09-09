'use client';

import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { authAtom } from '../state/atoms';
import { ApiClient } from '../lib/api';
import { X, Lock, Mail, User, Loader2, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const setAuth = useSetAtom(authAtom);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const googleBtnRef = React.useRef<HTMLDivElement>(null);
  const callbacksRef = React.useRef({ setAuth, onClose });
  callbacksRef.current = { setAuth, onClose };

  // Load and initialize Google Identity Services
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    const initAndRender = () => {
      if (!(window as any).google?.accounts?.id) return;

      // Only initialize once globally
      if (!(window as any).__gsi_initialized) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            use_fedcm_for_prompt: false,
            callback: async (res: { credential?: string }) => {
              if (res.credential) {
                try {
                  setIsLoading(true);
                  const authRes = await ApiClient.googleAuth({ credential: res.credential });
                  const { user, token } = authRes.data;
                  localStorage.setItem('auth_token', token);
                  callbacksRef.current.setAuth({ user, token, isAuthenticated: true, isLoading: false });
                  callbacksRef.current.onClose();
                } catch (err: any) {
                  setErrorMsg(err.message || 'Google authentication failed');
                } finally {
                  setIsLoading(false);
                }
              }
            },
          });
          (window as any).__gsi_initialized = true;
        } catch (e) {
          console.warn('[Google GIS Init warning]', e);
        }
      }

      // Render button if container exists
      if (googleBtnRef.current) {
        try {
          googleBtnRef.current.innerHTML = '';
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: 380,
            text: 'continue_with',
            shape: 'pill',
          });
        } catch (e) {
          console.warn('[Google GIS Render warning]', e);
        }
      }
    };

    if (!(window as any).google?.accounts?.id) {
      const existingScript = document.getElementById('google-jssdk');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-jssdk';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initAndRender;
        document.body.appendChild(script);
      } else {
        existingScript.onload = initAndRender;
      }
    } else {
      initAndRender();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let response;
      if (isLogin) {
        response = await ApiClient.login(email, password);
      } else {
        response = await ApiClient.register(email, password, name || undefined);
      }

      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);

      setAuth({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google OAuth Section */}
        <div className="mb-5 flex flex-col items-center justify-center min-h-[44px]">
          <div ref={googleBtnRef} className="w-full flex justify-center" />
        </div>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-slate-800"></div>
          <span className="px-3 text-[11px] text-slate-500 uppercase tracking-wider">or with email</span>
          <div className="flex-1 border-t border-slate-800"></div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              isLogin
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              !isLogin
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              'Sign In to Dashboard'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
