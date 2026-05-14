import React, { useState } from 'react';
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  Brush,
  ReferenceLine
} from 'recharts';
import { TrendingUp, ZoomIn } from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

/**
 * TrendChart (Stage 2) V2.1
 * Visualisasi deret waktu dengan fitur Zoom/Brush dan Tooltip High-Fidelity.
 * Sesuai 04_UI_UX_GUIDELINES.md (Trend Exploration).
 */
const formatValue = (val) => {
  if (val === null || val === undefined) return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(1);
};

const hasTimezoneInfo = (str) => {
  return /[zZ]$/.test(str) || /[+-]\d\d:?\d\d$/.test(str);
};

const parseTimestamp = (str) => {
  if (!str) return null;
  const iso = hasTimezoneInfo(str) ? str : `${str}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const SummaryItem = ({ label, value, unit, isMax = false }) => (
  <div className="text-right">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isMax ? `Max ${label}` : `Avg ${label}`}</p>
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-sm font-black text-slate-700">{formatValue(value)}</span>
      <span className="text-[10px] font-bold text-slate-400">{unit}</span>
    </div>
  </div>
);

const TrendTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const date = parseTimestamp(label);
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-[11px] space-y-2 min-w-[180px]">
        <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1">
          <span className="font-bold text-slate-400 uppercase tracking-tighter">Timeline</span>
          <span className="font-mono">
            {date ? date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : label}
          </span>
        </div>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                {entry.name}
              </span>
              <span className="font-black">{formatValue(entry.value)} {unit}</span>
            </div>
          ))}
          {payload[0]?.payload?.isGap && (
            <div className="flex items-center gap-1.5 py-0.5 px-2 bg-rose-500/20 border border-rose-500/30 rounded text-rose-300 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              <span className="font-bold text-[9px] uppercase tracking-tighter">Gap Data Detected (V2.1 Interpolated)</span>
            </div>
          )}
        </div>
        {payload[0]?.payload?.zScore !== undefined && (
          <div className="pt-1 border-t border-slate-700 flex justify-between items-center text-[9px]">
            <span className="text-slate-400">Statistical Deviation</span>
            <span className={`${Math.abs(payload[0].payload.zScore) > 2.5 ? 'text-rose-400' : 'text-emerald-400'} font-bold`}>
              Z-Score: {payload[0].payload.zScore.toFixed(2)}
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
  const [activeMetric, setActiveMetric] = useState('traffic'); // 'traffic', 'resource', 'users'
  
  if (!analysisData || !analysisData.stage2) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex items-center justify-center text-slate-400 italic">
        Data Trend tidak tersedia
      </div>
    );
  }

  const { series, summary, metadata } = analysisData.stage2;
  const directional = summary?.directional;
  const unit = activeMetric === 'traffic' ? (metadata?.unit || 'Mbps') : (activeMetric === 'resource' ? '%' : 'Users');

  // Mapping series for Recharts
  const chartData = (series || []).map(item => {
    let value = 0;
    let movingAverage = 0;
    let name = '';

    if (activeMetric === 'traffic') {
      value = item.rx || 0;
      movingAverage = item.rx_ma || 0;
      name = 'Download Traffic';
    } else if (activeMetric === 'resource') {
      value = item.cpu_percent_standard || item.cpu || 0;
      movingAverage = item.cpu_ma || item.cpu || 0;
      name = 'CPU Usage';
    } else if (activeMetric === 'users') {
      value = item.active_users || (item.hotspot_users || 0) + (item.pppoe_users || 0);
      movingAverage = item.active_users_ma || 0;
      name = 'Active Users';
    }

    return {
      ...item,
      timestamp: item.period, // Map period to timestamp for Recharts compatibility
      value,
      movingAverage,
      name
    };
  });

  const activeSummary = summary?.[activeMetric] || {};
  const peakValue = directional?.peak?.value || null;
  
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

        <div className="flex items-center gap-4">
          {/* Summary Stats V2.4.1 */}
          <div className="hidden xl:flex items-center gap-6 mr-4 border-r border-slate-100 pr-6">
            {activeMetric === 'traffic' && (
              <>
                <SummaryItem label="RX" value={activeSummary.rx?.avg} unit="Mbps" />
                <SummaryItem label="RX" value={activeSummary.rx?.max} unit="Mbps" isMax />
              </>
            )}
            {activeMetric === 'resource' && (
              <>
                <SummaryItem label="CPU" value={activeSummary.cpu?.avg} unit="%" />
                <SummaryItem label="CPU" value={activeSummary.cpu?.max} unit="%" isMax />
              </>
            )}
            {activeMetric === 'users' && (
              <>
                <SummaryItem label="Users" value={activeSummary.total_avg} unit="Users" />
                <SummaryItem label="HSP" value={activeSummary.hotspot?.max} unit="Users" isMax />
              </>
            )}
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveMetric('traffic')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                activeMetric === 'traffic' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              TRAFFIC
            </button>
            <button
              onClick={() => setActiveMetric('resource')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                activeMetric === 'resource' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              RESOURCE
            </button>
            <button
              onClick={() => setActiveMetric('users')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                activeMetric === 'users' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              USERS
            </button>
          </div>

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
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colortraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorresource" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorusers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
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
                const date = parseTimestamp(str);
                if (!date) return '';
                return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
              stroke={activeMetric === 'traffic' ? "#6366f1" : activeMetric === 'resource' ? "#f59e0b" : "#10b981"} 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill={`url(#color${activeMetric})`} 
              name={activeMetric === 'traffic' ? "Traffic" : activeMetric === 'resource' ? "Resource" : "Users"}
              isAnimationActive={true}
              animationDuration={1000}
              activeDot={{
                r: 6,
                stroke: '#fff',
                strokeWidth: 2,
                fill: '#6366f1',
                className: 'custom-active-dot'
              }}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isGap) {
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={3} 
                      stroke="#f43f5e" 
                      strokeWidth={1} 
                      fill="#fff" 
                      key={`gap-dot-${payload.timestamp}`}
                    />
                  );
                }
                return null;
              }}
            />
            
            <Line 
              type="monotone" 
              dataKey="movingAverage" 
              stroke="#94a3b8" 
              strokeDasharray="4 4" 
              dot={false}
              strokeWidth={1.5}
              name="Rolling Average"
            />

            {activeMetric === 'traffic' && peakValue && (
              <ReferenceLine 
                y={peakValue} 
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
                tickFormatter={(str) => {
                  const date = parseTimestamp(str);
                  if (!date) return '';
                  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                }}
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
