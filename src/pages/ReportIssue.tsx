import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentLocation, getAddressFromCoordinates, Position } from '../services/location';
import { toast } from 'react-hot-toast';
import { MapPin, Image as ImageIcon, Video, Camera, ArrowLeft, Send, CheckCircle } from 'lucide-react';

const CATEGORIES = [
  'Road & Infrastructure',
  'Garbage & Waste',
  'Water & Sewage',
  'Electricity & Lighting',
  'Public Transport',
  'Parks & Recreation',
  'Other'
];

export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  
  const [position, setPosition] = useState<Position | null>(null);
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentLocation();
      setPosition(pos);
      const addr = await getAddressFromCoordinates(pos.latitude, pos.longitude);
      setAddress(addr);
    } catch (e: any) {
      toast.error('Could not acquire geospatial data.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadMedia = async (file: File) => {
    if (!user) throw new Error('Authentication required');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('complaints')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error('Storage transmission failed.');
    }

    const { data } = supabase.storage.from('complaints').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) return toast.error('A title is required for the log.');
    if (!description) return toast.error('Please provide a descriptive log.');
    if (!position) return toast.error('Geolocation data is required.');
    if (!user) return toast.error('Session expired. Please re-authenticate.');

    setIsSubmitting(true);
    try {
      let photoUrl = null;
      let videoUrl = null;
      
      if (mediaFile) {
        const url = await uploadMedia(mediaFile);
        if (mediaFile.type.startsWith('video/')) {
          videoUrl = url;
        } else {
          photoUrl = url;
        }
      }

      const { error } = await supabase.from('complaints').insert({
        user_id: user.id,
        title,
        description,
        category,
        location_lat: position.latitude,
        location_long: position.longitude,
        picture_url: photoUrl,
        video_url: videoUrl,
        complaint_status: 'pending',
        voice_url: null,
      }).select();

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
         navigate('/home');
      }, 2000);
      
    } catch (e: any) {
      toast.error('Submission failed: ' + e.message);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full w-full max-w-lg mx-auto">
         <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mb-6">
            <CheckCircle size={32} className="text-emerald-600" />
         </div>
         <h1 className="text-2xl font-bold text-slate-900 mb-2">Record Successfully Submitted</h1>
         <p className="text-slate-500 text-sm">
            The civic issue has been logged into the regional database for administrative review.
         </p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-6 md:px-0 bg-slate-50 min-h-screen">
      <div className="w-full max-w-2xl px-4 md:px-8 space-y-6 pb-20">
        
        {/* Clean Header */}
        <div className="flex items-center mb-2">
           <button onClick={() => navigate(-1)} className="mr-3 p-2 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
             <ArrowLeft size={16} />
           </button>
           <div>
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">Lodge Civic Issue</h1>
             <p className="text-slate-500 text-sm mt-0.5">Enter details to report a community infraction.</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Spatial Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Spatial Data Logging</h2>
              <button 
                type="button" onClick={fetchLocation}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-1.5 rounded"
              >
                Refresh Coordinate
              </button>
            </div>
            
            <div className="flex items-center">
              <div className="p-3 bg-slate-50 rounded-lg mr-4 border border-slate-100 shrink-0">
                 <MapPin size={20} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                {isLocating ? (
                  <p className="text-sm font-medium text-slate-500 animate-pulse">Querying satellite positioning...</p>
                ) : position ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{address}</p>
                    <div className="inline-flex mt-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600 font-mono">
                      LAT: {position.latitude.toFixed(6)} | LON: {position.longitude.toFixed(6)}
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-medium text-red-600">Spatial data stream severed. Refresh required.</p>
                )}
              </div>
            </div>
          </div>

          {/* Issue Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Issue Information</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category Classification</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer font-medium"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Header</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hazardous pothole forming on intersection"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Report</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise contextual data for municipal administrative teams..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Visual Evidence Log</h2>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">Optional Segment</span>
            </div>
            
            {mediaPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-[300px] flex justify-center group">
                {mediaFile?.type.startsWith('video/') ? (
                  <video src={mediaPreview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={mediaPreview} alt="Evidence Artifact" className="w-full h-full object-contain" />
                )}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button
                     type="button"
                     onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                     className="bg-white shadow-sm border border-slate-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                   >
                     Discard Asset
                   </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center mb-3">
                  <Camera size={20} className="text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Attach Documentation File</p>
                <p className="text-xs text-slate-400 mt-1">Accepts standard image/video datasets</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,video/*" 
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* Execution */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !position || !title || !description}
              className="w-full h-14 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center text-sm tracking-wide"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Transmit Issue Record
                </>
              )}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}
