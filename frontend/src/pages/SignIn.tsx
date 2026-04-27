import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_URL = VITE_API_URL ? VITE_API_URL.replace(/\/$/, '') : 'https://intellirag-api.onrender.com/api';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('user', data.user.name);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Colorful Gradient Mesh Background */}
      <div className="absolute inset-0 z-0">
        {/* Grain Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        
        {/* Radial Light Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.15)_0%,_transparent_50%)] blur-2xl" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1)_0%,_transparent_50%)] blur-3xl translate-x-1/3 -translate-y-1/3" />
        
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[#7C3AED]/20 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-[#3B82F6]/20 blur-[120px]"
        />
      </div>

      {/* Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] p-10 mx-4 bg-white/60 dark:bg-[#0F172A]/60 backdrop-blur-2xl border border-gray-300 dark:border-[#ffffff1a] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#111827] flex items-center justify-center shadow-inner border border-gray-300 dark:border-[#ffffff1a] mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] opacity-20 rounded-2xl blur-md group-hover:opacity-40 transition-opacity duration-500" />
            <Bot className="w-7 h-7 text-gray-900 dark:text-[#F8FAFC] relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#F8FAFC] tracking-tight mb-1.5">Welcome Back</h1>
          <p className="text-gray-500 dark:text-[#94A3B8] text-[15px]">Sign in to continue to IntelliRAG</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[13px] text-center font-medium">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500 dark:text-[#94A3B8] group-focus-within:text-[#7C3AED] transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#ffffff1a] rounded-xl text-gray-900 dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]/50 transition-all text-[15px] shadow-inner"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[12px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider">Password</label>
              <a href="#" className="text-[12px] font-medium text-[#7C3AED] hover:text-[#3B82F6] transition-colors">Forgot password?</a>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 dark:text-[#94A3B8] group-focus-within:text-[#7C3AED] transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#ffffff1a] rounded-xl text-gray-900 dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]/50 transition-all text-[15px] shadow-inner"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-[15px] font-semibold text-gray-900 dark:text-white bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:from-[#6D28D9] hover:to-[#2563EB] transition-all mt-8 group overflow-hidden shadow-lg shadow-[#7C3AED]/25 hover:shadow-[#7C3AED]/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out" />
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : (
              <>
                <span className="relative z-10">Sign In</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-gray-500 dark:text-[#94A3B8]">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-gray-900 dark:text-[#F8FAFC] hover:text-[#7C3AED] transition-colors underline decoration-white/20 underline-offset-4 hover:decoration-[#7C3AED]/50">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
