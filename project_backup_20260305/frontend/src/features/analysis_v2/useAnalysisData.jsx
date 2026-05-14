import { useMemo, useCallback } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { 
  standardizeTableData, 
  sum, 
  avg, 
  max, 
  std, 
  bytesToUnit,
  toMbps
} from '../analysis_utils.jsx';

/**
 * Custom hook to process and derive analysis metrics from raw backend data.
 * Follows the rule: Move logic (fetch, filter, complex state) to custom hook.
 */
export const useAnalysisData = ({
  reportRows = [],
  heavyAnalysis,
  analysisSummary,
  isKpiLoading,
  isHeavyLoading,
  comparePrev,
  usageUnit,
  period,
  aggMethod,
  serverBuckets = null,
  useServerBuckets = false
}) => {
  const normalizedAgg = String(aggMethod || 'AVG').toUpperCase();
  const isDailyAggActive = period === 'daily' && ['AVG', 'MAX', 'SUM', 'MIN'].includes(normalizedAgg);
  const aggFn = useCallback((arr) => {
    const a = Array.isArray(arr) ? arr.filter(v => Number.isFinite(Number(v))) : [];
    if (a.length === 0) return 0;
    switch (normalizedAgg) {
      case 'MAX': return Math.max(...a);
      case 'MIN': return Math.min(...a);
      case 'SUM': return sum(a);
      case 'AVG':
      default: return avg(a);
    }
  }, [normalizedAgg]);
  const getDayKey = useCallback((r) => {
    const raw = r.log_time || r.log_date || r.log_month || r.date;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const iso = d.toISOString();
    return iso.slice(0, 10); // YYYY-MM-DD
  }, []);
  const aggregateDailyTraffic = useCallback((rows) => {
    if (!isDailyAggActive) return null;
    const std = standardizeTableData(rows, 'traffic');
    const buckets = new Map();
    for (const s of std) {
      const key = getDayKey(s);
      if (!key) continue;
      const prev = buckets.get(key) || { rx: [], tx: [], total: [] };
      prev.rx.push(Number(s.rx || 0));
      prev.tx.push(Number(s.tx || 0));
      prev.total.push(Number(s.total || 0));
      buckets.set(key, prev);
    }
    const result = Array.from(buckets.entries())
      .map(([key, vals]) => ({
        key,
        displayDate: new Date(key).toLocaleDateString(),
        rx: aggFn(vals.rx),
        tx: aggFn(vals.tx),
        total: aggFn(vals.total),
      }))
      .sort((a, b) => new Date(a.key) - new Date(b.key));
    return result;
  }, [isDailyAggActive, aggFn, getDayKey]);
  const aggregateDailyResource = useCallback((rows) => {
    if (!isDailyAggActive) return null;
    const std = standardizeTableData(rows, 'resource');
    const buckets = new Map();
    for (const s of std) {
      const key = getDayKey(s);
      if (!key) continue;
      const prev = buckets.get(key) || { cpu: [], mem: [], cpu_p: [] };
      prev.cpu.push(Number(s.cpu_percent_standard ?? s.cpu ?? 0));
      prev.mem.push(Number(s.mem_usage ?? s.mem ?? 0));
      prev.cpu_p.push(Number(s.cpu_p ?? s.cpu_percent_standard ?? 0));
      buckets.set(key, prev);
    }
    const result = Array.from(buckets.entries())
      .map(([key, vals]) => ({
        key,
        displayDate: new Date(key).toLocaleDateString(),
        cpu_percent_standard: aggFn(vals.cpu),
        mem_usage: aggFn(vals.mem),
        cpu_p: aggFn(vals.cpu_p),
      }))
      .sort((a, b) => new Date(a.key) - new Date(b.key));
    return result;
  }, [isDailyAggActive, aggFn, getDayKey]);
  // 1. Data Standardizations
  const totals = useMemo(() => {
    if (!Array.isArray(reportRows)) return [];
    const aggregated = aggregateDailyTraffic(reportRows);
    if (aggregated) return aggregated.map(r => r.total);
    const standardized = standardizeTableData(reportRows, 'traffic');
    return standardized.map(r => Number(r.total || 0));
  }, [reportRows, period, normalizedAgg, aggregateDailyTraffic]);

  const cpuArr = useMemo(() => {
    if (!Array.isArray(reportRows)) return [];
    const aggregated = aggregateDailyResource(reportRows);
    if (aggregated) return aggregated.map(r => Number(r.cpu_percent_standard || 0));
    const standardized = standardizeTableData(reportRows, 'resource');
    return standardized.map(r => Number(r.cpu));
  }, [reportRows, period, normalizedAgg, aggregateDailyResource]);

  const memArr = useMemo(() => {
    if (!Array.isArray(reportRows)) return [];
    const aggregated = aggregateDailyResource(reportRows);
    if (aggregated) return aggregated.map(r => Number(r.mem_usage || 0));
    const standardized = standardizeTableData(reportRows, 'resource');
    return standardized.map(r => Number(r.mem));
  }, [reportRows, period, normalizedAgg, aggregateDailyResource]);

  // 2. Percentiles: gunakan backend saja (no heavy aggregation di frontend)

  const p95Bytes = useMemo(() => {
    if (heavyAnalysis?.percentiles?.p95_dl) return heavyAnalysis.percentiles.p95_dl;
    if (heavyAnalysis?.p95) return heavyAnalysis.p95;
    return 0;
  }, [heavyAnalysis]);

  const p99Bytes = useMemo(() => {
    if (heavyAnalysis?.percentiles?.p99_dl) return heavyAnalysis.percentiles.p99_dl;
    if (heavyAnalysis?.p99) return heavyAnalysis.p99;
    return 0;
  }, [heavyAnalysis]);

  const peakBytes = useMemo(() => max(totals), [totals]);
  const totalBytes = useMemo(() => sum(totals), [totals]);
  const cpuAvg = useMemo(() => avg(cpuArr), [cpuArr]);
  const cpuMax = useMemo(() => max(cpuArr), [cpuArr]);
  const memAvg = useMemo(() => avg(memArr), [memArr]);
  const memMax = useMemo(() => max(memArr), [memArr]);

  // 3. Deltas (Comparison with previous period)
  const computeDeltaPct = useCallback((arr) => {
    if (!comparePrev || arr.length < 2) return null;
    const half = Math.floor(arr.length / 2);
    if (half < 1) return null;
    const curr = sum(arr.slice(-half));
    const prev = sum(arr.slice(0, half));
    return prev === 0 ? null : ((curr - prev) / prev) * 100;
  }, [comparePrev]);

  const totalDelta = useMemo(() => computeDeltaPct(totals), [totals, computeDeltaPct]);

  const p95Delta = useMemo(() => {
    if (!comparePrev) return null;
    if (!(heavyAnalysis?.percentiles?.p95_dl)) return null;
    return null;
  }, [comparePrev, heavyAnalysis]);

  const p99Delta = useMemo(() => {
    if (!comparePrev) return null;
    if (!(heavyAnalysis?.percentiles?.p99_dl)) return null;
    return null;
  }, [comparePrev, heavyAnalysis]);

  // 4. Health Score
  const healthScore = useMemo(() => {
    if (isKpiLoading || isHeavyLoading || !reportRows.length) return null;
    
    const hStats = heavyAnalysis?.health_stats || {
      avg_cpu: cpuAvg,
      peak_cpu: cpuMax,
      avg_mem: memAvg,
      resource_alerts: 0,
      cpu_std: std(cpuArr),
      mem_std: std(memArr)
    };

    const cpuScore = Math.max(0, 100 - hStats.avg_cpu) * 0.3;
    const cpuPenalty = hStats.peak_cpu > 90 ? 15 : hStats.peak_cpu > 70 ? 5 : 0;
    const memScore = Math.max(0, 100 - hStats.avg_mem) * 0.3;
    const memPenalty = hStats.avg_mem > 90 ? 15 : hStats.avg_mem > 70 ? 5 : 0;
    
    const mu = hStats.avg_cpu; // Simplified, use backend pre-calculated
    const sigma = hStats.cpu_std;
    const cv = mu > 0 ? sigma / mu : 0;
    const stabilityScore = Math.max(0, 100 - (cv * 50)) * 0.2;
    
    let anomalyCount = heavyAnalysis?.anomalies ? heavyAnalysis.anomalies.length : 0;
    const anomalyScore = Math.max(0, 100 - (anomalyCount * 20)) * 0.2;
    
    const finalScore = Math.max(0, cpuScore + memScore + stabilityScore + anomalyScore - cpuPenalty - memPenalty - (hStats.resource_alerts * 5));
    
    return { 
      score: Math.round(finalScore), 
      status: finalScore >= 75 ? 'Sangat Baik' : finalScore >= 50 ? 'Waspada' : 'Kritis',
      color: finalScore >= 75 ? 'text-emerald-600' : finalScore >= 50 ? 'text-amber-600' : 'text-rose-600',
      bgColor: finalScore >= 75 ? 'bg-emerald-50' : finalScore >= 50 ? 'bg-amber-50' : 'bg-rose-50',
      icon: finalScore >= 75 ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />
    };
  }, [cpuAvg, cpuMax, memAvg, cpuArr, memArr, isKpiLoading, isHeavyLoading, heavyAnalysis, reportRows]);

  // 5. RCA Data
  const rcaData = useMemo(() => {
    if (heavyAnalysis?.anomalies?.length > 0) {
      return heavyAnalysis.anomalies.map(a => ({
        date: a.date,
        isTrafficSpike: Math.abs(a.traffic_z_score) >= 2.5,
        isCpuSpike: Math.abs(a.cpu_z_score) >= 2.5,
        isMemSpike: Math.abs(a.mem_z_score) >= 2.0,
        type: (Math.abs(a.traffic_z_score) >= 2.5 && Math.abs(a.cpu_z_score) >= 2.5) ? 'Network Load' : 
              (Math.abs(a.cpu_z_score) >= 2.5) ? 'System Task' : 'Optimized Traffic'
      })).slice(-5).reverse();
    }
    return null;
  }, [heavyAnalysis]);

  // 6. Forecast
  const forecast = useMemo(() => {
    if (heavyAnalysis?.forecast) {
      const f = heavyAnalysis.forecast;
      const n = totals.length;
      return {
        cpu: { 
          slope: f.cpu.slope, 
          nextVal: f.cpu.slope * (n + 7) + f.cpu.intercept, 
          daysTo90: Math.round(f.cpu.slope > 0 ? (90 - f.cpu.intercept) / f.cpu.slope : Infinity) 
        },
        mem: { 
          slope: f.memory.slope, 
          nextVal: f.memory.slope * (n + 7) + f.memory.intercept, 
          daysTo90: Math.round(f.memory.slope > 0 ? (90 - f.memory.intercept) / f.memory.slope : Infinity) 
        },
        traffic: { 
          slope: f.traffic.slope, 
          nextVal: f.traffic.slope * (n + 7) + f.traffic.intercept 
        }
      };
    }
    return null;
  }, [heavyAnalysis, totals]);

  // 7. Data Quality
  const dataQuality = useMemo(() => {
    if (!reportRows.length) return { score: 100, missing: 0 };
    const missing = reportRows.filter(r => !r.cpu || !r.memory).length;
    const score = Math.round(Math.max(0, 100 - (missing / reportRows.length * 100)));
    return { score, missing };
  }, [reportRows]);

  // 8. Top Growth
  const topGrowthUsers = useMemo(() => {
    if (isKpiLoading || isHeavyLoading) return [];
    
    // Prioritize backend-calculated growth
    if (heavyAnalysis?.top_growth_users) {
      return heavyAnalysis.top_growth_users.map(u => ({
        name: u.name,
        growth: u.growth,
        currentUsage: u.current_usage,
        isHigh: u.growth > 50 && u.current_usage > (10 * 1024 * 1024)
      }));
    }

    return [];
  }, [heavyAnalysis, isKpiLoading, isHeavyLoading]);

  // 9. Chart Data
  const trafficTrendData = useMemo(() => {
    if (useServerBuckets && serverBuckets?.traffic?.length && usageUnit === 'Mbps') {
      return serverBuckets.traffic.map(p => {
        const dlVal = Number(p.dl || 0);
        const ulVal = Number(p.ul || 0);
        return { date: new Date(p.date || p.period).toLocaleDateString(), dl: Number(dlVal.toFixed(2)), ul: Number(ulVal.toFixed(2)) };
      });
    }
    if (!reportRows.length) return [];
    const aggregated = aggregateDailyTraffic(reportRows);
    const rows = aggregated || [...standardizeTableData(reportRows, 'traffic')]
      .sort((a, b) => new Date(a.log_time || a.log_date || a.log_month) - new Date(b.log_time || b.log_date || b.log_month))
      .map(r => ({
        displayDate: r.displayDate,
        rx: Number(r.rx || 0),
        tx: Number(r.tx || 0)
      }));
    return rows.map(r => {
      const dlVal = Number(r.rx || 0);
      const ulVal = Number(r.tx || 0);
      if (usageUnit === 'Mbps') {
        return {
          date: r.displayDate,
          dl: Number(toMbps(dlVal).toFixed(2)),
          ul: Number(toMbps(ulVal).toFixed(2))
        };
      }
      return {
        date: r.displayDate,
        dl: bytesToUnit(dlVal, usageUnit),
        ul: bytesToUnit(ulVal, usageUnit)
      };
    });
  }, [reportRows, usageUnit, period, normalizedAgg, aggregateDailyTraffic, serverBuckets, useServerBuckets]);

  const resourceTrendData = useMemo(() => {
    if (useServerBuckets && serverBuckets?.resource?.length) {
      return serverBuckets.resource.map(p => ({
        date: new Date(p.date || p.period).toLocaleDateString(),
        cpu: Number(p.cpu || p.cpu_usage || 0),
        mem: Number(p.mem || p.mem_usage || 0),
        cpu_usage: Number(p.cpu || p.cpu_usage || 0),
        mem_usage: Number(p.mem || p.mem_usage || 0),
        cpu_p: Number(p.cpu || p.cpu_usage || 0),
      }));
    }
    if (!reportRows.length) return [];
    const aggregated = aggregateDailyResource(reportRows);
    if (aggregated) {
      return aggregated.map(r => ({
        date: r.displayDate,
        cpu: r.cpu_percent_standard,
        mem: r.mem_usage,
        cpu_usage: r.cpu_percent_standard,
        mem_usage: r.mem_usage,
        cpu_p: r.cpu_p
      }));
    }
    const standardized = standardizeTableData(reportRows, 'resource');
    return [...standardized]
      .sort((a, b) => new Date(a.log_time || a.log_date || a.log_month) - new Date(b.log_time || b.log_date || b.log_month))
      .map(r => ({
        date: r.displayDate,
        cpu: r.cpu_percent_standard,
        mem: r.mem_usage,
        cpu_usage: r.cpu_percent_standard,
        mem_usage: r.mem_usage,
        cpu_p: r.cpu_p
      }));
  }, [reportRows, period, normalizedAgg, aggregateDailyResource, serverBuckets, useServerBuckets]);

  return {
    totals,
    cpuArr,
    memArr,
    p95Bytes,
    p99Bytes,
    peakBytes,
    totalBytes,
    cpuAvg,
    cpuMax,
    memAvg,
    memMax,
    totalDelta,
    p95Delta,
    p99Delta,
    healthScore,
    rcaData,
    forecast,
    dataQuality,
    topGrowthUsers,
    trafficTrendData,
    resourceTrendData,
    todayTraffic: analysisSummary?.today_traffic ? { 
      dl: analysisSummary.today_traffic.rx, 
      ul: analysisSummary.today_traffic.tx, 
      total: analysisSummary.today_traffic.rx + analysisSummary.today_traffic.tx 
    } : { dl: 0, ul: 0, total: 0 }
  };
};
