import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { getAddressFromCoordinates, getCurrentLocation, calculateDistance } from '../services/location';
import { ThumbsUp, ThumbsDown, MessageSquare, MapPin, AlertTriangle, Calendar, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SeverityRatingDialog from './SeverityRatingDialog';

interface Complaint {
  complaint_id: string;
  user_id: string;
  user_name?: string;
  title: string;
  description: string;
  category: string;
  location_lat?: number;
  location_long?: number;
  picture_url?: string;
  video_url?: string;
  status: string;
  created_at: string;
}

export default function ComplaintCard({ complaint, distance }: { complaint: Complaint, distance?: number }) {
  const { user } = useAuth();
  const [address, setAddress] = useState('Loading location...');
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [userSeverity, setUserSeverity] = useState<number | null>(null);
  const [avgSeverity, setAvgSeverity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSeverityDialog, setShowSeverityDialog] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (complaint.location_lat && complaint.location_long) {
      getAddressFromCoordinates(complaint.location_lat, complaint.location_long)
        .then(addr => {
          if (isMounted) setAddress(addr);
        });
    } else {
      setAddress('Location unavailable');
    }

    const loadVerificationStatus = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('verification')
        .select('*')
        .eq('complaint_id', complaint.complaint_id);

      if (error) return;

      let l = 0, d = 0;
      let ul = false, ud = false;
      let severities: number[] = [];

      data.forEach(v => {
        if (v.verified_true) {
          l++;
          if (v.user_id === user.id) {
            ul = true;
            setUserSeverity(v.severity);
          }
        }
        if (v.verified_false) {
          d++;
          if (v.user_id === user.id) ud = true;
        }
        if (v.severity !== null && v.severity !== undefined) {
          severities.push(v.severity);
        }
      });

      if (isMounted) {
        setLikes(l);
        setDislikes(d);
        setUserLiked(ul);
        setUserDisliked(ud);
        if (severities.length > 0) {
          setAvgSeverity(severities.reduce((a, b) => a + b, 0) / severities.length);
        }
      }
    };

    loadVerificationStatus();
    return () => { isMounted = false; };
  }, [complaint, user]);

  const checkGeofence = async () => {
    if (!complaint.location_lat || !complaint.location_long) return true;
    try {
      const pos = await getCurrentLocation({ timeout: 5000 });
      const dist = calculateDistance(pos.latitude, pos.longitude, complaint.location_lat, complaint.location_long);
      if (dist > 0.1) {
        toast.error('You must be within 100 meters of the issue to perform this action.');
        return false;
      }
      return true;
    } catch (e: any) {
      toast.error('Could not verify your location constraint: ' + e.message);
      return false;
    }
  };

  const handleLike = async () => {
    if (!user) return;
    setIsLoading(true);
    if (!(await checkGeofence())) {
      setIsLoading(false);
      return;
    }
    try {
      if (userLiked) {
        await supabase.from('verification').delete().eq('user_id', user.id).eq('complaint_id', complaint.complaint_id).eq('verified_true', true);
        setUserLiked(false);
        setLikes(prev => prev - 1);
        setUserSeverity(null);
      } else {
        if (userDisliked) {
          await supabase.from('verification').delete().eq('user_id', user.id).eq('complaint_id', complaint.complaint_id).eq('verified_false', true);
          setUserDisliked(false);
          setDislikes(prev => prev - 1);
        }
        await supabase.from('verification').insert({
          user_id: user.id, complaint_id: complaint.complaint_id, verified_true: true, verified_false: false, severity: null
        });
        setUserLiked(true);
        setLikes(prev => prev + 1);
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    setIsLoading(true);
    if (!(await checkGeofence())) {
      setIsLoading(false);
      return;
    }
    try {
      if (userDisliked) {
        await supabase.from('verification').delete().eq('user_id', user.id).eq('complaint_id', complaint.complaint_id).eq('verified_false', true);
        setUserDisliked(false);
        setDislikes(prev => prev - 1);
      } else {
        if (userLiked) {
          await supabase.from('verification').delete().eq('user_id', user.id).eq('complaint_id', complaint.complaint_id).eq('verified_true', true);
          setUserLiked(false);
          setLikes(prev => prev - 1);
          setUserSeverity(null);
        }
        await supabase.from('verification').insert({
          user_id: user.id, complaint_id: complaint.complaint_id, verified_true: false, verified_false: true, severity: null
        });
        setUserDisliked(true);
        setDislikes(prev => prev + 1);
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (ds: string) => {
    if (!ds) return 'Unknown Date';
    try {
      const d = new Date(ds);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  };

  // Safe lowercasing to prevent crashes
  const statusString = (complaint.status || 'pending').toLowerCase();
  
  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700 border-slate-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };
  
  const statusLabels: Record<string, string> = {
    pending: 'Pending Review',
    in_progress: 'In Progress',
    resolved: 'Resolved'
  };

  const statusClass = statusColors[statusString] || statusColors.pending;
  const statusLabel = statusLabels[statusString] || 'Pending';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-slate-300 transition-colors duration-200 flex flex-col">
      
      {/* Header Profile */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm shrink-0">
                {(complaint.user_name || 'U')[0].toUpperCase()}
             </div>
             <div>
               <p className="font-semibold text-slate-900 text-sm">{complaint.user_name || 'Anonymous Citizen'}</p>
               <div className="flex items-center text-xs text-slate-500 mt-0.5">
                  <Calendar size={12} className="mr-1.5 opacity-70" />
                  {formatDate(complaint.created_at)}
               </div>
             </div>
        </div>
        <div className={`px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${statusClass}`}>
          {statusLabel}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">{complaint.title}</h3>
        <p className="text-slate-700 text-sm leading-relaxed">{complaint.description || 'No description provided.'}</p>
      </div>
      
      {(complaint.picture_url || complaint.video_url) && (
        <div className="mb-5 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 max-h-72 relative">
          {complaint.video_url ? (
             <video src={complaint.video_url} controls className="w-full h-full object-cover" />
          ) : (
             <div className="w-full h-full relative">
               {!imgLoaded && (
                 <div className="absolute inset-0 bg-slate-200 animate-pulse"></div>
               )}
               <img 
                  src={complaint.picture_url} 
                  alt="Evidence" 
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
               />
             </div>
          )}
        </div>
      )}

      {/* Location Bar */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5">
        <MapPin size={16} className="text-slate-400 mr-2 shrink-0" />
        <div className="flex-1 min-w-0 pr-2">
           <p className="text-xs font-medium text-slate-700 truncate">{address}</p>
        </div>
        {distance !== undefined && (
          <div className="shrink-0 text-right">
             <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/50 px-2 py-1 rounded">
               {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} radius
             </span>
          </div>
        )}
      </div>

      {avgSeverity !== null && (
        <div 
          className="flex items-center space-x-3 mb-5 p-3 rounded-lg bg-orange-50/50 border border-orange-100 cursor-pointer hover:bg-orange-50 transition-colors"
          onClick={async () => {
            if (userLiked && await checkGeofence()) setShowSeverityDialog(true);
          }}
          title="Community Severity Rating"
        >
          <AlertTriangle size={16} className="text-orange-500 shrink-0" />
          <div className="flex-1">
            <div className="w-full bg-orange-100 rounded-full h-1.5 overflow-hidden">
               <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(avgSeverity / 5) * 100}%` }}></div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-bold text-orange-700">{avgSeverity.toFixed(1)}</span>
            <span className="text-xs font-semibold text-orange-400">/5</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
        <div className="flex space-x-2">
          <button 
            onClick={handleLike} 
            disabled={isLoading}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
              userLiked 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ThumbsUp size={16} className={userLiked ? "fill-blue-700" : ""} />
            <span>{likes > 0 ? likes : 'Verify'}</span>
          </button>
          
          <button 
            onClick={handleDislike} 
            disabled={isLoading}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
              userDisliked 
                ? 'bg-red-50 text-red-600 border-red-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ThumbsDown size={16} className={userDisliked ? "fill-red-600" : ""} />
            <span>{dislikes > 0 ? dislikes : 'Fake'}</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          {userLiked && (
            <button
               onClick={async () => {
                 if (await checkGeofence()) setShowSeverityDialog(true);
               }}
               className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                 userSeverity 
                   ? 'bg-orange-50 text-orange-700 border-orange-200' 
                   : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
               }`}
            >
               <Award size={16} className={userSeverity ? "fill-orange-600" : ""} />
               <span className="hidden sm:inline">Rate</span>
            </button>
          )}
        </div>
      </div>

      {showSeverityDialog && user && (
        <SeverityRatingDialog
          complaintId={complaint.complaint_id}
          userId={user.id}
          isLike={userLiked}
          onRatingSubmitted={(rating) => {
            setUserSeverity(rating);
            setAvgSeverity(prev => prev === null ? rating : (prev * likes + rating) / (likes + 1));
          }}
          onClose={() => setShowSeverityDialog(false)}
        />
      )}
    </div>
  );
}
