import React, { useMemo, useState } from 'react';
import { 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  format, 
  isAfter, 
  subMonths
} from 'date-fns';
import { Calendar, RefreshCcw, Filter, AlertCircle } from 'lucide-react';
import { validateFilterParams } from '../analysis_utils.jsx';

/**
 * Global controls for period selection, limit, and comparison.
 */
const GlobalControls = ({ 
  period, setPeriod, 
  limit, setLimit, 
  pivotAgg, setPivotAgg,
  activeTab,
  startDate, setStartDate,
  endDate, setEndDate,
  comparePrev, setComparePrev, 
  aggMethod, setAggMethod,
  bucketSource, setBucketSource,
  granularity, setGranularity,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges
}) => {
  const hasDateRange = startDate && endDate;
  const [presetValue, setPresetValue] = useState('');
  const showPivotAgg = ['interfaces', 'pppoe', 'hotspot', 'clients'].includes(activeTab);
  const showGranularity = granularity !== undefined;

  // Global Validation
  const validation = useMemo(() => {
    return validateFilterParams({ startDate, endDate, period, limit });
  }, [startDate, endDate, period, limit]);

  const canUseAggMethod = period === 'daily' && typeof setAggMethod === 'function';

  const applyPreset = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        if (period === 'monthly') {
          start = startOfMonth(today);
          end = endOfMonth(today);
        } else {
          start = today;
          end = today;
        }
        break;
      case 'yesterday':
        if (period === 'monthly') {
          const lastMonth = subMonths(today, 1);
          start = startOfMonth(lastMonth);
          end = endOfMonth(lastMonth);
        } else {
          start = subDays(today, 1);
          end = subDays(today, 1);
        }
        break;
      case 'last7':
        start = period === 'monthly' ? startOfMonth(subMonths(today, 6 - 1)) : subDays(today, 6);
        end = period === 'monthly' ? endOfMonth(today) : today;
        break;
      case 'last30':
        start = period === 'monthly' ? startOfMonth(subMonths(today, 12 - 1)) : subDays(today, 29);
        end = period === 'monthly' ? endOfMonth(today) : today;
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth': {
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      default:
        return;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    // When range is set, limit is usually ignored by backend
  };

  const handleDateChange = (type, val) => {
    // Adapt for monthly period: coerce to start/end of month
    let finalVal = val;
    if (period === 'monthly') {
      try {
        const base = new Date(val.length === 7 ? `${val}-01` : val);
        if (type === 'start') {
          finalVal = format(startOfMonth(base), 'yyyy-MM-dd');
        } else {
          finalVal = format(endOfMonth(base), 'yyyy-MM-dd');
        }
      } catch {
        finalVal = val;
      }
    }
    if (type === 'start') {
      if (endDate && isAfter(new Date(finalVal), new Date(endDate))) {
        setEndDate(finalVal);
      }
      setStartDate(finalVal);
    } else {
      if (startDate && isAfter(new Date(startDate), new Date(finalVal))) {
        setStartDate(finalVal);
      }
      setEndDate(finalVal);
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-6">
      {/* Global Validation Errors */}
      {!validation.isValid && (
        <div className="flex flex-col gap-1 px-4 py-2 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          {validation.errors.map((err, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-bold text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-top duration-300">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1 rounded-lg">
            <span className="text-[10px] font-black text-gray-400 uppercase ml-1">Periode:</span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${period === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                setPeriod('daily');
                if (!hasDateRange) setLimit(14);
              }}
            >
              Harian
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${period === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => {
                setPeriod('monthly');
                if (!hasDateRange) setLimit(6);
              }}
            >
              Bulanan
            </button>
            </div>
          </div>

          {/* Aggregation Selector (Only for Daily) */}
          {canUseAggMethod && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1 rounded-lg">
              <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Agregasi:</span>
              <div className="flex gap-1">
                {['AVG', 'MAX', 'SUM', 'MIN'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setAggMethod && setAggMethod(m)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                      aggMethod === m 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data Source Selector */}
          {typeof setBucketSource === 'function' && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1 rounded-lg">
              <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Sumber:</span>
              <div className="flex gap-1">
                {[
                  { key: 'frontend', label: 'Frontend' },
                  { key: 'server', label: 'Server' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setBucketSource && setBucketSource(opt.key)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                      bucketSource === opt.key 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPivotAgg && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mode:</span>
              <select
                value={pivotAgg}
                onChange={(e) => setPivotAgg(e.target.value)}
                className="text-xs bg-transparent text-blue-700 font-bold outline-none cursor-pointer"
              >
                <option value="sum">TOTAL (SUM)</option>
                <option value="max">PUNCAK (MAX)</option>
                <option value="avg">RATA-RATA (AVG)</option>
              </select>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 hidden md:block" />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <select
              onChange={(e) => {
                const v = e.target.value;
                setPresetValue(v);
                applyPreset(v);
                setTimeout(() => setPresetValue(''), 0);
              }}
              value={presetValue}
              className="appearance-none pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-400 transition-colors"
            >
              <option value="" disabled>Rentang Cepat...</option>
              {period === 'monthly' ? (
                <>
                  <option value="thisMonth">Bulan Ini</option>
                  <option value="lastMonth">Bulan Lalu</option>
                  <option value="last7">6 Bulan Terakhir</option>
                  <option value="last30">12 Bulan Terakhir</option>
                </>
              ) : (
                <>
                  <option value="today">Hari Ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="last7">7 Hari Terakhir</option>
                  <option value="last30">30 Hari Terakhir</option>
                  <option value="thisMonth">Bulan Ini</option>
                  <option value="lastMonth">Bulan Lalu</option>
                </>
              )}
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
            <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Tanggal:</span>
            <input 
              type={period === 'monthly' ? 'month' : 'date'}
              value={
                period === 'monthly'
                  ? (startDate ? startDate.slice(0, 7) : '')
                  : (startDate || '')
              }
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="px-2 py-1 text-xs bg-transparent text-gray-700 outline-none focus:text-blue-600 font-medium"
              title="Tanggal Mulai"
            />
            <span className="text-gray-400 font-bold">→</span>
            <input 
              type={period === 'monthly' ? 'month' : 'date'}
              value={
                period === 'monthly'
                  ? (endDate ? endDate.slice(0, 7) : '')
                  : (endDate || '')
              }
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="px-2 py-1 text-xs bg-transparent text-gray-700 outline-none focus:text-blue-600 font-medium"
              title="Tanggal Akhir"
            />
            {hasDateRange && (
              <button 
                onClick={() => { setStartDate(null); setEndDate(null); }}
                className="p-1 hover:bg-red-100 rounded-md transition-colors group"
                title="Reset Filter Tanggal"
              >
                <RefreshCcw className="w-3 h-3 text-red-400 group-hover:text-red-600 transition-colors" />
              </button>
            )}
          </div>

          {!hasDateRange && (
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <span className="text-[10px] font-black text-gray-400 uppercase ml-2">Limit:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 font-bold outline-none"
              >
                {period === 'monthly'
                  ? [6, 12, 24].map(v => (<option key={v} value={v}>{v} Bulan</option>))
                  : [7, 14, 30, 60, 90].map(v => (<option key={v} value={v}>{v} Hari</option>))
                }
              </select>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 hidden lg:block" />

        {showGranularity && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Granularitas:</span>
            <select
              value={granularity || 'auto'}
              onChange={(e) => setGranularity(e.target.value)}
              className="text-xs bg-transparent text-indigo-700 font-bold outline-none cursor-pointer"
            >
              <option value="auto">OTOMATIS (AI)</option>
              <option value="hour">PER JAM</option>
              <option value="day">PER HARI</option>
              <option value="week">PER MINGGU</option>
              <option value="month">PER BULAN</option>
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 ml-auto">
          <div className="flex items-center gap-4 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase">Opsi:</span>
            <label className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase cursor-pointer select-none hover:text-blue-600 transition-colors">
              <input 
                type="checkbox" 
                checked={autoApply} 
                onChange={(e) => setAutoApply(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" 
              />
              Auto Apply
            </label>

            <div className="w-px h-4 bg-gray-200" />

            <label className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase cursor-pointer select-none hover:text-blue-600 transition-colors">
              <input 
                type="checkbox" 
                checked={comparePrev} 
                onChange={(e) => setComparePrev(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" 
              />
              Bandingkan
            </label>
          </div>

          <div className="flex items-center gap-2">
            {hasPendingChanges && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-bold transition-all"
                title="Batalkan perubahan"
              >
                <RefreshCcw className="w-4 h-4" />
                Reset
              </button>
            )}

            <button
              onClick={applyFilters}
              disabled={!hasPendingChanges || !validation.isValid}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-md ${
                hasPendingChanges && validation.isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Filter className={`w-4 h-4 ${hasPendingChanges && validation.isValid ? 'animate-pulse' : ''}`} />
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple ChevronDown component for internal use if not imported
const ChevronDown = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default GlobalControls;
