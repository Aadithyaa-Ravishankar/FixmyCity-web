import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Hash, Clock, LogIn, RefreshCw, LogOut, FileText, CheckCircle, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('complaint_status')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        setStats({
          total: data.length,
          pending: data.filter(c => c.complaint_status === 'pending').length,
          in_progress: data.filter(c => c.complaint_status === 'in_progress').length,
          resolved: data.filter(c => c.complaint_status === 'resolved').length,
        });
      }
    } catch (e: any) {
      toast.error('Error loading analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const StatCard = ({ title, value, icon: Icon, colorClass, borderClass, bgClass }: any) => (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 flex flex-col relative`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${borderClass} rounded-l-xl`}></div>
      <div className="flex justify-between items-start mb-2">
         <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</span>
         <div className={`p-1.5 rounded-md ${bgClass}`}>
            <Icon className={colorClass} size={16} />
         </div>
      </div>
      <div className="flex items-baseline">
        <span className={`text-3xl font-bold text-slate-900`}>{value}</span>
      </div>
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-start py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5">
         <Icon size={16} className="text-slate-400" />
      </div>
      <div className="ml-3 flex-1 flex flex-col md:flex-row md:items-center justify-between">
        <p className="text-sm font-medium text-slate-500 mb-0.5 md:mb-0">{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-all">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center py-8 px-4 md:px-0">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
             <User size={40} />
          </div>
          <div className="flex-1 text-center md:text-left flex flex-col justify-center h-24">
             <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
               {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User Profile'}
             </h1>
             <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start">
               <Mail size={14} className="mr-1.5" />
               {user?.email}
             </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
             <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Analytics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <StatCard title="Total Issues" value={stats.total} icon={FileText} borderClass="bg-slate-400" colorClass="text-slate-600" bgClass="bg-slate-50" />
               <StatCard title="Pending" value={stats.pending} icon={Clock} borderClass="bg-orange-500" colorClass="text-orange-600" bgClass="bg-orange-50" />
               <StatCard title="In Progress" value={stats.in_progress} icon={Briefcase} borderClass="bg-blue-500" colorClass="text-blue-600" bgClass="bg-blue-50" />
               <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle} borderClass="bg-emerald-500" colorClass="text-emerald-600" bgClass="bg-emerald-50" />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
               {/* Identity Information */}
               <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Account Details</h2>
                 
                 <div className="space-y-1">
                   {user?.phone && <InfoRow icon={Phone} label="Phone Number" value={user.phone} />}
                   <InfoRow icon={Clock} label="Account Created" value={user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'} />
                   <InfoRow icon={LogIn} label="Last Authenticated" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Unknown'} />
                 </div>
               </div>

               {/* System Actions */}
               <div className="md:col-span-1 space-y-4">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                   <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Settings</h2>
                   
                   <button 
                     onClick={loadStats}
                     className="w-full flex items-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors mb-3"
                   >
                     <RefreshCw className="text-slate-600 mr-3" size={16} />
                     <span className="text-sm font-semibold text-slate-700">Refresh Stats</span>
                   </button>
                   
                   <button 
                     onClick={async () => {
                       try {
                         await signOut();
                       } catch (e: any) {
                         toast.error('Session termination failed.');
                       }
                     }}
                     className="w-full flex items-center p-3 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors mt-auto"
                   >
                     <LogOut className="text-red-600 mr-3" size={16} />
                     <span className="text-sm font-semibold text-red-700">Log Out</span>
                   </button>
                 </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
