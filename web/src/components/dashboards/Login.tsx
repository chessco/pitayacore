import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('admin@pitayacode.io');
  const [password, setPassword] = useState('pitaya123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Real authentication call
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      if (window.location.hostname === 'localhost') {
        apiUrl = 'http://localhost:3014';
      } else if (!import.meta.env.VITE_API_URL) {
        apiUrl = window.location.origin.replace(':3000', ':3014');
      }
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;

      // Save to local storage for persistence
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Log login event
      await axios.post(`${apiUrl}/api/auth/login-event`, {
        email,
        tenantId: user.tenantId,
        role: user.role
      });

      onLogin(user);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Credenciales inválidas. Por favor intente de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-10 relative z-10 border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-blue-light rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck size={32} className="text-brand-blue" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">PitayaCore AI</h1>
          <p className="text-slate-400 font-medium text-sm">Inicia sesión para gestionar tus operaciones</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej: admin@pitayacode.io"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-brand-blue focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-brand-blue focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold text-rose-500 text-center"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-sm shadow-xl shadow-brand-blue/20 hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Entrar al Command Center
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-slate-50 text-center">
          <div className="flex items-center justify-center gap-3 text-slate-300">
            <Sparkles size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Powered by Pitaya AI</span>
            <span className="text-[9px] font-bold text-slate-200 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              v1.2.0
            </span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

