import { useMemo } from 'react';
import { formatBytesAuto, standardizeTableData, toMbps } from '../analysis_utils.jsx';

/**
 * Hook khusus untuk Statistik Deskriptif & Agregasi (Layer DESCRIPTIVE)
 * Bertanggung jawab atas visualisasi data mentah dan ringkasan angka.
 */
export const useDescriptiveStats = (reportData, options = {}) => {
  const { granularity = 'auto', filterPositive = false, aggMethod = 'AVG', period = 'daily' } = options;
  const ALLOW_HEAVY_FRONTEND = false;

  const formatTableTime = (r) => {
    const rawDate = r.log_time || r.log_date || r.log_month || r.created_at || r.last_update;
    if (!rawDate) return 'N/A';
    try {
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const resourceUsageStats = useMemo(() => {
    if (!reportData || reportData.length === 0) return { cpu: 0, mem: 0, cpu_usage: 0, mem_usage: 0, cpu_p: 0, samples: [] };
    
    const samples = reportData.slice(-10).map(r => {
      const standardized = standardizeTableData([r], 'resource')[0];
      return {
        date: r.log_time || r.log_date || r.log_month || r.created_at || 'N/A',
        cpu: standardized.cpu_percent_standard,
        mem: standardized.mem_usage,
        cpu_p: standardized.cpu_p
      };
    }).reverse();

    const latest = standardizeTableData([reportData[reportData.length - 1]], 'resource')[0];
    const safeFixed = (v) => (typeof v === 'number' && isFinite(v)) ? v.toFixed(1) : '-';
    const cpuArr = reportData.map(r => standardizeTableData([r], 'resource')[0]?.cpu_percent_standard).filter(v => typeof v === 'number' && isFinite(v));
    const memArr = reportData.map(r => standardizeTableData([r], 'resource')[0]?.mem_usage).filter(v => typeof v === 'number' && isFinite(v));
    const aggFn = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return null;
      switch (String(aggMethod || 'AVG').toUpperCase()) {
        case 'MAX': return Math.max(...arr);
        case 'MIN': return Math.min(...arr);
        case 'SUM': return arr.reduce((a, b) => a + b, 0);
        case 'AVG':
        default: return arr.reduce((a, b) => a + b, 0) / arr.length;
      }
    };
    const cpuAgg = period === 'daily' ? aggFn(cpuArr) : null;
    const memAgg = period === 'daily' ? aggFn(memArr) : null;
    const memUsageStr = (typeof (memAgg ?? latest.mem_usage) === 'number' && isFinite(memAgg ?? latest.mem_usage)) ? (memAgg ?? latest.mem_usage).toFixed(1) : '-';

    return {
      cpu: safeFixed(cpuAgg ?? latest.cpu_percent_standard),
      mem: memUsageStr,
      cpu_usage: safeFixed(cpuAgg ?? latest.cpu_percent_standard),
      mem_usage: memUsageStr,
      cpu_p: safeFixed(latest.cpu_p),
      samples
    };
  }, [reportData, aggMethod, period]);

  const trafficUsageStats = useMemo(() => {
    if (!reportData || reportData.length === 0) return { rx: 0, tx: 0, samples: [] };
    
    const samples = reportData.slice(-10).map(r => {
      const standardized = standardizeTableData([r], 'traffic')[0];
      return {
        date: r.log_time || r.log_date || r.log_month || r.created_at || 'N/A',
        rx: standardized.rx,
        tx: standardized.tx,
        total: standardized.total
      };
    }).reverse();

    const latest = standardizeTableData([reportData[reportData.length - 1]], 'traffic')[0];
    
    return {
      rx: latest.rx,
      tx: latest.tx,
      total: latest.total,
      samples
    };
  }, [reportData]);

  const pivotTables = useMemo(() => {
    return null;
  }, [reportData, granularity, filterPositive, ALLOW_HEAVY_FRONTEND]);

  const topInterfacesFixed = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    const latest = reportData[reportData.length - 1];
    const interfaces = latest.interface_analysis || [];
    return interfaces.slice(0, 3).map(i => ({
      name: i.interface_name || 'N/A',
      rxMbps: toMbps(Number(i.rx_bytes || 0)).toFixed(1),
      txMbps: toMbps(Number(i.tx_bytes || 0)).toFixed(1)
    }));
  }, [reportData]);

  const clientCountStats = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    return reportData.slice(-10).map(r => ({
      displayTime: formatTableTime(r),
      pppoe: Number(r.total_pppoe || r.pppoe_count || 0),
      hotspot: Number(r.total_hotspot || r.hotspot_count || 0)
    })).reverse();
  }, [reportData]);

  const pppoeUsageStats = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    return reportData.slice(-10).map(r => {
      const dl = Number(r.download_bytes || r.rx_bytes || 0);
      const ul = Number(r.upload_bytes || r.tx_bytes || 0);
      return {
        displayTime: formatTableTime(r),
        count: Number(r.total_pppoe || r.pppoe_users || 0),
        user: r.pppoe_username || r.username || 'N/A',
        total_bytes: dl + ul
      };
    }).reverse();
  }, [reportData]);

  const hotspotUsageStats = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    return reportData.slice(-10).map(r => {
      const dl = Number(r.daily_download || r.rx_bytes || 0);
      const ul = Number(r.daily_upload || r.tx_bytes || 0);
      return {
        displayTime: formatTableTime(r),
        count: Number(r.total_hotspot || r.hotspot_users || 0),
        user: r.username || r.hotspot_username || 'N/A',
        total_bytes: dl + ul
      };
    }).reverse();
  }, [reportData]);

  const interfaceUsageStats = useMemo(() => {
    if (!reportData || reportData.length === 0) return { samples: [] };
    const samples = reportData.slice(-10).map(r => {
      const rx = Number(r.total_rx_bytes || r.rx_bytes || 0);
      const tx = Number(r.total_tx_bytes || r.tx_bytes || 0);
      return {
        displayTime: formatTableTime(r),
        name: r.interface_name || r.interface || 'N/A',
        rx, tx
      };
    }).reverse();
    return { samples };
  }, [reportData]);

  return {
    resourceUsageStats,
    trafficUsageStats,
    pivotTables,
    topInterfacesFixed,
    clientCountStats,
    pppoeUsageStats,
    hotspotUsageStats,
    interfaceUsageStats,
    formatTableTime,
    formatBytesAuto
  };
};
