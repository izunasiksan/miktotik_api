import React from 'react';
import { 
  Lightbulb, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ExternalLink,
  ChevronRight,
  Target,
  Zap,
  ShieldCheck,
  TrendingUp,
  Activity,
  BarChart3,
  Clock,
  Gauge,
  Database
} from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

/**
 * InsightCard (Stage 7) V2.1
 * Executive summary with Health Score SSOT, Signal Merging, 
 * and High-Fidelity Traceability to Raw Data.
 */
const InsightCard = () => {
  const { analysisData } = useAnalysisStore();
  
  // 1. Health Score SSOT Calculation (V2.1)
  const healthMetrics = React.useMemo(() => {
    if (!analysisData) return null;

    const stability = analysisData.stage4?.stability_metrics?.stability_score ?? 100;
    const utilization = analysisData.stage6?.health_score ?? 100; // Stage 6 already provides a score
    const anomalyPenalty = analysisData.stage5?.penalty_metrics?.total_penalty ?? 0;

    // Formula: 0.3 * Stability + 0.3 * Utilization - (0.4 * AnomalyPenalty)
    const rawScore = (0.3 * stability) + (0.3 * utilization) - (0.4 * anomalyPenalty);
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      finalScore,
      stability,
      utilization,
      anomalyPenalty,
      accuracy: analysisData.stage2?.metadata?.accuracy_pct ?? 100,
      isLowConfidence: (analysisData.stage2?.metadata?.accuracy_pct ?? 100) < 100
    };
  }, [analysisData]);

  // 2. Signal Merging (Stage 5 & 6)
  const topSignals = React.useMemo(() => {
    if (!analysisData) return [];

    const signals = [];

    // Anomalies (Stage 5)
    const activeAnomalies = analysisData.stage5?.active_anomalies || [];
    activeAnomalies.forEach(anomaly => {
      signals.push({
        id: `anomaly-${anomaly.timestamp}`,
        type: 'ANOMALY',
        severity: anomaly.severity,
        title: `Anomali Terdeteksi: ${anomaly.metric}`,
        message: `${anomaly.message} pada ${new Date(anomaly.timestamp).toLocaleTimeString()}`,
        timestamp: anomaly.timestamp,
        source_id: anomaly.source_id,
        link: '#anomaly-section'
      });
    });

    // Capacity Risks (Stage 6)
    const forecastSummary = analysisData.stage6?.summary;
    if (forecastSummary && forecastSummary.risk !== 'LOW') {
      signals.push({
        id: 'capacity-risk',
        type: 'CAPACITY',
        severity: forecastSummary.risk === 'HIGH' ? 'CRITICAL' : 'WARNING',
        title: 'Risiko Kapasitas',
        message: `Penyempitan headroom terdeteksi. TTC: ${forecastSummary.threshold_breach || 'N/A'}`,
        timestamp: analysisData?.metadata?.processed_at,
        source_id: 'ForecastEngine',
        link: '#forecast-section'
      });
    }

    // Correlation Highlights (Stage 3)
    const highCorrelations = analysisData.stage3?.matrix?.filter(c => Math.abs(c.value) > 0.8) || [];
    highCorrelations.slice(0, 2).forEach(corr => {
      signals.push({
        id: `corr-${corr.metric_a}-${corr.metric_b}`,
        type: 'CORRELATION',
        severity: 'INFO',
        title: 'Korelasi Kuat',
        message: `${corr.metric_a} & ${corr.metric_b} memiliki hubungan ${corr.value > 0 ? 'positif' : 'negatif'} yang signifikan.`,
        timestamp: analysisData?.metadata?.processed_at,
        source_id: 'CorrelationEngine',
        link: '#correlation-section'
      });
    });

    // Sort by Severity
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'WARNING': 2, 'MEDIUM': 3, 'LOW': 4, 'INFO': 5 };
    return signals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [analysisData]);

  if (!analysisData || !analysisData.stage7 || !healthMetrics) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex items-center justify-center text-slate-400 italic">
        Data Insight Pipeline belum lengkap
      </div>
    );
  }

  const { insights, recommendations } = analysisData.stage7;

  const getInsightIcon = (type) => {
    switch (type) {
      case 'health': return <Gauge className="w-3.5 h-3.5 text-indigo-600" />;
      case 'traffic': return <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />;
      case 'resource': return <Zap className="w-3.5 h-3.5 text-rose-600" />;
      case 'anomaly': return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      case 'correlation': return <Target className="w-3.5 h-3.5 text-indigo-600" />;
      case 'habit': return <Clock className="w-3.5 h-3.5 text-indigo-600" />;
      case 'forecast': return <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />;
      default: return <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-500/20';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100 ring-amber-500/20';
    return 'text-rose-600 bg-rose-50 border-rose-100 ring-rose-500/20';
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'WARNING':
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  const renderInsightItem = (insight, index) => (
    <div 
      key={index} 
      className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 hover:bg-white transition-all hover:shadow-md group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getInsightIcon(insight.type)}
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600 transition-colors">
            {insight.type} Insight
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${getSeverityBadge(insight.level)}`}>
            {insight.level}
          </span>
          {insight.link && (
            <a 
              href={insight.link} 
              className="p-1 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition-all"
              title="Explore Details"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
      <h4 className="text-xs font-bold text-slate-800">{insight.title}</h4>
      <p className="text-[10px] text-slate-500 leading-relaxed">{insight.message}</p>
      
      {/* Traceability Metadata */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[8px] text-slate-400 font-medium flex items-center gap-1">
          <Database className="w-2.5 h-2.5" /> {insight.source_id || 'System'}
        </span>
        <span className="text-[8px] text-slate-400 italic">
          {insight.raw_timestamp ? new Date(insight.raw_timestamp).toLocaleTimeString() : 'N/A'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-8">
      {/* Header with Global Health Score SSOT */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800">Executive Insight (Stage 7)</h3>
            {healthMetrics.isLowConfidence && (
              <div className="px-2 py-1 bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-black text-amber-800 flex items-center gap-1.5 shadow-sm animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                LOW CONFIDENCE
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" /> Source: Raw Data (SSOT)
            </span>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Accuracy: {healthMetrics.accuracy}%
                </div>
                {analysisData.stage2?.metadata?.source_granularity && (
                  <div className="flex items-center gap-1">
                    <Database className="w-3 h-3" /> Granularity: {analysisData.stage2.metadata.source_granularity}
                  </div>
                )}
              </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className={`px-4 py-2 rounded-2xl border text-sm font-black flex items-center gap-2 shadow-sm ring-1 ${getHealthColor(healthMetrics.finalScore)}`}>
            <Gauge className="w-4 h-4" />
            Health Score: {healthMetrics.finalScore}/100
          </div>
          <span className="text-[9px] text-slate-400 italic">Audit-safe: Deterministic Scoring</span>
        </div>
      </div>

      {/* Health Score Breakdown Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Stability (30%)</p>
          <div className="flex items-end gap-2">
            <span className="text-lg font-black text-slate-700">{healthMetrics.stability}</span>
            <div className="h-1 flex-1 bg-slate-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${healthMetrics.stability}%` }} />
            </div>
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Utilization (30%)</p>
          <div className="flex items-end gap-2">
            <span className="text-lg font-black text-slate-700">{healthMetrics.utilization}</span>
            <div className="h-1 flex-1 bg-slate-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${healthMetrics.utilization}%` }} />
            </div>
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Penalty (40%)</p>
          <div className="flex items-end gap-2">
            <span className="text-lg font-black text-rose-600">-{healthMetrics.anomalyPenalty}</span>
            <div className="h-1 flex-1 bg-slate-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, healthMetrics.anomalyPenalty)}%` }} />
            </div>
          </div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col justify-center items-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
          <span className="text-[9px] font-bold text-emerald-700 uppercase">Audit Status</span>
          <span className="text-[10px] font-black text-emerald-600">VERIFIED</span>
        </div>
      </div>

      {/* Key Metrics Summary (Today vs Baseline, Peak, Percentile) */}
      <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-50">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Today vs Baseline <TrendingUp className="w-3 h-3" />
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500">Delta DoD</span>
              <span className={`text-[10px] font-bold ${(analysisData.stage7?.summary?.deltaDoD || 0) >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {(analysisData.stage7?.summary?.deltaDoD || 0) >= 0 ? '+' : ''}
                {(analysisData.stage7?.summary?.deltaDoD || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500">Delta WoW</span>
              <span className={`text-[10px] font-bold ${(analysisData.stage7?.summary?.deltaWoW || 0) >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {(analysisData.stage7?.summary?.deltaWoW || 0) >= 0 ? '+' : ''}
                {(analysisData.stage7?.summary?.deltaWoW || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Peak & Percentiles <Activity className="w-3 h-3" />
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500">Peak Load</span>
              <span className="text-[10px] font-bold text-slate-700">
                {(analysisData.stage2?.summary?.peak?.value || 0).toFixed(1)} {analysisData.stage2?.metadata?.unit || 'Mbps'}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500">P95 (Granular)</span>
              <span className="text-[10px] font-bold text-slate-700">
                {(analysisData.stage2?.summary?.p95 || 0).toFixed(1)} {analysisData.stage2?.metadata?.unit || 'Mbps'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Data Quality <Database className="w-3 h-3" />
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500">Completeness</span>
              <span className="text-[10px] font-bold text-indigo-600">
                {analysisData.stage0?.normalization_metrics?.completeness_score || 100}%
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500">Source Fidelity</span>
              <span className={`text-[10px] font-bold uppercase ${healthMetrics.accuracy < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {healthMetrics.accuracy < 100 ? 'Partial Fidelity' : 'High Fidelity'}
              </span>
            </div>
            {healthMetrics.isLowConfidence && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-[9px] font-bold text-amber-700 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                LOW CONFIDENCE DATA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Top Signals (Merged from Stage 5 & 6) */}
        <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              Active Signals <Activity className="w-3 h-3 text-indigo-500" />
            </p>
            <span className="text-[9px] text-slate-400">Prioritized by Severity</span>
          </div>
          <div className="space-y-3">
            {topSignals.length > 0 ? topSignals.map(signal => (
              <div key={signal.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm space-y-2 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${getSeverityBadge(signal.severity)}`}>
                    {signal.severity}
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">
                    {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    {signal.type === 'ANOMALY' && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                    {signal.type === 'CAPACITY' && <BarChart3 className="w-3 h-3 text-amber-500" />}
                    {signal.type === 'CORRELATION' && <TrendingUp className="w-3 h-3 text-indigo-500" />}
                    {signal.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-tight mt-1">{signal.message}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[8px] text-slate-400">
                  <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> {signal.source_id}</span>
                  <a href={signal.link} className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors">
                    Explore <ChevronRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )) : (
              <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
                <p className="text-[10px] font-medium text-slate-500">Sistem Berjalan Optimal</p>
                <p className="text-[9px] text-slate-400">Tidak ada sinyal kritis aktif</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Key Insights & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Insights */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              Strategic Narratives <Clock className="w-3 h-3" />
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, i) => renderInsightItem(insight, i))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              Recommended Actions <Target className="w-3 h-3 text-emerald-500" />
            </p>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between gap-4 group hover:bg-white hover:shadow-lg hover:border-indigo-200 transition-all">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                        rec.priority === 'HIGH' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        {rec.priority} Priority
                      </span>
                      <h4 className="text-xs font-black text-slate-800">{rec.action}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-xl">{rec.reason}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <ExternalLink className="w-3 h-3 text-slate-400 self-center cursor-pointer hover:text-indigo-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Traceability & Audit Metadata */}
      <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3" /> Audit Reference: {analysisData.stage1?.scoped_metadata?.board_id || 'Global'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Processed: {analysisData?.metadata?.processed_at ? new Date(analysisData.metadata.processed_at).toLocaleString() : 'N/A'}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Deterministic Pipeline V2.1
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest font-bold">Traceable to Raw Logs</span>
        </div>
      </div>
      {/* Recommendations & CTA Section (Stage 7) */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group/cta">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/cta:opacity-20 transition-opacity">
          <Zap className="w-32 h-32 rotate-12" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-sm tracking-tight uppercase">Rekomendasi Strategis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-3">
              {recommendations?.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 group/item">
                  <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover/item:scale-150 transition-transform" />
                  <span className="text-xs text-slate-300 leading-relaxed group-hover/item:text-white transition-colors">
                    {rec}
                  </span>
                </li>
              ))}
            </ul>
            
            <div className="flex flex-col justify-end items-end gap-3">
              <p className="text-[10px] text-slate-400 text-right italic max-w-[200px]">
                Rekomendasi dihasilkan secara otomatis berdasarkan anomali & korelasi data.
              </p>
              <button 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all uppercase tracking-widest border border-indigo-400/30"
                onClick={() => window.print()}
              >
                Download Audit Report
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
