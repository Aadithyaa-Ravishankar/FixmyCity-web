import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import ComplaintCard from '../components/ComplaintCard';
import { getCurrentLocation, calculateDistance, Position, getAddressFromCoordinates, getCachedLocation, saveLocationToCache } from '../services/location';
import { Filter, Search, Map, RefreshCw, AlertCircle, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Feed() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [userPos, setUserPos] = useState<Position | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  // Distance filter state
  const [distanceFilter, setDistanceFilter] = useState<number | null>(1000); // meters
  
  const distanceOptions = [
    { label: 'All Locations', value: null },
    { label: 'Within 250m', value: 250 },
    { label: 'Within 500m', value: 500 },
    { label: 'Within 1km', value: 1000 },
    { label: 'Within 5km', value: 5000 },
  ];

  useEffect(() => {
    // 1. Load from cache immediately
    const cached = getCachedLocation();
    if (cached.position) {
      setUserPos(cached.position);
      setUserAddress(cached.address);
      setIsUsingCache(true);
    }

    fetchLocationAndData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [distanceFilter, complaints, userPos, searchQuery]);

  const fetchLocationAndData = async () => {
    setIsLocating(true);
    setLocationError(null);
    
    try {
      const currentPos = await getCurrentLocation();
      setUserPos(currentPos);
      setIsUsingCache(false);
      
      const addr = await getAddressFromCoordinates(currentPos.latitude, currentPos.longitude);
      setUserAddress(addr);
      
      // Save to cache for next time
      saveLocationToCache(currentPos, addr);
    } catch (err: any) {
      console.error('Location fetch failed:', err);
      setLocationError(err.message || 'Unable to access location');
      
      // If we don't have a cache, fall back to "All Locations"
      if (!userPos) {
        setDistanceFilter(null);
      }
      
      toast.error(err.message || 'Location access failed', { 
        id: 'loc-error',
        duration: 4000 
      });
    } finally {
      setIsLocating(false);
      // We always fetch complaints, even if location fails (to show "All Locations")
      fetchComplaints();
    }
  };

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const { data: _complaints, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const userIds = Array.from(new Set(_complaints?.map(c => c.user_id) || []));
      
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', userIds);
          
        profiles?.forEach(p => {
          profilesMap[p.id] = p.display_name || 'User';
        });
      }

      const enriched = _complaints?.map(c => ({
        ...c,
        user_name: profilesMap[c.user_id] || 'User',
      })) || [];

      setComplaints(enriched);
    } catch (err: any) {
      toast.error('Failed to load civic data.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = complaints;

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(c => 
        (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (distanceFilter !== null && userPos) {
      filtered = filtered.filter(c => {
        if (!c.location_lat || !c.location_long) return false;
        const dKm = calculateDistance(userPos.latitude, userPos.longitude, c.location_lat, c.location_long);
        return (dKm * 1000) <= distanceFilter;
      });
      
      if (filtered.length === 0 && distanceFilter === 1000 && !initialCheckDone && complaints.length > 0) {
        setDistanceFilter(null);
        setInitialCheckDone(true);
        return; // will re-run effect because distanceFilter changed
      }
    }

    if (!initialCheckDone && complaints.length > 0) {
      setInitialCheckDone(true);
    }
    setFilteredComplaints(filtered);
  };

  const isDenied = locationError?.toLowerCase().includes('denied');

  return (
    <div className="w-full flex justify-center py-6 md:px-0">
      <div className="w-full max-w-4xl px-4 md:px-8 space-y-6">
        
        {/* Professional Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">City Issues</h1>
              <div className="flex items-center text-sm font-medium mt-1">
                {isLocating ? (
                  <span className="flex items-center text-slate-500">
                    <RefreshCw size={14} className="mr-2 animate-spin" />
                    Updating location...
                  </span>
                ) : userAddress ? (
                  <span className="flex items-center text-emerald-600 font-bold">
                    <MapPin size={14} className="mr-2" />
                    {userAddress}
                    {isUsingCache && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">Cached</span>}
                  </span>
                ) : (
                  <span className="flex items-center text-slate-400">
                    <AlertCircle size={14} className="mr-2" />
                    Location access restricted
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input 
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="relative w-full sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={14} className="text-slate-400" />
                </div>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg py-2 pl-9 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
                  value={distanceFilter === null ? 'null' : distanceFilter.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'null') setDistanceFilter(null);
                    else setDistanceFilter(parseInt(val));
                  }}
                  disabled={!userPos}
                >
                  {distanceOptions.map(opt => (
                    <option key={opt.label} value={opt.value === null ? 'null' : opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Location Retry Banner */}
          {locationError && (
            <div className={`px-6 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDenied ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
               <div className="flex items-center text-sm font-semibold">
                  <AlertCircle size={16} className={`mr-2 ${isDenied ? 'text-red-500' : 'text-amber-600'}`} />
                  <span className={isDenied ? 'text-red-700' : 'text-amber-800'}>
                    {isDenied ? 'Permission denied.' : 'Location temporarily unavailable.'} 
                    <span className="font-normal ml-1">Distance filtering is limited.</span>
                  </span>
               </div>
               <button 
                 onClick={fetchLocationAndData}
                 disabled={isLocating}
                 className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors ${
                   isDenied 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                 }`}
               >
                 {isLocating ? 'Detecting...' : 'Retry Access'}
               </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                <Map size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">No Data Available</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                No reports found matching the current filters. Try changing your search or location.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{filteredComplaints.length} Reports Found</p>
              </div>
              {filteredComplaints.map((complaint) => {
                const dKm = userPos && complaint.location_lat 
                  ? calculateDistance(userPos.latitude, userPos.longitude, complaint.location_lat, complaint.location_long)
                  : undefined;
                  
                return (
                  <ComplaintCard key={complaint.complaint_id} complaint={complaint} distance={dKm} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
