import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Database, TrendingUp, Info, AlertCircle, Zap, Calendar, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { TableLimitSelector } from './components/SharedWidgets.jsx';
import { sliceData } from './analysis_utils.jsx';
import { downloadElementAsImage } from './utils/exportUtils.js';
import GlobalControls from './components/GlobalControls.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

const AnalysisKapasitas = ({ 
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
  capacityStats, 
  trafficSeries, 
  usageUnit,
  isKpiLoading,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges
}) => {
  const chartId = 'kapasitas-distribution-chart';
  const [tableLimits, setTableLimits] = useState({
    distribution: 20,
  });

  const handleLimitChange = (table, limit) => {
    setTableLimits(prev => ({ ...prev, [table]: limit }));
  };

  // 1. Data untuk Grafik Distribusi & Trendline
  const chartData = useMemo(() => {
    if (!trafficSeries.length) return [];
    
    // Sort original data by date for trendline calculation
    const chronData = [...trafficSeries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const n = chronData.length;
    
    // Linear regression for trendline: y = mx + c
    const xSum = (n * (n - 1)) / 2;
    const ySum = chronData.reduce((a, b) => a + b.value, 0);
    const xySum = chronData.reduce((a, b, i) => a + b.value * i, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = n > 1 ? (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum) : 0;
    const intercept = (ySum - slope * xSum) / n;

    // We want the distribution chart (sorted by value) but with trendline from chronological order
    const sortedData = [...trafficSeries].sort((a, b) => a.value - b.value).map((s, idx) => ({
      ...s,
      index: idx,
      isP95: s.value >= capacityStats.p95,
      isP99: s.value >= capacityStats.p99,
    }));

    // Add trendline points to chronological data for a separate "Trend" view or overlay
    const mappedData = sortedData.map((s) => {
      // Find where this sorted point was in chronological order to get its trend value
      const chronIdx = chronData.findIndex(c => c.date === s.date);
      return {
        ...s,
        trendValue: intercept + slope * chronIdx
      };
    });

    return sliceData(mappedData, tableLimits.distribution);
  }, [trafficSeries, capacityStats, tableLimits.distribution]);

  // 2. Forecasting Detail
  const forecast = useMemo(() => {
    if (trafficSeries.length < 5) return null;
    const chronData = [...trafficSeries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const n = chronData.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = chronData.reduce((a, b) => a + b.value, 0);
    const xySum = chronData.reduce((a, b, i) => a + b.value * i, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;
    
    const avgValue = ySum / n;
    const growthPerUnit = slope;
    const futureValue30 = intercept + slope * (n + 30);
    const growthPercent = avgValue !== 0 ? (growthPerUnit / avgValue) * 100 : 0;
    
    return {
      slope,
      avgValue,
      growthPerUnit,
      futureValue30: Math.max(0, futureValue30),
      growthPercent,
      confidence: n > 10 ? 'Tinggi' : 'Sedang'
    };
  }, [trafficSeries]);

  if (!trafficSeries || trafficSeries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
        <TrendingUp className="text-emerald-500 h-12 w-12 mb-4 animate-spin" />
        <h3 className="text-lg font-bold text-gray-700">Menghitung Proyeksi Kapasitas...</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
          Sedang menghitung percentile dan forecasting linear berdasarkan data historis PostgreSQL.
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

      {/* --- 1. KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        <LoadingOverlay isLoading={isKpiLoading} message="Menghitung statistik kapasitas..." />
        <div className={`bg-white ${cardPadding} rounded-lg shadow border-l-4 border-blue-500`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">95th Percentile</span>
            <Database size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-800">{(Number(capacityStats.p95) || 0).toFixed(2)} <span className="text-sm font-normal text-gray-400">{usageUnit}</span></div>
          <p className="text-xs text-gray-500 mt-1">Batas beban normal (95%)</p>
        </div>

        <div className={`bg-white ${cardPadding} rounded-lg shadow border-l-4 border-purple-500`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">99th Percentile</span>
            <Zap size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-gray-800">{(Number(capacityStats.p99) || 0).toFixed(2)} <span className="text-sm font-normal text-gray-400">{usageUnit}</span></div>
          <p className="text-xs text-gray-500 mt-1">Batas beban puncak (99%)</p>
        </div>

        <div className={`bg-white ${cardPadding} rounded-lg shadow border-l-4 border-rose-500`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Puncak Maksimum</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{(Number(capacityStats.max) || 0).toFixed(2)} <span className="text-sm font-normal text-gray-400">{usageUnit}</span></div>
          <p className="text-xs text-gray-500 mt-1">Terjadi pada {capacityStats.maxDate}</p>
        </div>

        <div className={`bg-white ${cardPadding} rounded-lg shadow border-l-4 border-emerald-500`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trend Pertumbuhan</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className={`text-2xl font-black ${forecast?.growthPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {forecast ? `${forecast.growthPercent >= 0 ? '+' : ''}${(Number(forecast.growthPercent) || 0).toFixed(1)}%` : '---'}
          </div>
          <p className="text-xs text-gray-500 mt-1">Estimasi perubahan trafik</p>
        </div>
      </div>

      {/* --- 2. Distribusi & Percentile Chart --- */}
      <div id={chartId} className={`bg-white ${cardPadding} rounded-lg shadow relative group min-h-[400px]`}>
        <LoadingOverlay isLoading={isKpiLoading} message="Memproses distribusi trafik..." />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Database size={20} className="text-blue-600" />
            Distribusi Beban & Analisis Percentile
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-4 text-xs mr-4">
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-sm"></span> Normal</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-400 rounded-sm"></span> P95+</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-400 rounded-sm"></span> P99+</div>
            </div>
            <TableLimitSelector 
              current={tableLimits.distribution} 
              onSelect={(l) => handleLimitChange('distribution', l)} 
            />
            <button 
              onClick={() => downloadElementAsImage(chartId, `kapasitas-distribution-${new Date().getTime()}.png`)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 ml-2"
              title="Download as Image"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="h-72 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" hide />
              <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(label) => `Tanggal: ${label}`}
                formatter={(value, name) => {
                  const val = Number(value) || 0;
                  return [
                    name === 'trendValue' ? `${(Number(val) || 0).toFixed(2)} ${usageUnit}` : `${(Number(val) || 0).toFixed(2)} ${usageUnit}`, 
                    name === 'trendValue' ? 'Trend Linear' : 'Volume'
                  ];
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="value" name="Volume Trafik" radius={[4, 4, 0, 0]} barSize={30}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isP99 ? '#fb7185' : entry.isP95 ? '#a78bfa' : '#60a5fa'} 
                  />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="trendValue" 
                name="Garis Trend" 
                stroke="#64748b" 
                strokeWidth={2} 
                dot={false} 
                strokeDasharray="5 5"
              />
              <ReferenceLine y={Number(capacityStats.p95) || 0} stroke="#8b5cf6" strokeDasharray="3 3" label={{ position: 'right', value: 'P95', fill: '#8b5cf6', fontSize: 10 }} />
              <ReferenceLine y={Number(capacityStats.p99) || 0} stroke="#f43f5e" strokeDasharray="5 5" label={{ position: 'right', value: 'P99', fill: '#f43f5e', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg text-gray-600 text-xs italic">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            <p>P95/P99 menunjukkan beban puncak yang diurutkan.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-400 border-t border-dashed border-gray-600"></div>
            <p>Garis Trend menunjukkan arah pertumbuhan data secara kronologis.</p>
          </div>
        </div>
      </div>

      {/* --- 3. Forecasting Insight & Review Prediksi --- */}
      {forecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 ${cardPadding} rounded-lg shadow text-white`}>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={24} />
              <h3 className="text-xl font-bold">Proyeksi Kapasitas (30 Hari)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                  Berdasarkan tren penggunaan saat ini ({period === 'monthly' ? 'Bulanan' : 'Harian'}), 
                  trafik Anda diprediksi akan mencapai nilai **{(Number(forecast.futureValue30) || 0).toFixed(2)} {usageUnit}** dalam 30 unit waktu mendatang.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                    Tingkat Kepercayaan: {forecast.confidence}
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    {forecast.growthPercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    Trend: {(Number(forecast.growthPercent) || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center border-l border-white/20 pl-8">
                <div className="text-xs uppercase tracking-widest text-blue-200 mb-2">Analisis Strategis</div>
                <p className="text-sm font-medium">
                  {forecast.growthPercent > 20 
                    ? "Pertumbuhan eksponensial terdeteksi. Disarankan untuk mulai merencanakan penambahan kapasitas bandwidth dalam 1-2 bulan ke depan." 
                    : forecast.growthPercent > 5
                    ? "Pertumbuhan stabil. Kapasitas saat ini masih aman, namun pantau terus beban puncak di akhir pekan."
                    : forecast.growthPercent >= 0
                    ? "Trafik cenderung mendatar (flat). Fokus pada efisiensi penggunaan daripada penambahan kapasitas."
                    : "Trafik menunjukkan penurunan. Periksa apakah ada perubahan kebijakan user atau penurunan kualitas layanan yang menyebabkan user beralih."}
                </p>
              </div>
            </div>
          </div>

          <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-indigo-500" size={20} />
              <h4 className="font-bold text-gray-700">Review Prediksi</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Rata-rata {period === 'monthly' ? 'Bulanan' : 'Harian'}</span>
                <span className="text-sm font-bold text-gray-700">{(Number(forecast.avgValue) || 0).toFixed(2)} {usageUnit}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Perubahan per {period === 'monthly' ? 'Bulan' : 'Hari'}</span>
                <span className={`text-sm font-bold ${forecast.growthPerUnit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {forecast.growthPerUnit >= 0 ? '+' : ''}{(Number(forecast.growthPerUnit) || 0).toFixed(3)} {usageUnit}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500">Target 30 {period === 'monthly' ? 'Bulan' : 'Hari'}</span>
                <span className="text-sm font-bold text-blue-600">{(Number(forecast.futureValue30) || 0).toFixed(2)} {usageUnit}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 mt-2">
                <div className="flex gap-2 items-start text-[10px] text-amber-800">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p>Prediksi ini menggunakan metode **Regresi Linear Sederhana** (OLS) berdasarkan data historis yang tersedia di dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisKapasitas;
