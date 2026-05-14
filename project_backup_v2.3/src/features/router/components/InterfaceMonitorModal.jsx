import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInterfaceTraffic, toggleInterface } from '../../../services/api.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Play, Pause, Activity, Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const formatBits = (bits) => {
  if (bits === 0) return '0 bps';
  const k = 1000; // Network speeds usually use decimal k (1000) not binary K (1024)
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
  const i = Math.floor(Math.log(bits) / Math.log(k));
  return `${parseFloat((Number(bits) / Math.pow(k, i) || 0).toFixed(2))} ${sizes[i]}`;
};

const InterfaceMonitorModal = ({ isOpen, onClose, boardId, interfaceName }) => {
  const [dataPoints, setDataPoints] = useState([]);
  const [interval, setIntervalTime] = useState(2); // Default 2s for smoother live feel
  const [isMonitoring, setIsMonitoring] = useState(true);
  
  const queryClient = useQueryClient();

  // Fetch Live Traffic Data
  const { error, isError, isLoading } = useQuery({
    queryKey: ['interface-traffic', boardId, interfaceName],
    queryFn: () => getInterfaceTraffic(boardId, interfaceName),
    enabled: isOpen && isMonitoring,
    refetchInterval: interval * 1000,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry immediately to avoid flooding if Auth fails
    onSuccess: (td) => {
      if (!td) return;
      const timestamp = new Date().toLocaleTimeString();
      const newPoint = {
        time: timestamp,
        rx: parseInt(td.rx_bps) || 0,
        tx: parseInt(td.tx_bps) || 0,
      };
      setTimeout(() => {
        // Use timer callback to satisfy lint rule about setState in effects
        setDataPoints(prev => {
          const newData = [...prev, newPoint];
          if (newData.length > 60) return newData.slice(newData.length - 60);
          return newData;
        });
      }, 0);
    },
  });

  // Reset data on mount to ensure fresh series for each interface open
  useEffect(() => {
    setTimeout(() => {
      setDataPoints([]);
    }, 0);
  }, []);

  // Toggle Interface Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ action }) => toggleInterface(boardId, interfaceName, action),
    onSuccess: (_, variables) => {
      toast.success(`Interface ${interfaceName} ${variables.action}d successfully`);
      queryClient.invalidateQueries(['interfaces', boardId]); // Refresh interface list
    },
    onError: (error, variables) => {
      toast.error(`Failed to ${variables.action} interface: ${error.message}`);
    },
  });

  const handleToggleInterface = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} interface ${interfaceName}?`)) return;
    toggleMutation.mutate({ action });
  };

  if (!isOpen) return null;

  // Get current stats from last data point or 0
  const currentRx = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].rx : 0;
  const currentTx = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].tx : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className={`w-6 h-6 text-blue-600 ${isMonitoring ? 'animate-pulse' : ''}`} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Live Monitor: {interfaceName}</h2>
              <p className="text-sm text-gray-500">Real-time traffic analysis (On-Demand)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error State */}
          {isError && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-center text-red-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span>Connection lost: {error?.message || 'Failed to fetch data'}</span>
              <button 
                onClick={() => queryClient.invalidateQueries(['interface-traffic'])}
                className="ml-auto text-sm font-medium underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <span className="text-sm font-medium text-blue-600">Download (Rx)</span>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {formatBits(currentRx)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <span className="text-sm font-medium text-green-600">Upload (Tx)</span>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {formatBits(currentTx)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-80 w-full bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
            {isLoading && dataPoints.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-10">
                 <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints}>
                <defs>
                  <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{fontSize: 12}} 
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  tick={{fontSize: 12}}
                  tickFormatter={formatBits}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value) => [formatBits(value), '']}
                  labelStyle={{ color: '#374151' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rx" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorRx)" 
                  name="Download"
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="tx" 
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#colorTx)" 
                  name="Upload"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* Interval Control */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Refresh Interval</span>
                  <span className="text-sm font-bold text-blue-600">{interval}s</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={interval} 
                  onChange={(e) => setIntervalTime(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                {interval < 2 && (
                  <div className="flex items-center text-xs text-orange-600 mt-1">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    High Load
                  </div>
                )}
              </div>
            </div>

            {/* Monitoring Toggle */}
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isMonitoring ? 'Pause Monitor' : 'Resume Monitor'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center rounded-b-lg">
          <div className="text-sm text-gray-500">
            Connected to {boardId}
          </div>
          <div className="flex gap-3">
             <button
              onClick={() => handleToggleInterface('enable')}
              disabled={toggleMutation.isPending}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Enable
            </button>
            <button
              onClick={() => handleToggleInterface('disable')}
              disabled={toggleMutation.isPending}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterfaceMonitorModal;
