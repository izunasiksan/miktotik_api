import React, { useState } from 'react';
import { getDashboardSummary, getBoards } from '../services/api.js';
import { useQuery } from '@tanstack/react-query';
import { Activity, Server, AlertCircle, CheckCircle, RefreshCcw, FileText, ChevronRight, ShieldCheck } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import toast, { Toaster } from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [deviceFilter, setDeviceFilter] = useState('all');
  const { data: stats, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardSummary,
    refetchInterval: 30000,
  });

  const { data: boards = [], isLoading: isBoardsLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(),
  });

  // charts and historical analysis moved to /analysis

  if (isLoading || isBoardsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
     toast.error("Failed to load dashboard data");
  }

  const safeStats = stats || {
    total_boards: 0,
    online_boards: 0,
    offline_boards: 0,
    maintenance_boards: 0,
  };

  const filteredBoards = boards.filter(board => {
    if (deviceFilter === 'online') return board.is_online && !board.is_maintenance;
    if (deviceFilter === 'offline') return !board.is_online && !board.is_maintenance;
    if (deviceFilter === 'maintenance') return board.is_maintenance;
    return true;
  });

  const publicBoards = (boards || []).filter(b => b.is_public_review !== false);
  const siteGroups = (() => {
    const set = new Set();
    (boards || []).forEach(b => {
      if (b.site_group) set.add(b.site_group);
    });
    return Array.from(set).sort().slice(0, 12);
  })();
  const v1Local = (typeof window !== 'undefined') ? localStorage.getItem('enableAnalysisV1') : null;
  const v1Enabled = (import.meta.env && import.meta.env.VITE_ENABLE_ANALYSIS_V1 === 'false')
    ? false
    : (v1Local === 'false' ? false : true);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mr-2">
              Historical / Polled
            </span>
            Overview of your Mikrotik network infrastructure status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => refetch()} 
            isLoading={isRefetching}
          >
            <RefreshCcw className={`w-5 h-5 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>
      
      {/* Navigasi Berbasis Database */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/boards?status=all" className="block group">
          <StatCard 
            title="All (Public)"
            value={publicBoards.length}
            icon={Server}
            color="bg-indigo-600"
            className="group-hover:shadow-indigo-200"
          />
        </Link>
        <Link to="/boards?status=online" className="block group">
          <StatCard 
            title="Online" 
            value={safeStats.online_boards} 
            icon={CheckCircle} 
            color="bg-emerald-500"
          />
        </Link>
        <Link to="/boards?status=maintenance" className="block group">
          <StatCard 
            title="Maintenance" 
            value={safeStats.maintenance_boards} 
            icon={Activity} 
            color="bg-amber-500" 
          />
        </Link>
        <Link to="/boards?status=offline" className="block group">
          <StatCard 
            title="Offline" 
            value={safeStats.offline_boards} 
            icon={AlertCircle} 
            color="bg-rose-500" 
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card title="Navigasi" subtitle="Akses cepat berdasarkan data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {v1Enabled && (
              <Link to="/analysis">
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                  <p className="text-sm font-semibold text-slate-800">Analisis Histori</p>
                  <p className="text-xs text-slate-500 mt-1">Public devices: {publicBoards.length}</p>
                </div>
              </Link>
            )}
            <Link to="/reports">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                <p className="text-sm font-semibold text-slate-800">Reports</p>
                <p className="text-xs text-slate-500 mt-1">Generate & review reports</p>
              </div>
            </Link>
            <Link to="/automation">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                <p className="text-sm font-semibold text-slate-800">Automation</p>
                <p className="text-xs text-slate-500 mt-1">Tasks & workflows</p>
              </div>
            </Link>
            <Link to="/ztp">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                <p className="text-sm font-semibold text-slate-800">ZTP Queue</p>
                <p className="text-xs text-slate-500 mt-1">Zero‑Touch Provisioning</p>
              </div>
            </Link>
          </div>
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Site Group</p>
            {siteGroups.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada data site group.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {siteGroups.map(group => (
                  <Link key={group} to={`/boards?q=${encodeURIComponent(group)}`}>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                      {group}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions / Recent Card */}
        <div className="space-y-8">
            <Card title="Quick Actions">
              <div className="space-y-3">
                <Link to="/boards">
                    <Button variant="outline" className="w-full justify-start text-left">
                    <Server className="w-5 h-5 mr-2" />
                    Add New Device
                    </Button>
                </Link>
                <Link to="/reports">
                    <Button variant="outline" className="w-full justify-start text-left">
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Report
                    </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start text-left">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Security Audit
                </Button>
              </div>
            </Card>

            <Card title="Quick Device Access" subtitle="Access your routers instantly">
               <div className="space-y-4">
                  {/* Filter Tabs */}
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    {[
                      { id: 'all', label: 'All', color: 'text-slate-600', activeBg: 'bg-white' },
                      { id: 'online', label: 'Online', color: 'text-emerald-600', activeBg: 'bg-emerald-50' },
                      { id: 'maintenance', label: 'Maint.', color: 'text-orange-600', activeBg: 'bg-orange-50' },
                      { id: 'offline', label: 'Offline', color: 'text-rose-600', activeBg: 'bg-rose-50' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDeviceFilter(tab.id)}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                          deviceFilter === tab.id 
                            ? `${tab.activeBg} ${tab.color} shadow-sm ring-1 ring-inset ring-slate-200` 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                  {filteredBoards.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 italic">No devices found.</p>
                  ) : (
                      filteredBoards.slice(0, 5).map((board) => (
                          <Link 
                            key={board.board_id} 
                            to={`/boards/${board.board_id}`}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                              board.is_maintenance 
                                ? 'bg-orange-50 border-orange-100 hover:bg-orange-100 hover:border-orange-200 shadow-sm shadow-orange-100/20' 
                                : board.is_online 
                                  ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 shadow-sm shadow-emerald-100/20' 
                                  : 'bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200 shadow-sm shadow-rose-100/20'
                            }`}
                          >
                             <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg shadow-sm border transition-colors ${
                                  board.is_maintenance 
                                    ? 'bg-white border-orange-200 group-hover:border-orange-300' 
                                    : board.is_online 
                                      ? 'bg-white border-emerald-200 group-hover:border-emerald-300' 
                                      : 'bg-white border-rose-200 group-hover:border-rose-300'
                                }`}>
                                   <Server className={`w-5 h-5 transition-colors ${
                                     board.is_maintenance 
                                       ? 'text-orange-600 group-hover:text-orange-700' 
                                       : board.is_online 
                                         ? 'text-emerald-600 group-hover:text-emerald-700' 
                                         : 'text-rose-600 group-hover:text-rose-700'
                                   }`} />
                                </div>
                                <div>
                                   <p className={`text-sm font-bold transition-colors ${
                                     board.is_maintenance 
                                       ? 'text-orange-900 group-hover:text-orange-950' 
                                       : board.is_online 
                                         ? 'text-emerald-900 group-hover:text-emerald-950' 
                                         : 'text-rose-900 group-hover:text-rose-950'
                                   }`}>{board.board_name}</p>
                                   <div className="flex items-center gap-1.5 mt-0.5">
                                      <p className={`text-[10px] font-mono font-medium ${
                                        board.is_maintenance 
                                          ? 'text-orange-600/80' 
                                          : board.is_online 
                                            ? 'text-emerald-600/80' 
                                            : 'text-rose-600/80'
                                      }`}>{board.ip_address}</p>
                                      <span className={`h-1 w-1 rounded-full ${
                                        board.is_maintenance 
                                          ? 'bg-orange-400' 
                                          : board.is_online 
                                            ? 'bg-emerald-400 animate-pulse' 
                                            : 'bg-rose-400'
                                      }`} />
                                   </div>
                                </div>
                             </div>
                             <ChevronRight className={`w-5 h-5 transition-all group-hover:translate-x-0.5 ${
                               board.is_maintenance 
                                 ? 'text-orange-300 group-hover:text-orange-400' 
                                 : board.is_online 
                                   ? 'text-emerald-300 group-hover:text-emerald-400' 
                                   : 'text-rose-300 group-hover:text-rose-400'
                             }`} />
                          </Link>
                      ))
                  )}
                  {boards.length > 5 && (
                      <Link to="/boards" className="block text-center text-xs font-medium text-indigo-600 hover:text-indigo-700 pt-2 transition-colors">
                         View all devices
                      </Link>
                  )}
               </div>
            </div>
         </Card>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center italic">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
