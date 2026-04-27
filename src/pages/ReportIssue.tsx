import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentLocation, getAddressFromCoordinates, Position, getCachedLocation } from '../services/location';
import { analyzeImageWithGemini } from '../services/ai';
import { toast } from 'react-hot-toast';
import { MapPin, Image as ImageIcon, Video, Camera, ArrowLeft, Send, CheckCircle, Sparkles } from 'lucide-react';

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
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [isAiMode, setIsAiMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cached = getCachedLocation();
    if (cached.position) {
      setPosition(cached.position);
      setAddress(cached.address);
    }
    
    return () => {
      stopCamera();
    };
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      toast.error('Camera access denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    if (!isAnalyzing) {
       setIsAiMode(false);
    }
  };

  const startAiMode = () => {
    setIsAiMode(true);
    startCamera();
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setMediaPreview(dataUrl);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "evidence.jpg", { type: "image/jpeg" });
            setMediaFile(file);
          }
        }, 'image/jpeg', 0.8);
        
        stopCamera();

        if (isAiMode) {
          setIsAnalyzing(true);
          // Async analysis without blocking the UI capture phase
          analyzeImageWithGemini(dataUrl).then((aiData) => {
            setTitle(aiData.title);
            setDescription(aiData.description);
            if (CATEGORIES.includes(aiData.category)) {
              setCategory(aiData.category);
            } else {
              setCategory('Other');
            }
            toast.success('AI Auto-Fill Complete! ✨');
          }).catch((err) => {
            console.error(err);
            toast.error('AI Analysis failed. Please fill manually.');
          }).finally(() => {
            setIsAnalyzing(false);
            setIsAiMode(false);
          });
        }
      }
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
    if (!mediaFile) return toast.error('Visual evidence is mandatory.');

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
         <h1 className="text-2xl font-bold text-slate-900 mb-2">Report Submitted Successfully</h1>
         <p className="text-slate-500 text-sm">
            Your report has been received and will be reviewed soon.
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
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">Report an Issue</h1>
             <p className="text-slate-500 text-sm mt-0.5">Enter details about the issue.</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Spatial Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Your Location</h2>
              <button 
                type="button" onClick={fetchLocation}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors px-3 py-1.5 rounded"
              >
                Update Location
              </button>
            </div>
            
            <div className="flex items-center">
              <div className="p-3 bg-slate-50 rounded-lg mr-4 border border-slate-100 shrink-0">
                 <MapPin size={20} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                {isLocating ? (
                  <p className="text-sm font-medium text-slate-500 animate-pulse">Finding your location...</p>
                ) : position ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{address}</p>
                    <div className="inline-flex mt-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600 font-mono">
                      LAT: {position.latitude.toFixed(6)} | LON: {position.longitude.toFixed(6)}
                    </div>
                  </>
                ) : (
                  <div>
                     <p className="text-sm font-medium text-slate-600 mb-2">Location is required to report an issue.</p>
                     <button type="button" onClick={fetchLocation} className="text-xs font-bold bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors shadow-sm">Grant Location Access</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
             <button 
               type="button" 
               onClick={startAiMode}
               className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex justify-center items-center"
             >
               <Sparkles size={16} className="mr-2" /> Make complaint with AI
             </button>
          </div>

          {/* Issue Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">Issue Details</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer font-medium"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hazardous pothole forming on intersection"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add a Photo</h2>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">Mandatory Segment</span>
            </div>
            
            {mediaPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-[300px] flex justify-center group">
                 <img src={mediaPreview} alt="Evidence Artifact" className={`w-full h-full object-contain ${isAnalyzing ? 'opacity-30' : 'opacity-100'} transition-opacity`} />
                 
                 {isAnalyzing ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3"></div>
                     <p className="text-purple-700 font-bold text-sm bg-purple-50 px-3 py-1 rounded-full shadow-sm">AI is analyzing image...</p>
                   </div>
                 ) : (
                   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                        className="bg-white shadow-sm border border-slate-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                      >
                        Remove Photo
                      </button>
                   </div>
                 )}
              </div>
            ) : isCameraActive ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black h-[300px] flex justify-center group flex-col items-center">
                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                 <canvas ref={canvasRef} className="hidden" />
                 {isAiMode && (
                   <div className="absolute top-4 bg-purple-600/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur flex items-center">
                     <Sparkles size={14} className="mr-1.5" /> AI Camera Mode
                   </div>
                 )}
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                    <button type="button" onClick={capturePhoto} className="w-14 h-14 bg-white rounded-full border-4 border-slate-300 shadow-lg hover:scale-105 transition-transform"></button>
                    <button type="button" onClick={stopCamera} className="absolute right-4 bottom-3 bg-red-600/80 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm hover:bg-red-600 transition-colors">Cancel</button>
                 </div>
              </div>
            ) : (
              <div 
                onClick={startCamera}
                className="w-full border border-dashed border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center mb-3">
                  <Camera size={20} className="text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Take a Photo</p>
                <p className="text-xs text-slate-400 mt-1">Live camera feed only</p>
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
                  Submit Report
                </>
              )}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}
