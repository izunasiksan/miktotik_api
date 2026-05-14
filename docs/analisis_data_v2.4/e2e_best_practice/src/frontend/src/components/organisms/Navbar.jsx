import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, Bell, Search, Globe, Clock, User, Settings, Info, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import useAuth from '../../context/useAuth.js';

const Navbar = ({ toggleSidebar, isVisible, setIsVisible }) => {
  const { logout, user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, title: 'Anomali Trafik', message: 'Trafik router ID-JKT-01 meningkat tajam', time: '2 menit yang lalu', type: 'error' },
    { id: 2, title: 'Backup Berhasil', message: 'Konfigurasi semua router telah dibackup', time: '1 jam yang lalu', type: 'success' },
    { id: 3, title: 'ZTP Queue', message: '1 perangkat baru menunggu persetujuan', time: '3 jam yang lalu', type: 'info' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Logic pencarian global akan diintegrasikan di sini
  };

  return (
    <header className={`sticky top-0 z-20 flex flex-shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-all duration-300 overflow-hidden transform-gpu will-change-[transform] ${isVisible ? 'h-16 translate-y-0 opacity-100' : 'h-0 -translate-y-full opacity-0 pointer-events-none border-none'}`}>
      <div className="flex h-16 w-full items-center gap-x-4 sm:gap-x-6">
        {/* Sidebar Toggle (Mobile) */}
        <button 
          type="button" 
          className="-m-2.5 p-2.5 text-slate-700 lg:hidden hover:text-indigo-600 transition-colors" 
          onClick={toggleSidebar}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Separator Mobile */}
        <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true"></div>
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
          
          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari router, log, atau user..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </form>

          {/* Desktop Info (Center) */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Clock size={16} className="text-indigo-500" />
              <span className="text-xs font-mono font-medium">
                {format(currentTime, 'HH:mm:ss')}
              </span>
              <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-2 ml-1">
                {format(currentTime, 'dd MMM yyyy')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-x-3 lg:gap-x-4 ml-auto">
            {/* Hide Header Toggle */}
            <button 
              type="button" 
              onClick={() => setIsVisible(false)}
              className="hidden sm:flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all"
              title="Minimize Header"
            >
              <ChevronUp size={20} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                type="button" 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full transition-all relative ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900">Notifikasi</h3>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">3 Baru</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex gap-3">
                          <div className={`mt-1 p-1.5 rounded-lg ${n.type === 'error' ? 'bg-rose-50 text-rose-500' : n.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                            {n.type === 'error' ? <Info size={14} /> : n.type === 'success' ? <Globe size={14} /> : <Bell size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-medium">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 text-center border-t border-slate-50">
                    <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">Lihat Semua</button>
                  </div>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-200" aria-hidden="true"></div>

            {/* User Profile & Menu */}
            <div className="relative" ref={userMenuRef}>
              <div 
                className="flex items-center gap-3 pl-2 cursor-pointer group"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px] group-hover:text-indigo-600 transition-colors">
                    {user?.username || 'Guest'}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                    {user?.role || 'user'}
                  </p>
                </div>
                
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-indigo-50/50 group-hover:ring-indigo-100 transition-all">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-xs font-bold text-slate-900">{user?.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email || 'No email provided'}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <User size={14} className="text-slate-400" />
                      Profil Saya
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <Settings size={14} className="text-slate-400" />
                      Pengaturan Akun
                    </button>
                  </div>
                  <div className="border-t border-slate-50 mt-1 pt-1">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Keluar Sesi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
