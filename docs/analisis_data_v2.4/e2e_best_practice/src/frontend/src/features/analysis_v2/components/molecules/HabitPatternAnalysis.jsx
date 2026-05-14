import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  ReferenceLine
} from 'recharts';
import { Layers, Activity, Info, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

/**
 * HabitPatternAnalysis (Stage 4) - V2.1
 * Menganalisis pola berulang (HOD/DOW) untuk membentuk Baseline Profile.
 * Berkontribusi 30% pada Stability Score (Health Score).
 */
const HabitTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const formatValue = (v) => {
      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
      return v?.toFixed(1) || '0';
    };
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-[11px] space-y-2 min-w-[160px]">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
          <span className="font-bold text-slate-400">Time:</span>
          <span className="font-black text-emerald-400">{label}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 italic">Avg Value:</span>
          <span className="font-bold text-white">{formatValue(val)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const HabitPatternAnalysis = () => {
  const { analysisData } = useAnalysisStore();
  
  if (!analysisData || !analysisData.stage4) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="p-3 bg-slate-50 rounded-full">
          <Layers className="w-8 h-8 text-slate-200" />
        </div>
        <p className="italic text-sm">Data Pola Kebiasaan (Stage 4) tidak tersedia</p>
      </div>
    );
  }

  const { hodProfile, dowProfile, stabilityMetrics, metadata = {} } = analysisData.stage4;

  // Format labels for HOD (00:00 - 23:00)
  const formattedHodData = hodProfile?.map(item => ({
    ...item,
    displayTime: `${item.hour.toString().padStart(2, '0')}:00`
  })) || [];

  // Format labels for DOW (Sen - Min)
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const formattedDowData = dowProfile?.map(item => ({
    ...item,
    dayName: dayNames[item.dayOfWeek]
  })) || [];

  const formatValue = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val?.toFixed(1) || '0';
  };

  const stabilityScore = stabilityMetrics?.stabilityScore ?? 0;
  const isStable = stabilityScore >= 70;
  const sampleDays = metadata?.sampleDays ?? 0;
  const isLowSample = sampleDays < 7;

  

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Habit & Pattern Profile (Stage 4)</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" /> Baseline Profile (SSOT)
              </span>
              <span className="text-slate-300">|</span>
              <span className={`text-[10px] flex items-center gap-1 font-medium ${isStable ? 'text-emerald-600' : 'text-amber-600'}`}>
                <Activity className="w-3 h-3" /> Stability: {stabilityScore}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLowSample && (
            <div className="px-2 py-0.5 bg-amber-50 border border-amber-100 rounded text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> Low Sample
            </div>
          )}
          <div className="group relative">
            <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-emerald-600 transition-colors" />
            <div className="absolute right-0 top-8 w-72 p-4 bg-slate-900 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 leading-relaxed shadow-2xl border border-slate-800">
              <p className="font-bold text-emerald-400 mb-2 uppercase tracking-wider">Baseline Profile (Stage 4)</p>
              <p className="mb-3 text-slate-300">Membentuk profil perilaku normal menggunakan <strong>Raw Data Alignment</strong>. Profil ini menjadi acuan deteksi anomali.</p>
              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                <div className="flex justify-between"><span>Stability Score</span> <span className="text-emerald-400 font-bold">30% Health Impact</span></div>
                <div className="flex justify-between"><span>HOD</span> <span className="text-slate-300">Hour-of-Day (24h)</span></div>
                <div className="flex justify-between"><span>DOW</span> <span className="text-slate-300">Day-of-Week (7d)</span></div>
                <div className="flex justify-between"><span>Min Sample</span> <span className="text-amber-400 font-bold">7 Days for HOD</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* HOD Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Daily Habit (Hour-of-Day)
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Peak: {stabilityMetrics?.peakHour?.toString().padStart(2, '0')}:00
            </span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedHodData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="displayTime" 
                  fontSize={9} 
                  tickMargin={8} 
                  axisLine={false} 
                  tickLine={false}
                  interval={3}
                />
                <YAxis 
                  fontSize={9} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={formatValue}
                />
                <Tooltip content={<HabitTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="avgValue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
                {stabilityMetrics?.peakHour !== undefined && (
                  <ReferenceLine x={formattedHodData[stabilityMetrics.peakHour]?.displayTime} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'top', value: 'PEAK', fill: '#f43f5e', fontSize: 8, fontWeight: 'bold' }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white transition-all cursor-default group">
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 group-hover:text-emerald-500 transition-colors">Consistency (CV)</p>
            <p className="text-sm font-black text-slate-700">
              {stabilityMetrics?.cv?.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-white transition-all cursor-default group">
            <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1 group-hover:text-emerald-500 transition-colors">Peak-to-Base</p>
            <p className="text-sm font-black text-emerald-700">
              {stabilityMetrics?.peakToBaselineRatio?.toFixed(2)}x
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-white transition-all cursor-default group">
            <p className="text-[9px] font-bold text-indigo-600 uppercase mb-1 group-hover:text-indigo-500 transition-colors">Stability</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-indigo-700">{stabilityScore}%</p>
              {isStable && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
            </div>
          </div>
        </div>

        {/* DOW Profile Summary */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            Weekly Pattern (Day-of-Week)
          </h4>
          <div className="flex justify-between items-end gap-1.5 h-12 px-2">
            {formattedDowData.map((item, idx) => {
              const maxVal = Math.max(...formattedDowData.map(d => d.avgValue));
              const heightPct = (item.avgValue / maxVal) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div 
                    className="w-full bg-slate-100 rounded-t-lg group-hover:bg-indigo-500 transition-all duration-500 relative shadow-sm"
                    style={{ height: `${Math.max(10, heightPct)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 text-[8px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-indigo-100 whitespace-nowrap z-10 scale-90 group-hover:scale-100">
                      {formatValue(item.avgValue)}
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase transition-colors group-hover:text-indigo-600">{item.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Metadata */}
      <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Accuracy: {metadata.accuracyPct ?? 100}%
          </span>
          <span className="text-slate-200">|</span>
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Samples: {sampleDays} Days
          </span>
        </div>
        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          V2.1 Pattern Engine
        </div>
      </div>
    </div>
  );
};

export default HabitPatternAnalysis;
