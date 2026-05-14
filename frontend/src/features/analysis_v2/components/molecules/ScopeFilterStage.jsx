import React, { useState } from 'react';
import { useContextLockStore, useAnalysisStore } from '../../../../store/analysisStore';
import { executeAnalysisAsync, getNormalizationStatus } from '../../../../services/api';
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
  Info,
  RotateCcw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getBoards } from '../../../../services/api';
import toast from 'react-hot-toast';
import QuickDatePicker from './QuickDatePicker';
import { Clock } from 'lucide-react';

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
    taskStatus
  } = useAnalysisStore();

  const [preFlightStatus, setPreFlightStatus] = useState('IDLE'); // 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILURE'
  const [validationErrors, setValidationErrors] = useState([]);

  // Fetch Boards
  const { data: boardsData = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(),
  });

  const boards = Array.isArray(boardsData) ? boardsData : (boardsData?.items || []);

  const validateParams = () => {
    const errors = [];
    if (!selectedBoardId) errors.push('Board belum dipilih');
    if (!timeRange.start) errors.push('Waktu mulai belum diatur');
    if (!timeRange.end) errors.push('Waktu selesai belum diatur');
    if (timeRange.start && timeRange.end && new Date(timeRange.start) > new Date(timeRange.end)) {
      errors.push('Waktu mulai tidak boleh lebih besar dari waktu selesai');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const runPreFlight = async () => {
    if (!validateParams()) return;

    setPreFlightStatus('PENDING');
    try {
      // Step 1: Check Normalization (Stage 0)
      const status = await getNormalizationStatus(
        selectedBoardId, 
        timeRange.start, 
        timeRange.end
      );
      setNormalizationStatus(status);
      
      if (status.accuracy_pct < 100) {
        toast.error(`Kualitas data rendah (${status.accuracy_pct}%)`, { icon: '⚠️' });
        // We still allow success but with warning
      }
      
      setPreFlightStatus('SUCCESS');
      toast.success('Pre-flight check berhasil');
    } catch (err) {
      console.error(err);
      setPreFlightStatus('FAILURE');
      toast.error('Pre-flight check gagal');
    }
  };

  const handleLockAndRun = async () => {
    if (!validateParams()) return;
    
    // Auto run pre-flight if not done or failed
    if (preFlightStatus !== 'SUCCESS') {
      await runPreFlight();
    }

    try {
      setTaskStatus('PENDING');
      const payload = {
        boardId: selectedBoardId,
        startTime: timeRange.start,
        endTime: timeRange.end,
        granularity: granularity
      };
      
      const { task_id } = await executeAnalysisAsync(payload);
      setCurrentTaskId(task_id);
      setScopedMetadata(payload); // Store for other stages
      setLocked(true); // Context Lock (P0)
      toast.loading('Menjalankan pipeline analisis...', { id: 'analysis-task' });
    } catch (error) {
      console.error(error);
      setTaskStatus('FAILURE');
      toast.error('Gagal memulai analisis', { id: 'analysis-task' });
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

  const setPresetRange = (preset) => {
    if (isLocked) return;
    
    const end = new Date();
    const start = new Date();
    
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
      case 'last_year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        return;
    }
    
    // Format to YYYY-MM-DD for consistency with QuickDatePicker expectations
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    setTimeRange({
      start: `${formatDate(start)}T00:00:00`,
      end: `${formatDate(end)}T23:59:59`
    });
    
    toast.success(`Range waktu diatur ke ${preset.replace(/_/g, ' ')}`, {
      icon: '📅',
      duration: 2000
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
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

      {/* Body */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Board Selection */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Search className="w-3 h-3" />
            Target Router
          </label>
          <select 
            disabled={isLocked}
            value={selectedBoardId || ''}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:ring-0 transition-all disabled:opacity-50"
          >
            <option value="">Pilih Router...</option>
            {boards.length > 0 ? (
              boards.map(b => (
                <option key={b.board_id} value={b.board_id}>{b.name} ({b.ip_address})</option>
              ))
            ) : (
              <option disabled>Memuat data router...</option>
            )}
          </select>
        </div>

        {/* Time Range */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Audit Range
            </label>
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
              onClick={() => setPresetRange('last_year')}
              className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
            >
              Last Year
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-50">
            <QuickDatePicker label="Mulai" type="start" />
            <QuickDatePicker label="Selesai" type="end" />
          </div>
        </div>

        {/* Granularity */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-3 h-3" />
            Time Granularity
          </label>
          <select 
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

      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
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
                disabled={taskStatus === 'PENDING'}
                className="flex-1 md:flex-none px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {taskStatus === 'PENDING' ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Run Pipeline
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
