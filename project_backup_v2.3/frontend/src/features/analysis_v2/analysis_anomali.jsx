import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AlertTriangle, TrendingUp, Info, Activity, Download, Zap } from 'lucide-react';
import { TableLimitSelector } from './components/SharedWidgets.jsx';
import { sliceData, avg, std } from './analysis_utils.jsx';
import { downloadElementAsImage } from './utils/exportUtils.js';
import GlobalControls from './components/GlobalControls.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

const AnalysisAnomali = ({ 
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
  cardPadding, 
  trafficSeries, 
  anomaliesList, 
  resourceAnomalies = [], 
  usageUnit,
  isKpiLoading,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges
}) => {
  const [tableLimit, setTableLimit] = React.useState(10);
  const chartId = 'anomali-traffic-chart';

  // Hitung Statistik Dasar untuk Grafik
  const stats = useMemo(() => {
    if (!trafficSeries.length) return { avg: 0, std: 0 };
    const values = trafficSeries.map(s => s.value);
    return { avg: avg(values), std: std(values) };
  }, [trafficSeries]);

  const chartData = useMemo(() => {
    return trafficSeries.map(s => {
      const anomaly = anomaliesList.find(a => a.date === s.date);
      // Ensure unit conversion if needed, but here we assume trafficSeries is already in usageUnit
      // from useAnalysisData.jsx (which it is)
      return {
        ...s,
        normalValue: s.value,
        anomalyValue: anomaly ? s.value : null,
      };
    });
  }, [trafficSeries, anomaliesList]);

  // Gabungkan semua anomali untuk tabel
  const allAnomalies = useMemo(() => {
    return [...anomaliesList, ...resourceAnomalies].map(a => {
      const val = Number(a.value) || 0;
      return {
        ...a,
        // If type is traffic, value is already converted in useAnalysisData.js
        displayValue: a.type === 'traffic' ? `${(Number(val) || 0).toFixed(2)} ${usageUnit}` : `${(Number(val) || 0).toFixed(2)} %`
      };
    }).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  }, [anomaliesList, resourceAnomalies, usageUnit]);

  if (!trafficSeries || trafficSeries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
        <Activity className="text-rose-500 h-12 w-12 mb-4 animate-spin" />
        <h3 className="text-lg font-bold text-gray-700">Mendeteksi Anomali...</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
          Sedang melakukan pemindaian Z-Score terhadap data historis di database PostgreSQL.
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
        aggMethod={aggMethod} setAggMethod={setAggMethod}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        comparePrev={comparePrev} setComparePrev={setComparePrev}
        granularity={granularity} setGranularity={setGranularity}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        autoApply={autoApply}
        setAutoApply={setAutoApply}
        hasPendingChanges={hasPendingChanges}
      />

      {/* 1. Overview Header & Stats */}
      <div id={chartId} className={`bg-white ${cardPadding} rounded-lg shadow relative group min-h-[400px]`}>
        <LoadingOverlay isLoading={isKpiLoading} message="Memindai anomali trafik..." />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800">Deteksi Anomali Trafik</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                  <Zap size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase">Pure Historical Data</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Periode: {period === 'monthly' ? 'Bulanan' : 'Harian'} • Metode Z-Score (|z| {'>'} 2.0)</p>
            </div>
          </div>
          
        <div className="flex gap-4 items-center">
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Trafik</div>
            <div className="text-2xl font-black text-rose-600">{anomaliesList.length}</div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Resource</div>
            <div className="text-2xl font-black text-amber-600">{resourceAnomalies.length}</div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Sampel</div>
            <div className="text-2xl font-black text-gray-700">{trafficSeries.length}</div>
          </div>
          <button 
            onClick={() => downloadElementAsImage(chartId, `anomali-traffic-${new Date().getTime()}.png`)}
            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 ml-2"
            title="Download as Image"
          >
            <Download size={18} />
          </button>
        </div>
        </div>

        {/* 2. Visualisasi Grafik Sebaran Anomali */}
        <div className="h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#94a3b8'}}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{fontSize: 12, fill: '#94a3b8'}}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                formatter={(value) => {
                  const val = Number(value) || 0;
                  return [`${(Number(val) || 0).toFixed(2)} ${usageUnit}`, 'Volume'];
                }}
              />
              <Legend verticalAlign="top" height={36}/>
              
              {/* Area Trafik Normal */}
              <Area 
                type="monotone" 
                dataKey="normalValue" 
                name="Trafik Normal" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTraffic)" 
              />
              
              {/* Titik Anomali (Scatter) */}
              <Scatter 
                dataKey="anomalyValue" 
                name="Titik Anomali" 
                fill="#e11d48" 
                shape="circle" 
              />

              {/* Garis Referensi Rata-rata */}
              <ReferenceLine 
                y={Number(stats.avg) || 0} 
                stroke="#94a3b8" 
                strokeDasharray="3 3" 
                label={{ position: 'right', value: 'Avg', fill: '#94a3b8', fontSize: 10 }} 
              />
              
              {/* Batas Atas Anomali (2 Sigma) */}
              <ReferenceLine 
                y={(Number(stats.avg) || 0) + 2 * (Number(stats.std) || 0)} 
                stroke="#f43f5e" 
                strokeDasharray="5 5" 
                label={{ position: 'right', value: '+2σ', fill: '#f43f5e', fontSize: 10 }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-xs">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>
              Anomali dideteksi ketika nilai trafik berada di luar rentang standar deviasi (Z-Score). 
              Nilai yang sangat tinggi (+2σ) mengindikasikan lonjakan penggunaan tak terduga, 
              sedangkan nilai sangat rendah mungkin mengindikasikan gangguan layanan.
            </p>
            {allAnomalies.length > 0 && (
              <p className="font-bold">
                💡 Kesimpulan: Terdeteksi {allAnomalies.length} anomali. 
                Kejadian paling signifikan terjadi pada {allAnomalies[0].date} ({allAnomalies[0].type}) 
                dengan skor Z = {(Number(allAnomalies[0].z) || 0).toFixed(2)}.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Tabel Detail Anomali */}
      <div className={`bg-white ${cardPadding} rounded-lg shadow overflow-hidden relative min-h-[300px]`}>
        <LoadingOverlay isLoading={isKpiLoading} message="Menyusun temuan anomali..." />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-gray-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-700">Daftar Kejadian Anomali</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg">
            <AlertTriangle size={14} className="text-rose-500" />
            <span className="text-[10px] font-bold text-rose-700 uppercase">Threshold: |z| {'>'} 2.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Limit</span>
            <TableLimitSelector 
              current={tableLimit} 
              onSelect={setTableLimit} 
            />
          </div>
        </div>
        
        <div className="overflow-x-auto border rounded-lg border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu / Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nilai / Volume</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Z-Score</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sliceData(allAnomalies, tableLimit).map((r, idx) => (
                <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      r.type === 'traffic' ? 'bg-blue-100 text-blue-700' : 
                      r.type === 'cpu' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                    {r.displayValue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${r.z > 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                      {r.z > 0 ? '+' : ''}{(Number(r.z) || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      Math.abs(r.z) > 2.5 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {Math.abs(r.z) > 2.5 ? 'Kritis' : 'Waspada'}
                    </span>
                  </td>
                </tr>
              ))}
              {allAnomalies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Activity className="mx-auto text-gray-200 mb-3" size={48} />
                    <p className="text-gray-500 font-medium">Tidak ada anomali terdeteksi</p>
                    <p className="text-xs text-gray-400">Semua data berada dalam batas normal Z-Score.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalysisAnomali;
