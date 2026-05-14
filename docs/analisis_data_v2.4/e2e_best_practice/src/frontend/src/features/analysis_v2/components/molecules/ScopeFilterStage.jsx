import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useContextLockStore, useAnalysisStore } from '../../../../store/analysisStore';
import { 
  executeAnalysisAsync, 
  executeAnalysisSync, 
  getNormalizationStatus, 
  getLatestDataTime, 
  getAnalysisInterfaces,
  getSpeedStats,
  getResourceReports,
  getClientStats,
  getInterfaceReports,
  getPPPoEReports,
  getHotspotReports,
  getBoards
} from '../../../../services/api';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Play,
  Layers,
  Calendar,
  Activity,
  RotateCcw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import QuickDatePicker from './QuickDatePicker';
import { Clock } from 'lucide-react';
import { mapAnalysisResponseToStages } from '../../utils/mapAnalysisResponse';

/**
 * Molecule: ScopeFilterStage
 * Menangani Stage 1: Scope & Filter (Context Lock) dan inisialisasi pipeline.
 * Bermigrasi ke Atomic Design.
 */
const ScopeFilterStage = () => {
  // Global State (Zustand)
  const { 
    selectedBoardId, 
    setSelectedBoardId, 
    selectedInterfaceName,
    setSelectedInterfaceName,
    timeRange, 
    setTimeRange, 
    granularity, 
    setGranularity,
    isLocked,
    setLocked,
    resetFilters
  } = useContextLockStore();

  const { 
    setNormalizationStatus, 
    setTaskStatus,
    setCurrentTaskId,
    setScopedMetadata,
    resetAnalysis,
    taskStatus,
    setError,
    setAnalysisData,
    setProgress,
    setCurrentStage
  } = useAnalysisStore();

  const [preFlightStatus, setPreFlightStatus] = useState('IDLE'); // 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILURE'
  const [validationErrors, setValidationErrors] = useState([]);
  const [selectedSsotSource, setSelectedSsotSource] = useState('');
  // Fetch Boards
  // UPDATE 2.4.1 Sinkronisasi Naming Convention (camelCase)
  const { data: boardsData = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(),
    staleTime: 5 * 60 * 1000,
  });

  const boards = Array.isArray(boardsData) ? boardsData : (boardsData?.items || []);

  const { data: interfacesData = [], isLoading: isLoadingInterfaces } = useQuery({
    queryKey: ['analysis-interfaces', selectedBoardId],
    queryFn: () => getAnalysisInterfaces(selectedBoardId, { activeOnly: true, primaryOnly: false }),
    enabled: !!selectedBoardId,
    staleTime: 60 * 1000,
  });

  const interfaces = Array.isArray(interfacesData)
    ? interfacesData
    : interfacesData || [];

  const {
    data: latestData,
    isLoading: isLoadingLatest,
    refetch: refetchLatest,
    error: latestError,
  } = useQuery({
    queryKey: ['latestData', selectedBoardId],
    queryFn: () => getLatestDataTime(selectedBoardId),
    enabled: !!selectedBoardId,
    staleTime: 60 * 1000,
  });

  const latestTime =
    latestData?.latest_data_time || latestData?.latestDataTime || null;

  const hasValidRange = Boolean(timeRange.start && timeRange.end);

  const {
    data: ssotDataRaw = [],
    isLoading: isLoadingSsot,
    error: ssotError,
  } = useQuery({
    queryKey: ['ssot-data', selectedBoardId, selectedSsotSource, timeRange.start, timeRange.end],
    queryFn: async () => {
      if (!selectedBoardId || !selectedSsotSource || !hasValidRange) return [];
      const start = timeRange.start || null;
      const end = timeRange.end || null;
      if (selectedSsotSource === 'speed') {
        return getSpeedStats(selectedBoardId, 30, start, end);
      }
      if (selectedSsotSource === 'resource') {
        return getResourceReports(selectedBoardId, 30, start, end);
      }
      if (selectedSsotSource === 'clients') {
        return getClientStats(selectedBoardId, 200, start, end);
      }
      if (selectedSsotSource === 'usage') {
        return getInterfaceReports(selectedBoardId, 100, start, end);
      }
      if (selectedSsotSource === 'pppoe') {
        return getPPPoEReports(selectedBoardId, 100, start, end);
      }
      if (selectedSsotSource === 'hotspot') {
        return getHotspotReports(selectedBoardId, 100, start, end);
      }
      return [];
    },
    enabled: !!selectedBoardId && !!selectedSsotSource && hasValidRange,
    refetchInterval: 30000,
    staleTime: 15000,
    keepPreviousData: true,
  });

  const ssotOptions = [
    { value: 'speed', label: 'Speed Stats (board_speed_stats)' },
    { value: 'resource', label: 'Resource Stats (board_resource_stats)' },
    { value: 'clients', label: 'Client Stats (board_client_stats)' },
    { value: 'usage', label: 'Interface Usage (board_usage_stats)' },
    { value: 'pppoe', label: 'PPPoE Usage (board_pppoe_usage)' },
    { value: 'hotspot', label: 'Hotspot Usage (hotspot_usage_raw)' },
  ];

  const normalizeNumber = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return n;
  };

  const ssotSummary = useMemo(() => {
    if (!Array.isArray(ssotDataRaw) || ssotDataRaw.length === 0) return null;
    const first = ssotDataRaw[0];
    if (!first) return null;
    if (selectedSsotSource === 'speed') {
      const down = normalizeNumber(first.downloadMbps ?? first.download_mbps).toFixed(2);
      const up = normalizeNumber(first.uploadMbps ?? first.upload_mbps).toFixed(2);
      return {
        title: 'Speed',
        line1: `Down: ${down} Mbps`,
        line2: `Up: ${up} Mbps`,
        timestamp: first.logTime || first.logDate || null,
      };
    }
    if (selectedSsotSource === 'resource') {
      const cpu = normalizeNumber(first.cpuLoad ?? first.cpu_load);
      const mem = normalizeNumber(first.freeMemory ?? first.free_memory);
      const hdd = normalizeNumber(first.freeHdd ?? first.free_hdd);
      return {
        title: 'Resource',
        line1: `CPU: ${cpu}%`,
        line2: `Free RAM: ${mem} MiB, Free HDD: ${hdd} MiB`,
        timestamp: first.logTime || null,
      };
    }
    if (selectedSsotSource === 'clients') {
      const total = normalizeNumber(first.totalActive ?? first.total_active);
      const pppoe = normalizeNumber(first.totalPppoe ?? first.total_pppoe);
      const hotspot = normalizeNumber(first.totalHotspot ?? first.total_hotspot);
      return {
        title: 'Clients',
        line1: `Total Active: ${total}`,
        line2: `PPPoE: ${pppoe}, Hotspot: ${hotspot}`,
        timestamp: first.logTime || null,
      };
    }
    if (selectedSsotSource === 'usage') {
      const targetName = selectedInterfaceName || null;
      const sourceRow = targetName
        ? ssotDataRaw.find((row) => (row.interfaceName || row.interface_name) === targetName) || first
        : first;
      const rx = normalizeNumber(sourceRow.totalRxBytes ?? sourceRow.total_rx_bytes);
      const tx = normalizeNumber(sourceRow.totalTxBytes ?? sourceRow.total_tx_bytes);
      return {
        title: 'Interface Usage',
        line1: `RX: ${rx.toLocaleString('id-ID')} bytes`,
        line2: `TX: ${tx.toLocaleString('id-ID')} bytes`,
        timestamp: sourceRow.logDate || null,
      };
    }
    if (selectedSsotSource === 'pppoe') {
      const count = Array.isArray(ssotDataRaw) ? ssotDataRaw.length : 0;
      const sample = ssotDataRaw[0] || {};
      const user = sample.pppoeUsername || sample.pppoe_username || null;
      return {
        title: 'PPPoE Usage',
        line1: `Rows: ${count}`,
        line2: user ? `Contoh user: ${user}` : 'Tidak ada data user',
        timestamp: sample.logDate || null,
      };
    }
    if (selectedSsotSource === 'hotspot') {
      const count = Array.isArray(ssotDataRaw) ? ssotDataRaw.length : 0;
      const sample = ssotDataRaw[0] || {};
      const user = sample.username || null;
      return {
        title: 'Hotspot Usage',
        line1: `Rows: ${count}`,
        line2: user ? `Contoh user: ${user}` : 'Tidak ada data user',
        timestamp: sample.logDate || null,
      };
    }
    return null;
  }, [selectedSsotSource, ssotDataRaw, selectedInterfaceName]);

  useEffect(() => {
    if (!latestError) return;
    const msg =
      latestError?.response?.data?.detail || 'Gagal mengambil info data terbaru';
    setError(msg);
    toast.error(msg);
  }, [latestError, setError]);

  useEffect(() => {
    if (!latestTime) return;
    if (timeRange.start && timeRange.end) return;
    const end = new Date(latestTime);
    const start = new Date(latestTime);
    start.setDate(end.getDate() - 1);
    const formatDate = (date) => date.toLocaleDateString('sv-SE');
    setTimeRange({
      start: `${formatDate(start)}T00:00:00`,
      end: `${formatDate(end)}T23:59:59`,
    });
  }, [latestTime, timeRange.start, timeRange.end, setTimeRange]);

  const validateParams = () => {
    const errors = [];
    if (!selectedBoardId) errors.push('Board belum dipilih');
    if (!timeRange.start) errors.push('Waktu mulai belum diatur');
    if (!timeRange.end) errors.push('Waktu selesai belum diatur');
    if (timeRange.start && timeRange.end) {
      const startTs = Date.parse(timeRange.start);
      const endTs = Date.parse(timeRange.end);
      if (!Number.isNaN(startTs) && !Number.isNaN(endTs) && startTs > endTs) {
        errors.push('Waktu mulai tidak boleh lebih besar dari waktu selesai');
      }
    }
    if (selectedInterfaceName) {
      const validNames = interfaces.map((iface) => iface.interfaceName || iface.interface_name);
      if (!validNames.includes(selectedInterfaceName)) {
        errors.push('Interface yang dipilih tidak valid untuk router ini');
      }
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleManualRun = async () => {
    if (!validateParams()) return;
    if (taskStatus === 'PENDING' || taskStatus === 'STARTED' || taskStatus === 'PROGRESS') {
      toast.error('Analisis sedang berjalan...');
      return;
    }
    if (preFlightStatus !== 'SUCCESS') {
      const preflightOk = await runPreFlight();
      if (!preflightOk) return;
    }
    try {
      setTaskStatus('PENDING');
      setError(null);
      const payload = {
        boardId: selectedBoardId,
        interfaceName: selectedInterfaceName,
        startTime: timeRange.start,
        endTime: timeRange.end,
        granularity: granularity
      };
      setScopedMetadata(payload);
      setLocked(true);
      toast.loading('Menjalankan pipeline secara manual tanpa queue...', { id: 'analysis-manual' });
      const result = await executeAnalysisSync(payload);
      const mapped = mapAnalysisResponseToStages(result);
      setAnalysisData(mapped);
      setTaskStatus('SUCCESS');
      setProgress(100);
      setCurrentStage('Completed');
      setLocked(false);
      toast.success('Analisis manual selesai.', { id: 'analysis-manual' });
    } catch (error) {
      console.error(error);
      setTaskStatus('FAILURE');
      const msg = error.response?.data?.detail || 'Gagal menjalankan analisis manual';
      setError(msg);
      setLocked(false);
      toast.error(msg, { id: 'analysis-manual' });
    }
  };

  const runPreFlight = async () => {
    if (!validateParams()) return false;

    try {
      setPreFlightStatus('PENDING');
      setError(null);
      setValidationErrors([]);
      
      // Step 1: Check Normalization (Stage 0)
      const status = await getNormalizationStatus(
        selectedBoardId, 
        timeRange.start, 
        timeRange.end,
        selectedInterfaceName // V2.4.1: Pass interface name
      );
      setNormalizationStatus(status);
      
      if (status.accuracyPct < 100) {
        toast.error(`Kualitas data rendah (${status.accuracyPct}%)`, { icon: '⚠️' });
        // We still allow success but with warning
      }
      setPreFlightStatus('SUCCESS');
      toast.success('Pre-flight berhasil. Pipeline siap dijalankan.');
      return true;
    } catch (err) {
      console.error('[PreFlight Error]', err);
      const msg = err.response?.data?.detail || 'Gagal menjalankan pre-flight validation';
      setPreFlightStatus('FAILURE');
      setError(msg);
      toast.error(msg);
      return false;
    }
  };

  const handleLockAndRun = async () => {
    if (!validateParams()) return;
    
    // V2.4.1 Hardening: Ensure we don't start multiple tasks
    if (taskStatus === 'PENDING' || taskStatus === 'STARTED') {
      toast.error('Analisis sedang berjalan...');
      return;
    }

    // Auto run pre-flight if not done or failed
    if (preFlightStatus !== 'SUCCESS') {
      const preflightOk = await runPreFlight();
      if (!preflightOk) return;
    }

    try {
      setTaskStatus('PENDING');
      const payload = {
        boardId: selectedBoardId,
        interfaceName: selectedInterfaceName, // V2.4.1: Pass interface name
        startTime: timeRange.start,
        endTime: timeRange.end,
        granularity: granularity
      };
      
      const { taskId } = await executeAnalysisAsync(payload);
      setCurrentTaskId(taskId);
      setScopedMetadata(payload); // Store for other stages (Context Lock V2.1)
      setLocked(true); // Context Lock (P0)
      toast.loading('Menjalankan pipeline analisis...', { id: 'analysis-task' });
    } catch (error) {
      console.error(error);
      setTaskStatus('FAILURE');
      const msg = error.response?.data?.detail || 'Gagal memulai analisis';
      setError(msg);
      toast.error(msg, { id: 'analysis-task' });
    }
  };

  const handleUnlock = () => {
    setLocked(false);
    resetAnalysis();
    setPreFlightStatus('IDLE');
    toast.success('Konteks dibuka kembali');
  };

  const handleReset = () => {
    resetFilters();
    resetAnalysis();
    setPreFlightStatus('IDLE');
    setValidationErrors([]);
    toast.success('Filter dikembalikan ke default');
  };

  const setPresetRange = useCallback((preset) => {
    if (isLocked) return;
    
    const anchor = latestTime ? new Date(latestTime) : new Date();
    const end = new Date(anchor);
    const start = new Date(anchor);
    
    switch (preset) {
      case 'last_day':
        start.setDate(end.getDate() - 1);
        break;
      case 'last_7_days':
        start.setDate(end.getDate() - 7);
        break;
      case 'last_month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'last_60_days':
        start.setDate(end.getDate() - 60);
        break;
      case 'last_year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        return;
    }
    
    const formatDate = (date) => date.toLocaleDateString('sv-SE');
    
    setTimeRange({
      start: `${formatDate(start)}T00:00:00`,
      end: `${formatDate(end)}T23:59:59`
    });
    
    const label = latestTime ? 'Data Terakhir' : 'Waktu Sekarang';
    toast.success(`Range waktu diatur ke ${preset.replace(/_/g, ' ')} (relatif terhadap ${label})`, {
      icon: '📅',
      duration: 3000
    });
  }, [isLocked, latestTime, setTimeRange]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      {/* UPDATE 2.4.1 Fix overflow issue for DatePicker - Added rounded-t-xl */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-emerald-900 font-bold">Stage 1: Scope & Filter</h3>
            <p className="text-emerald-700 text-xs">Context Lock & Pipeline Entry</p>
          </div>
        </div>
        
        {isLocked ? (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-200">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">LOCKED</span>
            <button 
              onClick={handleUnlock}
              className="ml-2 p-1.5 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
              title="Unlock Context"
            >
              <Unlock className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
             <button 
              onClick={handleReset}
              className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Reset</span>
            </button>
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
              <Unlock className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">UNLOCKED</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label 
            htmlFor="router-select"
            className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-3 h-3" />
            Target Router
          </label>
          <select 
            id="router-select"
            name="router-select"
            disabled={isLocked}
            value={selectedBoardId || ''}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedBoardId(id);
              setSelectedInterfaceName(null);
              if (id) refetchLatest();
            }}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:ring-0 transition-all disabled:opacity-50"
          >
            <option value="">Pilih Router...</option>
            {boards.length > 0 ? (
              boards.map(b => (
                <option key={b.boardId} value={b.boardId}>{b.boardName} ({b.ipAddress})</option>
              ))
            ) : (
              <option disabled>Memuat data router...</option>
            )}
          </select>
          
          {selectedBoardId && (
            <div className="flex items-center gap-2 px-1">
              <div className={`w-1.5 h-1.5 rounded-full ${latestTime ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                {isLoadingLatest ? 'Fetching status...' : (
                  latestTime 
                    ? `Last Data: ${new Date(latestTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
                    : 'No data found'
                )}
              </span>
              {latestTime && (
                <button 
                  onClick={() => refetchLatest()}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Refresh status"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="target-interface-select"
            className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
          >
            <Activity className="w-3 h-3" />
            Target Interface
          </label>
          <select 
            id="target-interface-select"
            name="target-interface-select"
            disabled={isLocked || !selectedBoardId || isLoadingInterfaces}
            value={selectedInterfaceName || ''}
            onChange={(e) => setSelectedInterfaceName(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:ring-0 transition-all disabled:opacity-50"
          >
            <option value="">Semua Interface (Bercampur)</option>
            {interfaces.length > 0 ? (
              interfaces.map((iface) => {
                const name = iface.interfaceName || iface.interface_name;
                const label = iface.interfaceLabel || iface.interface_label;
                if (!name) return null;
                return (
                <option
                  key={name}
                  value={name}
                >
                  {label || name}
                </option>
                );
              })
            ) : (
              selectedBoardId ? (
                isLoadingInterfaces ? (
                  <option disabled>Memuat interface...</option>
                ) : (
                  <option disabled>Tidak ada interface ditemukan</option>
                )
              ) : (
                <option disabled>Pilih router terlebih dahulu</option>
              )
            )}
          </select>
          {selectedInterfaceName && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                Filtering by: {selectedInterfaceName}
              </span>
            </div>
          )}
        </div>

        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Audit Range
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-300" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Presets</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              disabled={isLocked}
              onClick={() => setPresetRange('last_day')}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              Last Day
            </button>
            <button 
              disabled={isLocked}
              onClick={() => setPresetRange('last_7_days')}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              Last 7 Days
            </button>
            <button 
              disabled={isLocked}
              onClick={() => setPresetRange('last_month')}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              Last Month
            </button>
            <button 
              disabled={isLocked}
              onClick={() => setPresetRange('last_60_days')}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              Last 60 Days
            </button>
            <button 
              disabled={isLocked}
              onClick={() => setPresetRange('last_year')}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              Last Year
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-50">
            <QuickDatePicker label="Mulai" type="start" />
            <QuickDatePicker label="Selesai" type="end" side="top" />
          </div>
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="granularity-select"
            className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            Time Granularity
          </label>
          <select 
            id="granularity-select"
            name="granularity-select"
            disabled={isLocked}
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-500 transition-all disabled:opacity-50"
          >
            <option value="auto">Auto (Recommended)</option>
            <option value="hour">Hourly (High Detail)</option>
            <option value="day">Daily (Trend)</option>
            <option value="month">Monthly (Overview)</option>
          </select>
        </div>
      </div>

      <div className="px-6 pb-6 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-3 h-3" />
            SSOT Data Source
          </span>
          {selectedSsotSource && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Realtime preview
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <select
              id="ssot-source-select"
              name="ssot-source-select"
              disabled={isLocked || !selectedBoardId}
              value={selectedSsotSource}
              onChange={(e) => setSelectedSsotSource(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:ring-0 transition-all disabled:opacity-50"
            >
              <option value="">Pilih sumber data...</option>
              {ssotOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {!selectedBoardId && (
              <p className="text-[10px] text-slate-400 font-medium">
                Pilih router terlebih dahulu untuk melihat data SSOT.
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 h-full flex flex-col justify-center">
              {!selectedSsotSource && (
                <p className="text-xs text-slate-400">
                  Pilih salah satu sumber data SSOT untuk melihat ringkasan realtime uplink dan interface.
                </p>
              )}
              {selectedSsotSource && !hasValidRange && (
                <p className="text-xs text-amber-600">
                  Atur rentang waktu audit terlebih dahulu agar data SSOT dapat difilter dengan benar.
                </p>
              )}
              {selectedSsotSource && hasValidRange && isLoadingSsot && (
                <p className="text-xs text-slate-500">
                  Memuat data dari sumber SSOT terpilih...
                </p>
              )}
              {selectedSsotSource && hasValidRange && ssotError && (
                <p className="text-xs text-rose-600">
                  Gagal mengambil data dari sumber SSOT. Periksa koneksi atau coba lagi.
                </p>
              )}
              {selectedSsotSource && hasValidRange && !isLoadingSsot && !ssotError && !ssotSummary && (
                <p className="text-xs text-slate-400">
                  Tidak ada data yang tersedia untuk kombinasi router, interface, dan rentang waktu saat ini.
                </p>
              )}
              {selectedSsotSource && hasValidRange && ssotSummary && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1">
                    {ssotSummary.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {ssotSummary.line1}
                  </p>
                  <p className="text-xs text-slate-600">
                    {ssotSummary.line2}
                  </p>
                  {ssotSummary.timestamp && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Snapshot: {new Date(ssotSummary.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 rounded-b-xl">
        <div className="flex-1">
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-2 text-rose-500 text-xs font-bold animate-in fade-in slide-in-from-left-2">
              <AlertCircle className="w-4 h-4" />
              {validationErrors[0]}
            </div>
          )}
          {preFlightStatus === 'SUCCESS' && !isLocked && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold animate-in fade-in slide-in-from-left-2">
              <CheckCircle2 className="w-4 h-4" />
              Pre-flight check passed. Dataset materialization ready.
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isLocked && (
            <>
              <button 
                onClick={runPreFlight}
                disabled={preFlightStatus === 'PENDING'}
                className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {preFlightStatus === 'PENDING' ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                Run Pre-Flight
              </button>

              <button 
                onClick={handleLockAndRun}
                disabled={['PENDING', 'STARTED', 'PROGRESS'].includes(taskStatus)}
                className="flex-1 md:flex-none px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {['PENDING', 'STARTED', 'PROGRESS'].includes(taskStatus) ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Run Pipeline (Queue)
              </button>

              <button 
                onClick={handleManualRun}
                disabled={['PENDING', 'STARTED', 'PROGRESS'].includes(taskStatus)}
                className="flex-1 md:flex-none px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {['PENDING', 'STARTED', 'PROGRESS'].includes(taskStatus) ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Run Manual (Tanpa Polling)
              </button>
            </>
          )}
          
          {isLocked && (
            <div className="flex items-center gap-4 text-slate-400">
               <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-tighter">Analysis in Progress...</span>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <button 
                onClick={handleUnlock}
                className="text-[10px] font-black uppercase tracking-tighter text-rose-500 hover:underline"
              >
                Abort & Unlock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScopeFilterStage;
