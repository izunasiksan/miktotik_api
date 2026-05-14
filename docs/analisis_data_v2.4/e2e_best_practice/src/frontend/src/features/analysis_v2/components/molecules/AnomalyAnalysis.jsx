import React from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine,
  Brush
} from 'recharts';
import { ShieldAlert, AlertCircle, Info, CheckCircle2, Clock, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

const formatAnomalyValue = (val) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val?.toFixed(1) || '0';
};

const AnomalyTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const absZ = Math.abs(data.zScore);
    let severityLabel = 'Normal';
    let severityColor = 'text-emerald-400';
    if (absZ >= 3) {
      severityLabel = 'Extreme';
      severityColor = 'text-rose-400';
    } else if (absZ >= 2) {
      severityLabel = 'Significant';
      severityColor = 'text-amber-400';
    }
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-[11px] space-y-2 min-w-[180px]">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
          <span className="font-bold text-slate-400">Time:</span>
          <span className="font-black text-indigo-400">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 italic">Value:</span>
            <span className="font-bold text-white">{formatAnomalyValue(data.value)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 italic">Z-Score:</span>
            <span className={`font-bold ${severityColor}`}>{data.zScore.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-700">
            <span className="text-slate-500 uppercase text-[9px] font-black tracking-widest">Status:</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${severityColor}`}>{severityLabel}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * AnomalyAnalysis (Stage 5) - V2.1
 * Validasi anomali berbasis Event Merging & Severity Scoring.
 * Berkontribusi 40% pada Penalty Score (Health Score).
 */
const AnomalyAnalysis = () => {
  const { analysisData } = useAnalysisStore();

  if (!analysisData || !analysisData.stage5) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="p-3 bg-slate-50 rounded-full">
          <ShieldAlert className="w-8 h-8 text-slate-200" />
        </div>
        <p className="italic text-sm">Data Validasi Anomali (Stage 5) tidak tersedia</p>
      </div>
    );
  }

  const { events = [], anomalies = [], summary = {}, metadata = {} } = analysisData.stage5;

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', dot: 'bg-rose-500', hex: '#f43f5e' };
      case 'medium': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500', hex: '#f59e0b' };
      case 'low': return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500', hex: '#6366f1' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-400', hex: '#94a3b8' };
    }
  };

  const formatValue = formatAnomalyValue;

  const accuracyPct = metadata?.accuracyPct ?? 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-rose-600 p-2 rounded-lg shadow-sm">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Anomaly Validation (Stage 5)</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Validated Events (SSOT)
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Penalty: {summary.penaltyScore || 0}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="group relative">
          <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-rose-600 transition-colors" />
          <div className="absolute right-0 top-8 w-72 p-4 bg-slate-900 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 leading-relaxed shadow-2xl border border-slate-800">
            <p className="font-bold text-rose-400 mb-2 uppercase tracking-wider">Anomaly Validation (Stage 5)</p>
            <p className="mb-3 text-slate-300">Memvalidasi kandidat anomali menggunakan <strong>Raw Data Fidelity</strong> dan <strong>Event Merging</strong>. Mencegah false alarm dari data noise.</p>
            <div className="space-y-1.5 border-t border-slate-800 pt-2">
              <div className="flex justify-between"><span>Penalty Weight</span> <span className="text-rose-400 font-bold">40% Health Impact</span></div>
              <div className="flex justify-between"><span>Event Merging</span> <span className="text-slate-300">Cluster adjacent outliers</span></div>
              <div className="flex justify-between"><span>Cross-Metric</span> <span className="text-slate-300">Multi-metric correlation</span></div>
              <div className="flex justify-between"><span>Muting</span> <span className="text-amber-400 font-bold">Maintenance window aware</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Scatter Chart - Raw Points */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              Raw Anomaly Distribution
            </h4>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-[8px] font-bold text-slate-500 uppercase">Extreme</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[8px] font-bold text-slate-500 uppercase">Significant</span>
              </div>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  fontSize={9} 
                  tickMargin={8} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.getHours() + ':00';
                  }}
                />
                <YAxis 
                  fontSize={9} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={formatValue}
                />
                <ZAxis type="number" dataKey="zScore" range={[30, 200]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={<AnomalyTooltip />}
                />
                <Brush 
                  dataKey="timestamp" 
                  height={30} 
                  stroke="#6366f1" 
                  fill="#f8fafc"
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.getHours() + ':00';
                  }}
                  fontSize={8}
                />
                {summary.mean !== undefined && (
                  <ReferenceLine y={summary.mean} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'right', value: 'MEAN', fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }} />
                )}
                <Scatter name="Anomalies" data={anomalies}>
                  {anomalies.map((entry, index) => {
                    const absZ = Math.abs(entry.zScore);
                    let color = '#6366f1';
                    if (absZ >= 3) color = '#f43f5e';
                    else if (absZ >= 2) color = '#f59e0b';
                    return <Cell key={`cell-${index}`} fill={color} className="animate-in zoom-in-50 duration-500" />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Validated Events List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-3 h-3 text-rose-500" />
            Validated Anomaly Events
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {events.length > 0 ? (
              events.map((event, idx) => {
                const style = getSeverityColor(event.severity);
                return (
                  <div 
                    key={event.id} 
                    className={`p-3 rounded-xl border ${style.bg} ${style.border} transition-all hover:shadow-md cursor-default group animate-in fade-in slide-in-from-right-4 duration-500`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${style.dot} shadow-sm group-hover:scale-125 transition-transform`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>
                          {event.severity} SEVERITY
                        </span>
                        {event.status === 'muted' && (
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[8px] font-bold rounded uppercase">Muted</span>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1 group-hover:text-slate-600 transition-colors">
                        <Clock className="w-3 h-3" />
                        {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-700">
                        {event.evidence || 'Anomali terdeteksi pada metrik utama'}
                      </p>
                      <div className="flex -space-x-1.5">
                        {event.metrics?.slice(0, 3).map((m, i) => (
                          <div 
                            key={i} 
                            title={m} 
                            className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform"
                          >
                            <Activity className="w-2.5 h-2.5 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100 border-dashed animate-in zoom-in-95 duration-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">No Validated Anomalies</p>
                <p className="text-[10px] text-emerald-600 mt-1">Sistem berjalan normal dalam parameter baseline.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Metadata */}
      <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Fidelity: {accuracyPct}%
          </span>
          <span className="text-slate-200">|</span>
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Events: {events.length}
          </span>
        </div>
        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          V2.1 Validation Engine
        </div>
      </div>
    </div>
  );
};

export default AnomalyAnalysis;
