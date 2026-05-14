import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { Clock, Calendar, Users, Activity, AlertCircle, TrendingDown, UserMinus, Download, Zap } from 'lucide-react';
import { TableLimitSelector } from './components/SharedWidgets.jsx';
import { sliceData, standardizeTableData, toMbps, bytesToUnit, getSuggestedTimeInfo } from './analysis_utils.jsx';
import { downloadElementAsImage } from './utils/exportUtils.js';
import GlobalControls from './components/GlobalControls.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const AnalysisKebiasaan = ({
  cardPadding,
  chartHeight,
  gridGap,
  reportData,
  usageUnit,
  setUsageUnit,
  period,
  setPeriod,
  limit,
  setLimit,
  aggMethod,
  setAggMethod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  comparePrev,
  setComparePrev,
  granularity,
  setGranularity,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges,
  isKpiLoading
}) => {
  const { scopeLabel, granularityLabel } = getSuggestedTimeInfo(period, limit, startDate, endDate, granularity);
  const [filterPositive, setFilterPositive] = useState(false);
  
  // Hitung range hari dari startDate/endDate; fallback ke data
  const rangeDays = useMemo(() => {
    try {
      let s = startDate ? new Date(startDate) : null;
      let e = endDate ? new Date(endDate) : null;
      if ((!s || isNaN(s.getTime())) || (!e || isNaN(e.getTime()))) {
        const times = (reportData || [])
          .map(r => new Date(r.log_time || r.log_date || r.log_month))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => a - b);
        if (times.length >= 2) {
          s = times[0];
          e = times[times.length - 1];
        } else {
          return 0;
        }
      }
      const diffMs = e - s;
      if (diffMs <= 0) return 0;
      return diffMs / (1000 * 60 * 60 * 24);
    } catch {
      return 0;
    }
  }, [reportData, startDate, endDate]);
  
  const [tableLimits, setTableLimits] = useState({
    daily: 20,
    hourly: 20,
    churn: 10,
  });

  const dailyChartId = 'kebiasaan-daily-chart';
  const hourlyChartId = 'kebiasaan-hourly-chart';

  const handleLimitChange = (table, limit) => {
    setTableLimits(prev => ({ ...prev, [table]: limit }));
  };

  // 1. Kebiasaan Berdasarkan Hari (Day of Week)
  const dayOfWeekData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    // Guard: maksimal 31 hari untuk distribusi harian
    if (rangeDays > 31) return [];
    const stats = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      dayName: DAYS[i],
      download: 0,
      upload: 0,
      count: 0,
    }));

    reportData.forEach(r => {
      const d = new Date(r.log_time || r.log_date || r.log_month);
      if (isNaN(d.getTime())) return;
      const day = d.getDay();
      
      const standardized = standardizeTableData([r], 'traffic')[0];
      const dlVal = standardized.rx || 0;
      const ulVal = standardized.tx || 0;
      const dl = usageUnit === 'Mbps' ? toMbps(dlVal) : bytesToUnit(dlVal, usageUnit);
      const ul = usageUnit === 'Mbps' ? toMbps(ulVal) : bytesToUnit(ulVal, usageUnit);

      stats[day].download += dl;
      stats[day].upload += ul;
      stats[day].count += 1;
    });

    let mapped = stats.map(s => ({
      ...s,
      avgDownload: s.count ? s.download / s.count : 0,
      avgUpload: s.count ? s.upload / s.count : 0,
      total: s.download + s.upload,
    }));
    
    if (filterPositive) {
      mapped = mapped.filter(s => (s.avgDownload > 0) || (s.avgUpload > 0) || (s.total > 0));
    }

    return sliceData(mapped, tableLimits.daily);
  }, [reportData, usageUnit, tableLimits.daily, rangeDays, filterPositive]);

  // 2. Kebiasaan Berdasarkan Jam (Hour of Day) - Hanya jika ada log_time
  const hourOfDayData = useMemo(() => {
    if (!reportData || reportData.length === 0) return null;
    // Guard: maksimal 7 hari untuk pola per jam
    if (rangeDays > 7) return null;
    const stats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      download: 0,
      upload: 0,
      count: 0,
    }));

    let hasHourlyData = false;
    reportData.forEach(r => {
      if (!r.log_time) return;
      const d = new Date(r.log_time);
      if (isNaN(d.getTime())) return;
      hasHourlyData = true;
      const hour = d.getHours();
      
      const standardized = standardizeTableData([r], 'traffic')[0];
      const dlVal = standardized.rx || 0;
      const ulVal = standardized.tx || 0;
      const dl = usageUnit === 'Mbps' ? toMbps(dlVal) : bytesToUnit(dlVal, usageUnit);
      const ul = usageUnit === 'Mbps' ? toMbps(ulVal) : bytesToUnit(ulVal, usageUnit);

      stats[hour].download += dl;
      stats[hour].upload += ul;
      stats[hour].count += 1;
    });

    if (!hasHourlyData) return null;

    let mapped = stats.map(s => ({
      ...s,
      avgDownload: s.count ? s.download / s.count : 0,
      avgUpload: s.count ? s.upload / s.count : 0,
    }));
    if (filterPositive) {
      mapped = mapped.filter(s => (s.avgDownload > 0) || (s.avgUpload > 0));
    }

    return sliceData(mapped, tableLimits.hourly);
  }, [reportData, usageUnit, tableLimits.hourly, rangeDays, filterPositive]);

  // 3. Churn Risk Detection (Analisis Pengurangan User)
  const churnAnalysis = useMemo(() => {
    if (!reportData || reportData.length < 7) return null;
    
    // Urutkan data berdasarkan tanggal
    const chronData = [...reportData].sort((a, b) => new Date(a.log_time || a.log_date) - new Date(b.log_time || b.log_date));
    
    // Bandingkan rata-rata user minggu ini vs minggu lalu
    const mid = Math.floor(chronData.length / 2);
    const recent = chronData.slice(mid);
    const older = chronData.slice(0, mid);
    
    const avgRecentP = recent.reduce((sum, r) => sum + Number(r.total_pppoe || 0), 0) / recent.length;
    const avgOlderP = older.reduce((sum, r) => sum + Number(r.total_pppoe || 0), 0) / older.length;
    
    const avgRecentH = recent.reduce((sum, r) => sum + Number(r.total_hotspot || 0), 0) / recent.length;
    const avgOlderH = older.reduce((sum, r) => sum + Number(r.total_hotspot || 0), 0) / older.length;
    
    const pppoeDiff = avgRecentP - avgOlderP;
    const hotspotDiff = avgRecentH - avgOlderH;
    
    const pppoeRisk = pppoeDiff < 0 ? Math.abs((pppoeDiff / (avgOlderP || 1)) * 100) : 0;
    const hotspotRisk = hotspotDiff < 0 ? Math.abs((hotspotDiff / (avgOlderH || 1)) * 100) : 0;
    
    return {
      pppoe: { diff: pppoeDiff, risk: pppoeRisk, current: avgRecentP, previous: avgOlderP },
      hotspot: { diff: hotspotDiff, risk: hotspotRisk, current: avgRecentH, previous: avgOlderH },
      status: (pppoeRisk > 10 || hotspotRisk > 10) ? 'Kritis' : (pppoeRisk > 5 || hotspotRisk > 5) ? 'Waspada' : 'Stabil'
    };
  }, [reportData]);

  if (!reportData || reportData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200 shadow-sm relative min-h-[300px]">
        <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis pola kebiasaan..." />
        <Clock className="text-blue-500 h-12 w-12 mb-4 animate-spin" />
        <h3 className="text-lg font-bold text-gray-700">Menganalisis Pola Kebiasaan...</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
          Sedang mengekstraksi pola penggunaan harian dan mingguan dari log database PostgreSQL.
        </p>
        <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full mx-auto">
          <Zap size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Pure Historical Data (No Live API)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GlobalControls 
        period={period} setPeriod={setPeriod}
        limit={limit} setLimit={setLimit}
        activeTab="kebiasaan"
        aggMethod={aggMethod} setAggMethod={setAggMethod}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        comparePrev={comparePrev} setComparePrev={setComparePrev}
        usageUnit={usageUnit} setUsageUnit={setUsageUnit}
        granularity={granularity} setGranularity={setGranularity}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        autoApply={autoApply}
        setAutoApply={setAutoApply}
        hasPendingChanges={hasPendingChanges}
      />

      {/* Meta Info Badge */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-2">
          <Clock size={12} className="text-indigo-500" />
          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Scope: {scopeLabel}</span>
        </div>
        <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full flex items-center gap-2">
          <Activity size={12} className="text-blue-500" />
          <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Agregasi: {granularityLabel}</span>
        </div>
        <button
          onClick={() => setFilterPositive(v => !v)}
          className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all ${
            filterPositive 
              ? 'bg-blue-600 text-white border-blue-700' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
          title="Sembunyikan baris dengan nilai 0"
        >
          Filter &gt; 0: {filterPositive ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 1. Churn Risk Summary (New Feature) */}
      {churnAnalysis && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6 relative min-h-[200px]">
          <LoadingOverlay isLoading={isKpiLoading} message="Menghitung risiko churn..." />
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserMinus className="text-rose-500" size={20} />
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-700">Analisis Risiko Churn (Pengurangan User)</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                  <Zap size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase">Pure Historical Data</span>
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              churnAnalysis.status === 'Kritis' ? 'bg-rose-100 text-rose-700' :
              churnAnalysis.status === 'Waspada' ? 'bg-amber-100 text-amber-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              Status: {churnAnalysis.status}
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PPPoE Risk */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">PPPoE Subscribers</p>
                  <h4 className="text-2xl font-black text-gray-800">{(Number(churnAnalysis.pppoe.current) || 0).toFixed(1)} <span className="text-sm font-normal text-gray-400">Avg</span></h4>
                </div>
                <div className={`text-right ${churnAnalysis.pppoe.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <div className="flex items-center gap-1 font-bold">
                    {churnAnalysis.pppoe.diff >= 0 ? <TrendingDown className="rotate-180" size={16} /> : <TrendingDown size={16} />}
                    {(Number(Math.abs(churnAnalysis.pppoe.diff)) || 0).toFixed(1)} User
                  </div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Vs Periode Sebelumnya</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${churnAnalysis.pppoe.risk > 10 ? 'bg-rose-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (churnAnalysis.pppoe.current / (churnAnalysis.pppoe.previous || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 italic">
                {churnAnalysis.pppoe.risk > 5 
                  ? `⚠️ Terdeteksi penurunan user PPPoE sebesar ${(Number(churnAnalysis.pppoe.risk) || 0).toFixed(1)}%. Periksa kualitas link atau masa aktif voucher.`
                  : "Trend user PPPoE cenderung stabil atau meningkat."}
              </p>
            </div>

            {/* Hotspot Risk */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Hotspot Users</p>
                  <h4 className="text-2xl font-black text-gray-800">{(Number(churnAnalysis.hotspot.current) || 0).toFixed(1)} <span className="text-sm font-normal text-gray-400">Avg</span></h4>
                </div>
                <div className={`text-right ${churnAnalysis.hotspot.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <div className="flex items-center gap-1 font-bold">
                    {churnAnalysis.hotspot.diff >= 0 ? <TrendingDown className="rotate-180" size={16} /> : <TrendingDown size={16} />}
                    {(Number(Math.abs(churnAnalysis.hotspot.diff)) || 0).toFixed(1)} User
                  </div>
                  <p className="text-[10px] uppercase font-bold opacity-70">Vs Periode Sebelumnya</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${churnAnalysis.hotspot.risk > 10 ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (churnAnalysis.hotspot.current / (churnAnalysis.hotspot.previous || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 italic">
                {churnAnalysis.hotspot.risk > 5 
                  ? `⚠️ Terdeteksi penurunan user Hotspot sebesar ${(Number(churnAnalysis.hotspot.risk) || 0).toFixed(1)}%. Periksa jangkauan sinyal atau gangguan AP.`
                  : "Trend user Hotspot cenderung stabil atau meningkat."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
        {/* Chart: Penggunaan per Hari (Scope: 7-30 Hari) */}
        <div id={dailyChartId} className={`bg-white ${cardPadding} rounded-lg shadow relative min-h-[300px]`}>
          <LoadingOverlay isLoading={isKpiLoading} message="Memetakan distribusi harian..." />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-500" size={20} />
              <div>
                <h3 className="text-lg font-semibold text-gray-700 leading-tight">Distribusi Harian ({usageUnit})</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Scope: {scopeLabel} • Granularitas: {granularityLabel} • Rekomendasi: ≤ 31 Hari
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => downloadElementAsImage(dailyChartId, `kebiasaan-harian-${new Date().getTime()}.png`)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Download Chart"
              >
                <Download size={16} />
              </button>
              <TableLimitSelector 
                current={tableLimits.daily} 
                onSelect={(l) => handleLimitChange('daily', l)} 
              />
            </div>
          </div>
          {dayOfWeekData && dayOfWeekData.length > 0 ? (
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dayName" fontSize={10} fontWeight="bold" />
                  <YAxis fontSize={10} fontWeight="bold" unit={usageUnit} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v) => {
                      const val = Number(v) || 0;
                      return [`${(Number(val) || 0).toFixed(2)} ${usageUnit}`, ''];
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="avgDownload" name={`Download (${usageUnit})`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgUpload" name={`Upload (${usageUnit})`} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="text-amber-500 mb-2" size={24} />
              <p className="text-sm text-gray-600 font-medium">
                Rentang terlalu besar untuk distribusi harian. Mohon pilih ≤ 31 hari.
              </p>
            </div>
          )}
        </div>

        {/* Chart: Penggunaan per Jam (Scope: 1 Hari) */}
        {hourOfDayData ? (
          <div id={hourlyChartId} className={`bg-white ${cardPadding} rounded-lg shadow relative min-h-[300px]`}>
            <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis pola per jam..." />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="text-purple-500" size={20} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 leading-tight">Pola Jam Kerja ({usageUnit})</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Scope: 1 Hari • Granularitas: Per Jam • Rekomendasi: ≤ 7 Hari</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadElementAsImage(hourlyChartId, `kebiasaan-jam-${new Date().getTime()}.png`)}
                  className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  title="Download Chart"
                >
                  <Download size={16} />
                </button>
                <TableLimitSelector 
                  current={tableLimits.hourly} 
                  onSelect={(l) => handleLimitChange('hourly', l)} 
                />
              </div>
            </div>
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourOfDayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} fontWeight="bold" />
                  <YAxis fontSize={10} fontWeight="bold" unit={usageUnit} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v) => {
                      const val = Number(v) || 0;
                      return [`${(Number(val) || 0).toFixed(2)} ${usageUnit}`, ''];
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="avgDownload" name={`Download (${usageUnit})`} fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {hourOfDayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={0.6 + (entry.avgDownload / Math.max(...hourOfDayData.map(h => h.avgDownload) || [1]) * 0.4)} />
                    ))}
                  </Bar>
                  <Bar dataKey="avgUpload" name={`Upload (${usageUnit})`} fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className={`bg-white ${cardPadding} rounded-lg shadow flex flex-col items-center justify-center text-center relative min-h-[300px]`}>
            <LoadingOverlay isLoading={isKpiLoading} message="Mengecek data per jam..." />
            <Clock className="text-gray-300 mb-2" size={48} />
            <p className="text-gray-500 font-medium">Data per jam tidak tersedia atau rentang &gt; 7 hari</p>
            <p className="text-sm text-gray-400">Pilih periode 'Harian' dengan rentang ≤ 7 hari untuk melihat pola per jam</p>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 ${gridGap}`}>
        <div className={`bg-blue-50 ${cardPadding} rounded-xl border border-blue-100`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <span className="text-sm font-medium text-blue-700">Hari Teramai</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {dayOfWeekData && dayOfWeekData.length > 0 
              ? dayOfWeekData.reduce((prev, current) => (prev.total > current.total) ? prev : current).dayName
              : 'N/A'}
          </div>
          <div className="text-xs text-blue-600 mt-1">Berdasarkan total trafik download + upload</div>
        </div>

        <div className={`bg-emerald-50 ${cardPadding} rounded-xl border border-emerald-100`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500 rounded-lg text-white">
              <Users size={20} />
            </div>
            <span className="text-sm font-medium text-emerald-700">Efisiensi Akhir Pekan</span>
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {dayOfWeekData && dayOfWeekData.length > 0 ? (
              (function(){
                const weekend = dayOfWeekData.filter(d => d.dayIndex === 0 || d.dayIndex === 6);
                const weekday = dayOfWeekData.filter(d => d.dayIndex !== 0 && d.dayIndex !== 6);
                const avgWeekend = weekend.reduce((a, b) => a + b.total, 0) / (weekend.length || 1);
                const avgWeekday = weekday.reduce((a, b) => a + b.total, 0) / (weekday.length || 1);
                return avgWeekend > avgWeekday ? 'Lebih Tinggi' : 'Lebih Rendah';
              })()
            ) : 'N/A'}
          </div>
          <div className="text-xs text-emerald-600 mt-1">Dibandingkan dengan hari kerja</div>
        </div>

        <div className={`bg-purple-50 ${cardPadding} rounded-xl border border-purple-100`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg text-white">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-purple-700">Jam Puncak</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {hourOfDayData && Array.isArray(hourOfDayData) && hourOfDayData.length > 0 
              ? hourOfDayData.reduce((prev, current) => (prev.avgDownload + prev.avgUpload > current.avgDownload + current.avgUpload) ? prev : current).label
              : 'N/A'}
          </div>
          <div className="text-xs text-purple-600 mt-1">Waktu penggunaan tertinggi rata-rata</div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisKebiasaan;
