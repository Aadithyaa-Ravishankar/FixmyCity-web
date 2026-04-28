import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, User, MapPin, Building2, Bell, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchUpdates = async () => {
      const { data } = await supabase
        .from('complaints')
        .select('complaint_id, category, complaint_status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setRecentUpdates(data);
    };
    fetchUpdates();
  }, [user]);

  const navItems = [
    { path: '/home', icon: Home, label: 'Feed' },
    { path: '/report', icon: PlusCircle, label: 'Report' },
    { path: '/track', icon: Activity, label: 'Track Status' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30 relative">
        <div className="p-8 flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">FixmyCity</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 ease-out group overflow-hidden ${
                  isActive
                    ? 'text-primary font-semibold shadow-md shadow-primary/10'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                     <motion.div 
                        layoutId="active-nav-bg"
                        className="absolute inset-0 bg-primary/10 z-0"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     />
                  )}
                  <div className="relative z-10 flex items-center">
                    <item.icon
                      strokeWidth={isActive ? 2.5 : 2}
                      size={22}
                      className={`mr-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                    <span className="text-sm tracking-wide">{item.label}</span>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6">
          <div className="p-5 bg-gradient-to-br from-primary to-primary-dark rounded-3xl text-white shadow-xl shadow-primary/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
             <h3 className="font-bold mb-1 relative z-10">See an issue?</h3>
             <p className="text-sm text-white/80 mb-4 relative z-10">Report it quickly and track its status.</p>
             <NavLink to="/report" className="block text-center py-2.5 bg-white text-primary text-sm font-bold rounded-xl shadow hover:shadow-lg transition-all relative z-10 hover:scale-105 active:scale-95">
                Report Now
             </NavLink>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-screen overflow-hidden">
        {/* Top Header - Desktop Only */}
        <header className="hidden md:flex h-20 items-center justify-end px-8 z-20">
           <div className="flex items-center space-x-6 relative">
             <button 
               onClick={() => setShowNotifications(!showNotifications)}
               className="relative p-2.5 bg-white rounded-full text-slate-500 hover:text-primary shadow-sm hover:shadow-md transition-all border border-slate-100 hover:scale-105"
             >
                <Bell size={20} />
                {recentUpdates.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
             </button>
             
             {showNotifications && (
               <div className="absolute top-14 right-0 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                 <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-slate-800">Recent Status Updates</h3>
                   <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                 </div>
                 <div className="max-h-64 overflow-y-auto">
                   {recentUpdates.length === 0 ? (
                     <div className="p-4 text-center text-sm text-slate-500">No recent updates</div>
                   ) : (
                     recentUpdates.map(update => (
                       <div key={update.complaint_id} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => { setShowNotifications(false); navigate('/track'); }}>
                         <p className="text-xs font-semibold text-slate-900 line-clamp-1">{update.category}</p>
                         <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-wider">{update.complaint_status.replace('_', ' ')}</p>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             )}
           </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center justify-between px-4 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0">
           <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-gradient-to-tr from-primary to-primary-light rounded-lg flex items-center justify-center shadow-sm">
               <Building2 className="text-white" size={16} />
             </div>
             <h1 className="text-lg font-bold text-slate-900">FixmyCity</h1>
           </div>
           <div className="relative">
             <button 
               onClick={() => setShowNotifications(!showNotifications)}
               className="relative p-2 bg-slate-50 rounded-full text-slate-500 hover:text-primary transition-all border border-slate-100"
             >
                <Bell size={20} />
                {recentUpdates.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
             </button>
             
             {showNotifications && (
               <div className="fixed top-16 right-4 left-4 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                 <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-slate-800">Recent Status Updates</h3>
                   <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                 </div>
                 <div className="max-h-64 overflow-y-auto">
                   {recentUpdates.length === 0 ? (
                     <div className="p-4 text-center text-sm text-slate-500">No recent updates</div>
                   ) : (
                     recentUpdates.map(update => (
                       <div key={update.complaint_id} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => { setShowNotifications(false); navigate('/track'); }}>
                         <p className="text-xs font-semibold text-slate-900 line-clamp-1">{update.category}</p>
                         <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-wider">{update.complaint_status.replace('_', ' ')}</p>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             )}
           </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 w-full overflow-y-auto pb-24 md:pb-8 relative scroll-smooth">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.3, ease: "easeOut" }}
               className="h-full relative max-w-[1600px] mx-auto w-full md:px-8"
             >
                <Outlet />
             </motion.div>
           </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation (Glassmorphism) */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200/50 md:hidden z-50 pb-safe">
        <div className="flex justify-around items-center h-[72px] px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div 
                     animate={{ y: isActive ? -4 : 0 }}
                     transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                     <item.icon strokeWidth={isActive ? 2.5 : 2} size={isActive? 26 : 24} />
                  </motion.div>
                  {isActive && (
                    <motion.span 
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="text-[10px] font-bold absolute bottom-2"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && (
                     <motion.div 
                        layoutId="indicator"
                        className="absolute -top-[1px] w-12 h-1 bg-gradient-to-r from-primary to-primary-light rounded-b-full shadow-[0_4px_12px_rgba(37,99,235,0.5)]" 
                     />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
