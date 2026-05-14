import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBoardStats, getBoards, pingBoard } from '../services/api.js';
import { ArrowLeft, Activity, Cpu, HardDrive, Clock, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';
import InterfaceList from '../features/router/components/InterfaceList.jsx';
import RouterLogs from '../features/router/components/RouterLogs.jsx';
import BackupManager from '../features/router/components/BackupManager.jsx';
import PPPoEMonitor from '../features/router/components/PPPoEMonitor.jsx';
import HotspotMonitor from '../features/router/components/HotspotMonitor.jsx';
import HotspotAnalytics from '../features/router/components/HotspotAnalytics.jsx';
import VPNManager from '../features/router/components/VPNManager.jsx';

const RouterDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch all boards to find the current one (since we don't have getBoardById yet)
  const { data: boards, isLoading: isLoadingBoards } = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(),
  });

  const board = boards?.find(b => b.boardId === id);

  // Fetch stats for the specific board
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    isRefetching: isRefetchingStats,
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['boardStats', id],
    queryFn: () => getBoardStats(id),
    enabled: !!board, // Only fetch stats if board exists
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const handleRefresh = () => {
    refetchStats();
    toast.success("Refreshing stats...");
  };

  const handlePing = async () => {
    try {
        toast.loading('Pinging device...');
        const res = await pingBoard(id);
        toast.dismiss();
        if (res.isOnline) {
            toast.success(`Device is online! Latency: ${res.latency}ms`);
        } else {
            toast.error('Device is offline');
        }
        refetchStats(); // Refresh stats after ping
    } catch (error) {
        toast.dismiss();
        toast.error('Ping check failed');
        console.error(error);
    }
  };

  if (isLoadingBoards || (!!board && isLoadingStats)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600">Router Not Found</h2>
        <Link to="/boards" className="text-blue-500 hover:underline mt-4 block">
          Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link to="/boards" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{board.boardName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-gray-500">{board.ipAddress} | {board.mikrotikIdentity}</p>
                    {board.isOnline ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Online</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Offline</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <button 
            onClick={handleRefresh}
            disabled={isRefetchingStats}
            className={`p-2 rounded-full hover:bg-gray-200 transition-colors ${isRefetchingStats ? 'animate-spin' : ''}`}
            title="Refresh Stats"
        >
            <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {/* Historical Section */}
            <div className="flex space-x-4 border-r pr-4 border-gray-300">
                {['Overview', 'Logs', 'Backups'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`${
                            activeTab === tab.toLowerCase()
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex flex-col items-center`}
                    >
                        <span>{tab}</span>
                        {activeTab === tab.toLowerCase() && <span className="text-[10px] text-gray-400 font-normal">Historical</span>}
                    </button>
                ))}
            </div>

            {/* Live Management Section */}
            <div className="flex space-x-4">
                {['Interfaces', 'PPPoE', 'Hotspot', 'VPN'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`${
                            activeTab === tab.toLowerCase()
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex flex-col items-center`}
                    >
                        <span>{tab}</span>
                        {activeTab === tab.toLowerCase() && <span className="text-[10px] text-green-500 font-normal">Live</span>}
                    </button>
                ))}
            </div>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span><strong>Historical Data:</strong> Displaying polled statistics from database. Auto-refreshes every 10s.</span>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">CPU Load</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.cpuLoad || 0}%</p>
                        </div>
                        <Cpu className="w-8 h-8 text-blue-200" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Free Memory</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {(Number(stats?.freeMemory) / 1024 / 1024 || 0).toFixed(1)} MB
                            </p>
                        </div>
                        <Activity className="w-8 h-8 text-green-200" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Free HDD</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {(Number(stats?.freeHdd) / 1024 / 1024 || 0).toFixed(1)} MB
                            </p>
                        </div>
                        <HardDrive className="w-8 h-8 text-yellow-200" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Uptime</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.uptime || '-'}</p>
                        </div>
                        <Clock className="w-8 h-8 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* Quick Actions & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Device Information</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Model</span>
                            <span className="font-medium">{board.boardModel || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">RouterOS Version</span>
                            <span className="font-medium">{board.routerOsVersion || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Site Group</span>
                            <span className="font-medium">{board.siteGroup}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">API Port</span>
                            <span className="font-medium">{board.portApi}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">SSH Port</span>
                            <span className="font-medium">{board.portSsh || 22}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors text-blue-600">
                            <RefreshCw className="w-6 h-6 mb-2" />
                            <span className="text-sm font-medium">Reboot</span>
                        </button>
                        <button 
                            onClick={handlePing}
                            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors text-green-600"
                        >
                            <Activity className="w-6 h-6 mb-2" />
                            <span className="text-sm font-medium">Ping Check</span>
                        </button>
                        {/* Add more actions as needed */}
                    </div>
                </div>
            </div>
        </>
      )}

      {activeTab === 'interfaces' && (
        <>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                <span><strong>Live Management:</strong> Data is fetched directly from the device (On-Demand).</span>
            </div>
            <InterfaceList boardId={id} />
        </>
      )}
      {activeTab === 'logs' && (
        <>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span><strong>Historical Data:</strong> Displaying stored logs from database.</span>
            </div>
            <RouterLogs boardId={id} />
        </>
      )}
      {activeTab === 'backups' && (
        <>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span><strong>Historical Data:</strong> Displaying stored backups from database.</span>
            </div>
            <BackupManager boardId={id} />
        </>
      )}
      {activeTab === 'pppoe' && (
        <>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                <span><strong>Live Management:</strong> Data is fetched directly from the device (On-Demand).</span>
            </div>
            <PPPoEMonitor boardId={id} />
        </>
      )}
      {activeTab === 'hotspot' && (
        <>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                <span><strong>Live Management:</strong> Data is fetched directly from the device (On-Demand).</span>
            </div>
            <HotspotAnalytics boardId={id} />
            <HotspotMonitor boardId={id} />
        </>
      )}
      {activeTab === 'vpn' && (
        <>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-md mb-6 text-sm flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                <span><strong>Live Management:</strong> Data is fetched directly from the device (On-Demand).</span>
            </div>
            <VPNManager boardId={id} />
        </>
      )}
    </div>
  );
};

export default RouterDetail;
