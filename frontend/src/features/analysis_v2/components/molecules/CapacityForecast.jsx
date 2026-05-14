import React from 'react';
import { 
  ComposedChart,
  Line,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Brush
} from 'recharts';
import { BarChart3, Info, TrendingUp, AlertTriangle, Clock, Zap, ShieldCheck, Gauge, Maximize2, Minimize2 } from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

const ForecastTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-[11px] space-y-2 min-w-[200px]">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
          <span className="font-bold text-slate-400">Horizon:</span>
          <span className="font-black text-indigo-400">
            {new Date(label).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 italic">Projected:</span>
            <span className="font-bold text-white">{payload[0].value.toFixed(2)} {unit}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500">Confidence Band:</span>
            <span className="text-slate-300">
              [{payload[1]?.payload?.lower_bound?.toFixed(1)} - {payload[1]?.payload?.upper_bound?.toFixed(1)}]
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * CapacityForecast (Stage 6) V2.1
 * Menampilkan proyeksi beban, estimasi TTC (Time-To-Capacity), 
 * dan sisa kapasitas (Headroom) berdasarkan data historis.
 */
const CapacityForecast = () => {
  const { analysisData } = useAnalysisStore();
  const [isZoomed, setIsZoomed] = React.useState(false);
  
  // Memoized Derivations (Frontend-only Logic per V2.1)
  const derivedMetrics = React.useMemo(() => {
    if (!analysisData?.stage6) return null;

    const { forecast_data, capacity_metadata } = analysisData.stage6;
    const capacity = capacity_metadata?.current_capacity ?? 100; // fallback to 100 if missing
    
    // 1. Calculate Utilization & Headroom for each point
    const enrichedForecast = forecast_data?.map(point => ({
      ...point,
      utilization: (point.projected_value / capacity) * 100,
      headroom: Math.max(0, capacity - point.upper_bound)
    })) || [];

    // 2. Derive TTC (Time-To-Capacity)
    // TTC terjadi saat: upper_bound >= capacity (Conservative Rule)
    const ttcPoint = enrichedForecast.find(p => p.upper_bound >= capacity);
    let ttcLabel = "> Horizon";
    let ttcStatus = "STABLE";

    if (ttcPoint) {
      const ttcTime = new Date(ttcPoint.timestamp).getTime();
      const baseTime = enrichedForecast[0] ? new Date(enrichedForecast[0].timestamp).getTime() : ttcTime;
      const diffDays = Math.max(0, Math.ceil((ttcTime - baseTime) / (1000 * 60 * 60 * 24)));
      ttcLabel = new Date(ttcPoint.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (diffDays < 7) ttcStatus = "CRITICAL";
      else if (diffDays < 30) ttcStatus = "WARNING";
    }

    // 3. Current Stats (First projected point or latest)
    const currentPoint = enrichedForecast[0] || { projected_value: 0, upper_bound: 0 };
    const currentUtilization = (currentPoint.projected_value / capacity) * 100;
    const currentHeadroom = Math.max(0, capacity - currentPoint.upper_bound);

    return {
      enrichedForecast,
      capacity,
      unit: capacity_metadata?.unit || 'Mbps',
      ttcLabel,
      ttcStatus,
      currentUtilization,
      currentHeadroom,
      sourceId: capacity_metadata?.source_id || 'Unknown',
      accuracy: analysisData.stage6.scoring_metrics?.confidence_score ?? 0
    };
  }, [analysisData]);

  if (!analysisData || !analysisData.stage6 || !derivedMetrics) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[450px] flex items-center justify-center text-slate-400 italic">
        Data Prediksi Kapasitas tidak tersedia
      </div>
    );
  }

  const { health_score } = analysisData.stage6;

  const getStatusStyles = (status) => {
    switch (status) {
      case 'CRITICAL': return 'text-rose-600 bg-rose-50 border-rose-100 ring-rose-500/20';
      case 'WARNING': return 'text-amber-600 bg-amber-50 border-amber-100 ring-amber-500/20';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-500/20';
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header with Health Score & Metadata */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800">Prediksi Kapasitas (Stage 6)</h3>
            <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusStyles(derivedMetrics.ttcStatus)} ring-1`}>
              {derivedMetrics.ttcStatus}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> Source: {derivedMetrics.sourceId}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Confidence: {derivedMetrics.accuracy}%
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm ${getHealthColor(health_score)}`}>
            <Gauge className="w-3.5 h-3.5" />
            Health Score: {health_score}
          </div>
          <span className="text-[9px] text-slate-400 italic">Contrib: 30% to Final Score</span>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 hover:bg-white transition-colors cursor-default group">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5 group-hover:text-indigo-500 transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Time-To-Capacity</span>
          </div>
          <p className={`text-xl font-black ${derivedMetrics.ttcStatus === 'CRITICAL' ? 'text-rose-600' : 'text-slate-800'}`}>
            {derivedMetrics.ttcLabel}
          </p>
          <p className="text-[10px] text-slate-400">Conservative (Upper Bound)</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 hover:bg-white transition-colors cursor-default group">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5 group-hover:text-indigo-500 transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Current Utilization</span>
          </div>
          <p className="text-xl font-black text-slate-800">
            {derivedMetrics.currentUtilization.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-400">Avg. Projected Load</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 hover:bg-white transition-colors cursor-default group">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 group-hover:text-indigo-500 transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Headroom (Safe)</span>
          </div>
          <p className="text-xl font-black text-slate-800">
            {derivedMetrics.currentHeadroom.toFixed(1)} <span className="text-xs font-medium text-slate-500">{derivedMetrics.unit}</span>
          </p>
          <p className="text-[10px] text-slate-400">Distance to Capacity</p>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className={`transition-all duration-500 ${isZoomed ? 'h-96' : 'h-64'} w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 relative group/chart`}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
            Horizon Proyeksi (Confidence Band: 95%)
            <Info className="w-3 h-3" />
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-indigo-600"
              title={isZoomed ? "Kecilkan Chart" : "Besarkan Chart"}
            >
              {isZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded text-[9px] font-bold text-amber-700 uppercase tracking-tight">
              <ShieldCheck className="w-2.5 h-2.5" />
              Conservative Mode
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={derivedMetrics.enrichedForecast}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="timestamp" 
              fontSize={9} 
              tickMargin={10} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(str) => {
                const date = new Date(str);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis 
              fontSize={9} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(v) => `${v} ${derivedMetrics.unit}`}
            />
            <Tooltip content={<ForecastTooltip unit={derivedMetrics.unit} />} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            
            {/* Confidence Area (Upper & Lower Band) */}
            <Area 
              type="monotone" 
              dataKey="upper_bound" 
              stroke="none" 
              fill="#6366f1" 
              fillOpacity={0.1} 
              name="Confidence Area"
              activeDot={false}
            />
            <Area 
              type="monotone" 
              dataKey="lower_bound" 
              stroke="none" 
              fill="#ffffff" 
              fillOpacity={1} 
              activeDot={false}
            />

            {/* Main Projection Line */}
            <Line 
              type="monotone" 
              dataKey="projected_value" 
              stroke="#6366f1" 
              strokeWidth={3} 
              dot={false}
              name="Projected Value"
            />

            {/* Capacity Reference Line */}
            <ReferenceLine 
              y={derivedMetrics.capacity} 
              stroke="#f43f5e" 
              strokeDasharray="5 5" 
              label={{ position: 'right', value: 'CAPACITY', fill: '#f43f5e', fontSize: 8, fontWeight: 'bold' }} 
            />

            {isZoomed && (
              <Brush 
                dataKey="timestamp" 
                height={20} 
                stroke="#6366f1" 
                fill="#f8fafc"
                tickFormatter={(str) => new Date(str).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                travellerWidth={10}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendation & Warning */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${
        derivedMetrics.ttcStatus === 'CRITICAL' ? 'bg-rose-50 border-rose-100 text-rose-800' :
        derivedMetrics.ttcStatus === 'WARNING' ? 'bg-amber-50 border-amber-100 text-amber-800' :
        'bg-indigo-50 border-indigo-100 text-indigo-800'
      }`}>
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
          derivedMetrics.ttcStatus === 'CRITICAL' ? 'text-rose-500' :
          derivedMetrics.ttcStatus === 'WARNING' ? 'text-amber-500' :
          'text-indigo-500'
        }`} />
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-tight">Rekomendasi Kapasitas</p>
          <p className="text-xs leading-relaxed opacity-90">
            {derivedMetrics.ttcStatus === 'CRITICAL' && "Kapasitas diprediksi penuh dalam waktu dekat. Segera lakukan upgrade hardware atau limitasi traffic untuk menjaga stabilitas."}
            {derivedMetrics.ttcStatus === 'WARNING' && "Tren penggunaan menunjukkan peningkatan signifikan. Lakukan evaluasi optimasi QoS atau rencanakan upgrade dalam 30 hari ke depan."}
            {derivedMetrics.ttcStatus === 'STABLE' && "Kapasitas sistem saat ini masih sangat mencukupi untuk menangani proyeksi beban hingga akhir horizon (7 hari+)."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CapacityForecast;
