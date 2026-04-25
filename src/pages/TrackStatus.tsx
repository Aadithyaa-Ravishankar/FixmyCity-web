import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Activity, Clock, CheckCircle, Construction, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrackStatus() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComplaints = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setComplaints(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getStatusIndex = (status: string) => {
    if (status === 'resolved') return 2;
    if (status === 'in_progress') return 1;
    return 0; // pending
  };

  return (
    <div className="w-full flex justify-center py-6 px-4 md:px-0 bg-slate-50 min-h-screen">
      <div className="w-full max-w-3xl space-y-6 pb-20">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
            <Activity className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Track Status</h1>
            <p className="text-slate-500 text-sm">Track the progress of the issues you've reported.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <MapPin className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Reports Found</h3>
            <p className="text-slate-500">You haven't reported any issues yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => {
              const statusIdx = getStatusIndex(complaint.complaint_status);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={complaint.complaint_id} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                >
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-bold text-slate-900">{complaint.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Reported on {new Date(complaint.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">{complaint.description}</p>
                      <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">{complaint.category}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                        statusIdx === 2 ? 'bg-emerald-100 text-emerald-700' :
                        statusIdx === 1 ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {complaint.complaint_status.replace('_', ' ')}
                      </span>
                      {complaint.picture_url && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                           <img src={complaint.picture_url} alt="Evidence" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="relative pt-6 pb-2">
                    <div className="absolute top-10 left-0 w-full h-1 bg-slate-100 rounded-full z-0"></div>
                    <div 
                      className="absolute top-10 left-0 h-1 bg-primary rounded-full z-0 transition-all duration-1000"
                      style={{ width: `${(statusIdx / 2) * 100}%` }}
                    ></div>
                    
                    <div className="relative z-10 flex justify-between">
                      {/* Step 1: Pending */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                          statusIdx >= 0 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <Clock size={14} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${statusIdx >= 0 ? 'text-primary' : 'text-slate-400'}`}>Pending</span>
                      </div>

                      {/* Step 2: In Progress */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                          statusIdx >= 1 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <Construction size={14} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${statusIdx >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>In Progress</span>
                      </div>

                      {/* Step 3: Resolved */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${
                          statusIdx >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <CheckCircle size={14} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${statusIdx >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>Resolved</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
