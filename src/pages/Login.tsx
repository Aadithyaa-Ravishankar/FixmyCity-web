import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sendOTP } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { session } = useAuth();

  if (session) {
    navigate('/home');
    return null;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required to log in.');
      return;
    }
    if (isSignup && !name) {
      toast.error('Full name is required to sign up.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendOTP(email, isSignup ? name : undefined);
      toast.success(`Code sent to your email.`);
      navigate('/verify-otp', { state: { email, isCustom: (result as any)?.isCustom } });
    } catch (error: any) {
      toast.error(`Login Failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[420px]">
        
        {/* Clean Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center mb-5 shrink-0">
            <Building2 size={32} className="text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FixmyCity</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isSignup ? "Create your account." : "Log in to your account."}
          </p>
        </div>

        {/* Clean Card Structure */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">

          {/* Toggle */}
          <div className="flex mb-8 bg-slate-50 p-1.5 rounded-lg border border-slate-200/50">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${!isSignup ? 'bg-white shadow border border-slate-200/50 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setIsSignup(false)} type="button"
            >
              Log In
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${isSignup ? 'bg-white shadow border border-slate-200/50 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setIsSignup(true)} type="button"
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-slate-400"
                    placeholder="E.g. Jane Citizen"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-slate-400"
                  placeholder="contact@example.gov"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>



            <button
              type="submit" disabled={isLoading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70 flex justify-center items-center mt-6 text-sm border border-slate-800"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
              ) : (
                isSignup ? 'Sign Up' : 'Log In'
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 flex items-center justify-center space-x-2 text-slate-400">
           <ShieldCheck size={14} />
           <p className="text-[11px] font-semibold uppercase tracking-wider">Secured by Supabase</p>
        </div>
      </div>
    </div>
  );
}
