import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  Settings, 
  FileText, 
  User, 
  ClipboardList, 
  X, 
  Play, 
  Radio, 
  Network,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import useAuth from '../../context/useAuth.js';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, isSidebarCollapsed, setIsSidebarCollapsed }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    return location.pathname === path 
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white transition-colors';
  };

  const historicalItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analysis-v2', label: 'Analysis V2', icon: BarChart2 },
    { path: '/reports', label: 'Reports', icon: FileText },
  ];
  const effectiveHistoricalItems = historicalItems;

  const liveItems = [
    { path: '/boards', label: 'Devices', icon: Server },
    { path: '/automation', label: 'Automation', icon: Play },
    { path: '/ztp', label: 'ZTP Queue', icon: Radio },
  ];

  const adminItems = [
    { path: '/users', label: 'Users', icon: User },
    { path: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} bg-slate-900 text-white transform transition-all duration-300 ease-in-out 
        lg:static lg:translate-x-0 border-r border-slate-800
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between h-20 ${isSidebarCollapsed ? 'px-4' : 'px-6'} bg-slate-900 border-b border-slate-800 transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Network className="w-6 h-6 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="transition-opacity duration-300">
                <h1 className="text-lg font-bold tracking-tight">Mikrotik Mgr</h1>
                <p className="text-xs text-slate-400 font-medium">Network Controller</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {/* Desktop Toggle Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'} py-6 space-y-8 overflow-y-auto no-scrollbar transition-all duration-300`}>
          {/* Historical Monitoring */}
          <div>
            {!isSidebarCollapsed && (
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 transition-opacity duration-300">
                Monitoring Historis
              </p>
            )}
            <div className="space-y-1">
              {effectiveHistoricalItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all ${isActive(item.path)}`}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <item.icon className={`${isSidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {!isSidebarCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Live Management */}
          <div>
            {!isSidebarCollapsed && (
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 transition-opacity duration-300">
                Live Management
              </p>
            )}
            <div className="space-y-1">
              {liveItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all ${isActive(item.path)}`}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <item.icon className={`${isSidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {!isSidebarCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Menu */}
          {user?.role === 'admin' && (
            <div>
              {!isSidebarCollapsed && (
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 transition-opacity duration-300">
                  Administration
                </p>
              )}
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all ${isActive(item.path)}`}
                    title={isSidebarCollapsed ? item.label : ''}
                  >
                    <item.icon className={`${isSidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {!isSidebarCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile & Logout (Bottom Sidebar) */}
        <div className={`p-4 border-t border-slate-800 bg-slate-900/50 transition-all duration-300`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-slate-800 flex-shrink-0">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 transition-opacity duration-300">
                <p className="text-sm font-medium text-white truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate capitalize">
                  {user?.role || 'Guest'}
                </p>
              </div>
            )}
          </div>
          <div className={`mt-3 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
            {isSidebarCollapsed ? (
              <button
                onClick={logout}
                title="Keluar"
                className="p-2 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/80 bg-slate-800 border border-slate-700 transition-colors"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-rose-600 bg-slate-800 border border-slate-700 hover:bg-rose-600 hover:text-white transition-colors"
              >
                <LogOut size={16} />
                Keluar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
