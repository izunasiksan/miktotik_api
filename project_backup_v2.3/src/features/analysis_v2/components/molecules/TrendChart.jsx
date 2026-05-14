import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area,
  Brush,
  ReferenceLine
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Maximize2, ZoomIn } from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

/**
 * TrendChart (Stage 2) V2.1
 * Visualisasi deret waktu dengan fitur Zoom/Brush dan Tooltip High-Fidelity.
 * Sesuai 04_UI_UX_GUIDELINES.md (Trend Exploration).
 */
const formatValueExternal = (val) => {
  if (val === null || val === undefined) return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(1);
};

const TrendTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-[11px] space-y-2 min-w-[180px]">
        <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1">
          <span className="font-bold text-slate-400 uppercase tracking-tighter">Timeline</span>
          <span className="font-mono">{new Date(label).toLocaleString()}</span>
        </div>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                {entry.name}
              </span>
              <span className="font-black">{formatValueExternal(entry.value)} {unit}</span>
            </div>
          ))}
        </div>
        {payload[0]?.payload?.z_score !== undefined && (
          <div className="pt-1 border-t border-slate-700 flex justify-between items-center text-[9px]">
            <span className="text-slate-400">Statistical Deviation</span>
            <span className={`${Math.abs(payload[0].payload.z_score) > 2 ? 'text-rose-400' : 'text-emerald-400'} font-bold`}>
              Z-Score: {payload[0].payload.z_score.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const TrendChart = () => {
  const { analysisData } = useAnalysisStore();
  const [isZoomed, setIsZoomed] = useState(false);
  
  if (!analysisData || !analysisData.stage2) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex items-center justify-center text-slate-400 italic">
        Data Trend tidak tersedia
      </div>
    );
  }

  const { trends, summary, metadata } = analysisData.stage2;
  const unit = metadata?.unit || 'Mbps';

  const formatValue = formatValueExternal;

  const TrendIndicator = ({ value }) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-emerald-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-6 group transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Trend & Agregasi (Stage 2)</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-medium px-0.5">Time-series derivation based on Raw SSOT</p>
        </div>

        <div className="flex items-center gap-6">
          {summary && Object.entries(summary).slice(0, 2).map(([key, val]) => (
            <div key={key} className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key}</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-sm font-black text-slate-700">{formatValue(val.value)}</span>
                <TrendIndicator value={val.delta} />
              </div>
            </div>
          ))}
          <button 
            onClick={() => setIsZoomed(!isZoomed)}
            className={`p-1.5 rounded-lg border transition-colors ${isZoomed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-500'}`}
            title="Toggle Brush Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="timestamp" 
              fontSize={9} 
              tickMargin={12} 
              axisLine={false} 
              tickLine={false}
              minTickGap={30}
              tickFormatter={(str) => {
                const date = new Date(str);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }}
            />
            <YAxis 
              fontSize={9} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={formatValue}
              width={40}
            />
            <Tooltip content={<TrendTooltip unit={unit} />} />
            
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#6366f1" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              name="Current Traffic"
              isAnimationActive={true}
              animationDuration={1000}
            />
            
            <Line 
              type="monotone" 
              dataKey="moving_average" 
              stroke="#94a3b8" 
              strokeDasharray="4 4" 
              dot={false}
              strokeWidth={1.5}
              name="Rolling Average"
            />

            {/* Peak Reference Line */}
            {summary?.peak?.value && (
              <ReferenceLine 
                y={summary.peak.value} 
                stroke="#fda4af" 
                strokeDasharray="3 3" 
                label={{ value: 'PEAK', position: 'right', fill: '#f43f5e', fontSize: 8, fontWeight: 'bold' }} 
              />
            )}

            {isZoomed && (
              <Brush 
                dataKey="timestamp" 
                height={20} 
                stroke="#6366f1" 
                fill="#f8fafc"
                tickFormatter={(str) => new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                travellerWidth={10}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
