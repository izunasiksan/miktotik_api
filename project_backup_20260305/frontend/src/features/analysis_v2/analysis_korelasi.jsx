import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Settings, Cpu, Activity, Info, AlertTriangle, CheckCircle2, Download, Zap } from 'lucide-react';
import { TableLimitSelector } from './components/SharedWidgets.jsx';
import { sliceData, standardizeTableData, bytesToUnit, toMbps } from './analysis_utils.jsx';
import { downloadElementAsImage } from './utils/exportUtils.js';
import GlobalControls from './components/GlobalControls.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

const ScatterTooltip = ({ active, payload, usageUnit }) => {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload || {};
  const x = Number(p.x) || 0;
  const y = Number(p.y) || 0;
  const date = p.date || '';
  return (
    <div className="rounded-xl bg-white shadow-xl border border-slate-100 p-3">
      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sampel</div>
      {date && <div className="text-xs font-medium text-slate-700 mb-2">{date}</div>}
      <div className="flex items-center justify-between gap-6">
        <div className="text-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Traffic</div>
          <div className="font-bold text-slate-800">{x.toFixed(2)} {usageUnit}</div>
        </div>
        <div className="text-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase">CPU</div>
          <div className="font-bold text-slate-800">{y.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  );
};

const AnalysisKorelasi = ({ 
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
  corrValue, 
  reportData, 
  usageUnit,
  isKpiLoading,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges
}) => {
  const chartId = 'korelasi-scatter-chart';
  const [tableLimits, setTableLimits] = useState({
    scatter: 50,
  });

  const handleLimitChange = (table, limit) => {
    setTableLimits(prev => ({ ...prev, [table]: limit }));
  };

  // 1. Data untuk Scatter Plot
  const scatterData = useMemo(() => {
    const mapped = (reportData || []).map(r => {
      const standardizedResource = standardizeTableData([r], 'resource')[0];
      const standardizedTraffic = standardizeTableData([r], 'traffic')[0];
      
      const cpu = standardizedResource.cpu;
      const rawBytes = standardizedTraffic.total || 0;
      
      let totalTraffic = 0;
      if (usageUnit === 'Mbps') {
        totalTraffic = toMbps(rawBytes);
      } else {
        totalTraffic = bytesToUnit(rawBytes, usageUnit);
      }

      return {
        x: totalTraffic,
        y: cpu,
        date: r.displayDate,
      };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y));

    return sliceData(mapped, tableLimits.scatter);
  }, [reportData, tableLimits.scatter, usageUnit]);

  // 2. Analisis Kekuatan Korelasi
  const correlationInfo = useMemo(() => {
    const label = 'Data Terbatas';
    const color = 'text-gray-400';
    const bgColor = 'bg-gray-50';
    const description = 'Butuh lebih banyak data untuk memberikan analisis korelasi yang akurat.';
    const icon = <Info size={20} />;

    if (!reportData || reportData.length < 5) {
      return { label, color, bgColor, description, icon, r: 0, n: reportData?.length || 0 };
    }

    const r = corrValue.r;
    const absR = Math.abs(r);
    let currentLabel = 'Lemah';
    let currentColor = 'text-gray-500';
    let currentBgColor = 'bg-gray-100';
    let currentDescription = 'Trafik tidak memiliki pengaruh signifikan terhadap beban CPU.';
    let currentIcon = <Info size={20} />;

    if (absR >= 0.7) {
      currentLabel = 'Sangat Kuat';
      currentColor = 'text-rose-600';
      currentBgColor = 'bg-rose-100';
      currentDescription = 'Setiap kenaikan trafik langsung berdampak besar pada kenaikan beban CPU. MikroTik Anda mungkin bekerja keras pada layer pemrosesan.';
      currentIcon = <AlertTriangle size={20} />;
    } else if (absR >= 0.4) {
      currentLabel = 'Sedang';
      currentColor = 'text-amber-600';
      currentBgColor = 'bg-amber-100';
      currentDescription = 'Trafik berpengaruh pada CPU, namun ada faktor lain (seperti routing/firewall complex) yang juga mempengaruhi.';
      currentIcon = <Activity size={20} />;
    }

    return { 
      label: currentLabel, 
      color: currentColor, 
      bgColor: currentBgColor, 
      description: currentDescription, 
      icon: currentIcon, 
      r, 
      n: corrValue.n 
    };
  }, [corrValue, reportData]);

  if (!reportData || reportData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
        <Activity className="text-blue-500 h-12 w-12 mb-4 animate-spin" />
        <h3 className="text-lg font-bold text-gray-700">Memuat Data Korelasi...</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
          Sedang menghitung hubungan antara trafik dan beban CPU dari database PostgreSQL.
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

      {/* 1. Pearson Correlation Insight */}
      <div className={`rounded-xl p-6 ${correlationInfo.bgColor} border border-gray-100 relative overflow-hidden`}>
        <LoadingOverlay isLoading={isKpiLoading} message="Menghitung korelasi..." />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${correlationInfo.bgColor} ${correlationInfo.color}`}>
              <Settings size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-800">Efisiensi Pemrosesan</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                  <Zap size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase">Pure Historical Data</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Hubungan antara Volume Trafik ({usageUnit}) vs Beban CPU (%)</p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Koefisien (r)</div>
              <div className={`text-3xl font-black ${correlationInfo.color}`}>{(Number(correlationInfo.r) || 0).toFixed(3)}</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kekuatan</div>
              <div className={`text-xl font-bold ${correlationInfo.color}`}>{correlationInfo.label}</div>
            </div>
          </div>
        </div>

        <div className={`mt-6 p-4 rounded-xl flex gap-3 items-start ${correlationInfo.bgColor} ${correlationInfo.color.replace('text-', 'bg-opacity-10 text-')}`}>
          {correlationInfo.icon}
          <p className="text-sm font-medium leading-relaxed">{correlationInfo.description}</p>
        </div>
      </div>

      {/* --- 2. Scatter Plot Analysis --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id={chartId} className={`lg:col-span-2 bg-white ${cardPadding} rounded-lg shadow relative group min-h-[450px]`}>
          <LoadingOverlay isLoading={isKpiLoading} message="Memetakan sebaran data..." />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800">Peta Sebaran (Scatter Plot)</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">Setiap titik mewakili 1 sampel waktu</span>
              <TableLimitSelector 
                current={tableLimits.scatter} 
                onSelect={(l) => handleLimitChange('scatter', l)} 
              />
              <button 
                onClick={() => downloadElementAsImage(chartId, `korelasi-scatter-${new Date().getTime()}.png`)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 ml-2"
                title="Download as Image"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {scatterData && scatterData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Traffic" 
                    unit={` ${usageUnit}`} 
                    label={{ value: `Volume Trafik (${usageUnit})`, position: 'insideBottom', offset: -10, fontSize: 12 }}
                    tick={{fontSize: 10}}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="CPU" 
                    unit="%" 
                    domain={[0, 100]}
                    label={{ value: 'Beban CPU (%)', angle: -90, position: 'left', offset: 0, fontSize: 12 }}
                    tick={{fontSize: 10}}
                  />
                  <ZAxis type="number" range={[50, 400]} />
                  <ReferenceLine y={70} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'CPU 70%', position: 'right', fill: '#f97316', fontSize: 10 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip usageUnit={usageUnit} />} />
                  <Scatter name="Data" data={scatterData} fill="#3b82f6" fillOpacity={0.6}>
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.y > 70 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center text-center">
              <div>
                <div className="text-sm font-bold text-gray-700">Tidak ada data yang memenuhi kriteria</div>
                <div className="text-xs text-gray-500 mt-1">Sesuaikan filter atau kurangi limit untuk menampilkan titik sebar</div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="text-orange-500" size={20} />
              <h4 className="font-bold text-gray-700">Insight CPU</h4>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                Jika r mendekati 1, optimalisasi firewall/mangle dapat mengurangi beban CPU.
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                Jika r rendah tapi CPU tinggi, periksa proses latar belakang atau skrip yang berjalan.
              </li>
            </ul>
          </div>

          <div className={`bg-indigo-50 ${cardPadding} rounded-lg border border-indigo-100 shadow-sm`}>
            <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
              <Info size={18} />
              Metode Pearson
            </h4>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Analisis ini menggunakan metode korelasi Pearson (r) untuk mengukur kekuatan hubungan linear antara beban pemrosesan dan volume data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisKorelasi;
