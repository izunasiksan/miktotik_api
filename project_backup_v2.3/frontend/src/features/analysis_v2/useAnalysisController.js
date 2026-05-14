import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  getBoards, 
  getDailyReports, 
  getMonthlyReports, 
  getHeavyAnalysis, 
  getAnalysisSummary,
  getInterfaceAnalysis,
  getPPPoEAnalysis,
  getHotspotAnalysis,
  getClientsAnalysis,
  getTimeAggregate
} from '../../../services/api.js';
import { standardizeTableData, toMbps, bytesToUnit, validateFilterParams, METRIC_REGISTRY } from '../analysis_utils.jsx';

export const useAnalysisController = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State Aktif (yang digunakan untuk fetch data)
  const [activeBoard, setActiveBoard] = useState(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('board');
    if (fromUrl) return fromUrl;
    try {
      const raw = localStorage.getItem('INSIGHT_PREFS');
      if (raw) {
        const v = JSON.parse(raw);
        if (v.selectedBoard) return v.selectedBoard;
        if (v.lastBoard) return v.lastBoard;
      }
    } catch { /* ignore */ }
    return '';
  });
  const [activePeriod, setActivePeriod] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('period')) return params.get('period');
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return 'daily';
    try { const v = JSON.parse(raw); return v.period || 'daily'; } catch { return 'daily'; }
  });
  const [activeLimit, setActiveLimit] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('limit')) return Number(params.get('limit'));
    let defaultPeriod = 'daily';
    try {
      if (params.get('period')) {
        defaultPeriod = params.get('period');
      } else {
        const raw = localStorage.getItem('INSIGHT_PREFS');
        if (raw) {
          const v = JSON.parse(raw);
          defaultPeriod = v.period || 'daily';
        }
      }
    } catch { /* ignore */ }
    return defaultPeriod === 'monthly' ? 6 : 14;
  });
  const [activePivotAgg, setActivePivotAgg] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('pivotAgg') || 'sum';
  });
  const [activeStartDate, setActiveStartDate] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('start') || null;
  });
  const [activeEndDate, setActiveEndDate] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('end') || null;
  });
  const [activeComparePrev, setActiveComparePrev] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return false;
    try { const v = JSON.parse(raw); return typeof v.comparePrev === 'boolean' ? v.comparePrev : false; } catch { return false; }
  });
  const [activeAggMethod, setActiveAggMethod] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('agg')) return params.get('agg').toUpperCase();
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return 'AVG';
    try { const v = JSON.parse(raw); return (v.aggMethod || 'AVG').toUpperCase(); } catch { return 'AVG'; }
  });
  const [activeGranularity, setActiveGranularity] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('granularity')) return params.get('granularity');
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return 'auto';
    try { const v = JSON.parse(raw); return v.granularity || 'auto'; } catch { return 'auto'; }
  });
  const [activeBucketSource, setActiveBucketSource] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('src')) return params.get('src');
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return 'frontend';
    try { const v = JSON.parse(raw); return v.bucketSource || 'frontend'; } catch { return 'frontend'; }
  });

  const [autoApply, setAutoApply] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return false;
    try { const v = JSON.parse(raw); return typeof v.autoApply === 'boolean' ? v.autoApply : false; } catch { return false; }
  });

  // State Staging (yang diedit di UI sebelum klik 'Terapkan')
  const [selectedBoard, setSelectedBoard] = useState(activeBoard);
  const [period, setPeriod] = useState(activePeriod);
  const [limit, setLimit] = useState(activeLimit);
  const [pivotAgg, setPivotAgg] = useState(activePivotAgg);
  const [startDate, setStartDate] = useState(activeStartDate);
  const [endDate, setEndDate] = useState(activeEndDate);
  const [comparePrev, setComparePrev] = useState(activeComparePrev);
  const [aggMethod, setAggMethod] = useState(activeAggMethod);
  const [granularity, setGranularity] = useState(activeGranularity);
  const [bucketSource, setBucketSource] = useState(activeBucketSource);

  const [isCompact, setIsCompact] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return false;
    try { const v = JSON.parse(raw); return typeof v.isCompact === 'boolean' ? v.isCompact : false; } catch { return false; }
  });
  
  // New Global Normalization & Flow UI States
  const [isLocked, setIsLocked] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return false;
    try { const v = JSON.parse(raw); return typeof v.isLocked === 'boolean' ? v.isLocked : false; } catch { return false; }
  });

  const [isTimeLocked, setIsTimeLocked] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return false;
    try { const v = JSON.parse(raw); return typeof v.isTimeLocked === 'boolean' ? v.isTimeLocked : false; } catch { return false; }
  });

  const [currentPhase, setCurrentPhase] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return 'exposure';
    try { const v = JSON.parse(raw); return v.currentPhase || 'exposure'; } catch { return 'exposure'; }
  });

  const handleLockConfig = () => {
    setIsLocked(true);
    setCurrentPhase('lock');
    toast.success("Konfigurasi pemetaan dikunci sementara");
  };

  const handleTimeLock = (isApplied = true, qualityScore = 100) => {
    if (isApplied && qualityScore < 20) {
      toast.error("Kepadatan data terlalu rendah (" + qualityScore + "%). Pilih rentang waktu lain atau kurangi granulasi.");
      return;
    }
    
    setIsTimeLocked(isApplied);
    if (isApplied) {
      setCurrentPhase('analysis');
      toast.success("Dimensi waktu dikunci & divalidasi");
    } else {
      setIsTimeLocked(false);
      toast("Dimensi waktu dibuka kembali");
    }
  };

  const handleResetConfig = () => {
    setIsLocked(false);
    setIsTimeLocked(false);
    setCurrentPhase('exposure');
    toast("Konfigurasi direset ke raw mode");
  };

  const [normalizationConfig, setNormalizationConfig] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    const registryEntries = Object.entries(METRIC_REGISTRY || {});
    const defaultMappings = registryEntries.map(([field, meta], idx) => ({
      id: idx + 1,
      field,
      source: meta?.source || meta?.unit || 'UNIT',
      target: meta?.unit || 'UNIT',
      active: true
    }));
    
    const defaultCfg = {
      customMappings: defaultMappings
    };

    if (!raw) return defaultCfg;
    try { 
      const v = JSON.parse(raw); 
      const cfg = v.normalizationConfig || defaultCfg; 
      
      const existing = Array.isArray(cfg.customMappings) ? cfg.customMappings : [];
      const existingFields = new Set(existing.map(m => m.field));
      const maxId = existing.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
      const missingDefaults = defaultMappings
        .filter(m => !existingFields.has(m.field))
        .map((m, i) => ({ ...m, id: maxId + i + 1 }));
      
      const merged = [...existing, ...missingDefaults];
      return { customMappings: merged };
    } catch { return defaultCfg; }
  });

  const [innerActiveTab, setInnerActiveTab] = useState('audit');
  const [usageUnit, setUsageUnit] = useState(() => {
    const raw = localStorage.getItem('INSIGHT_PREFS');
    if (!raw) return 'MB';
    try { const v = JSON.parse(raw); return v.usageUnit || 'MB'; } catch { return 'MB'; }
  });
  const [nameFilter, setNameFilter] = useState('');

  // Wrapper setters untuk auto-apply tanpa effect
  const debounceTimers = useRef({});
  const debounce = (key, fn, delay = 400) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, delay);
  };
  const updateSelectedBoard = (v) => {
    setSelectedBoard(v);
    if (autoApply) setActiveBoard(v);
  };
  const updatePeriod = (v) => {
    setPeriod(v);
    if (autoApply) {
      debounce('period', () => setActivePeriod(v));
    }
  };
  const updateLimit = (v) => {
    setLimit(v);
    if (autoApply) {
      debounce('limit', () => setActiveLimit(v));
    }
  };
  const updatePivotAgg = (v) => {
    setPivotAgg(v);
    if (autoApply) {
      debounce('pivotAgg', () => setActivePivotAgg(v));
    }
  };
  const updateStartDate = (v) => {
    setStartDate(v);
    if (autoApply) {
      debounce('startDate', () => setActiveStartDate(v));
    }
  };
  const updateEndDate = (v) => {
    setEndDate(v);
    if (autoApply) {
      debounce('endDate', () => setActiveEndDate(v));
    }
  };
  const updateComparePrev = (v) => {
    setComparePrev(v);
    if (autoApply) {
      debounce('comparePrev', () => setActiveComparePrev(v));
    }
  };
  const updateAggMethod = (v) => {
    const up = String(v || 'AVG').toUpperCase();
    setAggMethod(up);
    if (autoApply) {
      debounce('aggMethod', () => setActiveAggMethod(up));
    }
  };
  const updateGranularity = (v) => {
    setGranularity(v);
    if (autoApply) {
      debounce('granularity', () => setActiveGranularity(v));
    }
  };
  const updateBucketSource = (v) => {
    setBucketSource(v);
    if (autoApply) {
      debounce('bucketSource', () => setActiveBucketSource(v));
    }
  };

  const applyFilters = () => {
    const validation = validateFilterParams({ startDate, endDate, period, limit });
    
    if (!validation.isValid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    setActiveBoard(selectedBoard);
    setActivePeriod(period);
    setActiveLimit(limit);
    setActivePivotAgg(pivotAgg);
    setActiveStartDate(startDate);
    setActiveEndDate(endDate);
    setActiveComparePrev(comparePrev);
    setActiveAggMethod(aggMethod);
    setActiveGranularity(granularity);
    setActiveBucketSource(bucketSource);
    toast.success('Filter diterapkan');
  };

  const resetFilters = () => {
    setSelectedBoard(activeBoard);
    setPeriod(activePeriod);
    setLimit(activeLimit);
    setPivotAgg(activePivotAgg);
    setStartDate(activeStartDate);
    setEndDate(activeEndDate);
    setComparePrev(activeComparePrev);
    setAggMethod(activeAggMethod);
    setGranularity(activeGranularity);
    setBucketSource(activeBucketSource);
    toast.info('Perubahan dibatalkan');
  };

  const hasPendingChanges = useMemo(() => {
    return (
      selectedBoard !== activeBoard ||
      period !== activePeriod ||
      limit !== activeLimit ||
      pivotAgg !== activePivotAgg ||
      startDate !== activeStartDate ||
      endDate !== activeEndDate ||
      comparePrev !== activeComparePrev ||
      aggMethod !== activeAggMethod ||
      granularity !== activeGranularity ||
      bucketSource !== activeBucketSource
    );
  }, [
    selectedBoard, activeBoard, 
    period, activePeriod, 
    limit, activeLimit, 
    pivotAgg, activePivotAgg, 
    startDate, activeStartDate, 
    endDate, activeEndDate, 
    comparePrev, activeComparePrev, 
    aggMethod, activeAggMethod,
    granularity, activeGranularity,
    bucketSource, activeBucketSource
  ]);

  // Auto-apply dipindahkan ke wrapper setter agar tidak memicu lint error pada effect

  const [clientsTableMode, setClientsTableMode] = useState('pivot');
  const [clientsChartStacked, setClientsChartStacked] = useState(false);
  const [interfacesTableMode, setInterfacesTableMode] = useState('pivot');
  const [pppoeTableMode, setPppoeTableMode] = useState('pivot');
  const [hotspotTableMode, setHotspotTableMode] = useState('pivot');

  // Menentukan tab aktif berdasarkan URL
  const activeTab = useMemo(() => {
    const allowed = ['normalization', 'audit', 'trend', 'korelasi', 'kebiasaan', 'anomali', 'kapasitas', 'insight'];
    const segments = location.pathname.split('/').filter(Boolean);
    const lastValid = [...segments].reverse().find(seg => allowed.includes(seg));
    return lastValid || 'normalization';
  }, [location.pathname]);

  // Prefs: persist
  useEffect(() => {
    const v = { usageUnit, isCompact, period, limit, comparePrev, granularity, aggMethod, bucketSource, autoApply, isLocked, normalizationConfig, selectedBoard };
    try { localStorage.setItem('INSIGHT_PREFS', JSON.stringify(v)); } catch { /* ignore */ }
    
    // Sync to URL
    const params = new URLSearchParams();
    if (selectedBoard) params.set('board', selectedBoard);
    if (period) params.set('period', period);
    if (limit) params.set('limit', limit);
    if (pivotAgg) params.set('pivotAgg', pivotAgg);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    if (granularity && granularity !== 'auto') params.set('granularity', granularity);
    if (aggMethod && aggMethod !== 'AVG') params.set('agg', aggMethod);
    if (bucketSource && bucketSource !== 'frontend') params.set('src', bucketSource);
    
    const newSearch = params.toString();
    if (newSearch !== location.search.substring(1)) {
      navigate({ search: newSearch }, { replace: true });
    }
  }, [usageUnit, isCompact, period, limit, comparePrev, selectedBoard, pivotAgg, startDate, endDate, granularity, aggMethod, bucketSource, autoApply, isLocked, normalizationConfig, navigate, location.search]);

  // Dynamic staleTime based on scope
  const dynamicStaleTime = useMemo(() => {
    // If granularity is minute or hour, staleTime should be short
    if (granularity === 'minute') return 1 * 60 * 1000; // 1 min
    if (granularity === 'hour') return 5 * 60 * 1000;   // 5 min

    // If we have custom dates, calculate days
    if (startDate && endDate) {
      const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      if (days > 365) return 60 * 60 * 1000; // 60 min for > 1 year
      if (days > 30) return 30 * 60 * 1000;  // 30 min for > 1 month
      return 5 * 60 * 1000;                 // 5 min default
    }
    // Fallback to limit
    const numLimit = Number(limit) || 30;
    if (numLimit > 90) return 30 * 60 * 1000; // 30 min for > 3 months
    if (numLimit > 30) return 15 * 60 * 1000; // 15 min for > 1 month
    return 5 * 60 * 1000;                    // 5 min default
  }, [startDate, endDate, limit, granularity]);

  // Queries
  const { data: boards = [], isLoading: isBoardsLoading, isError: isBoardsError } = useQuery({
    queryKey: ['boards'],
    queryFn: getBoards,
    staleTime: 10 * 60 * 1000, // 10 menit for board list
  });

  const { data: interfaceAnalysis = [], isLoading: isInterfaceLoading, isError: isInterfaceError } = useQuery({
    queryKey: ['interfaceAnalysis', activeBoard, activeLimit, activePivotAgg, activeStartDate, activeEndDate, activeGranularity],
    queryFn: () => getInterfaceAnalysis(
      activeBoard,
      activeLimit,
      activePivotAgg,
      activeStartDate,
      activeEndDate,
      activeGranularity === 'auto' ? 'day' : activeGranularity
    ),
    enabled: !!activeBoard,
    staleTime: dynamicStaleTime,
  });

  const { data: pppoeAnalysis = [] } = useQuery({
    queryKey: ['pppoeAnalysis', activeBoard, activeLimit, activePivotAgg, activeStartDate, activeEndDate, activeGranularity],
    queryFn: () => getPPPoEAnalysis(
      activeBoard,
      activeLimit,
      activePivotAgg,
      activeStartDate,
      activeEndDate,
      activeGranularity === 'auto' ? 'day' : activeGranularity
    ),
    enabled: !!activeBoard,
    staleTime: dynamicStaleTime,
  });

  const { data: hotspotAnalysis = [] } = useQuery({
    queryKey: ['hotspotAnalysis', activeBoard, activeLimit, activePivotAgg, activeStartDate, activeEndDate, activeGranularity],
    queryFn: () => getHotspotAnalysis(
      activeBoard,
      activeLimit,
      activePivotAgg,
      activeStartDate,
      activeEndDate,
      activeGranularity === 'auto' ? 'day' : activeGranularity
    ),
    enabled: !!activeBoard,
    staleTime: dynamicStaleTime,
  });

  const { data: clientsAnalysis = [] } = useQuery({
    queryKey: ['clientsAnalysis', activeBoard, activeLimit, activePivotAgg, activeStartDate, activeEndDate, activeGranularity],
    queryFn: () => getClientsAnalysis(
      activeBoard,
      activeLimit,
      activePivotAgg === 'avg' ? 'avg' : 'max',
      activeStartDate,
      activeEndDate,
      activeGranularity === 'auto' ? 'day' : activeGranularity
    ),
    enabled: !!activeBoard,
    staleTime: dynamicStaleTime,
  });

  const { data: reportRows = [], isLoading: isKpiLoading, isError: isKpiError } = useQuery({
    queryKey: ['insight-kpi', activeBoard, activePeriod, activeLimit, activeStartDate, activeEndDate, activeGranularity],
    queryFn: async () => {
      if (!activeBoard) return [];
      return activePeriod === 'daily' 
        ? getDailyReports(
            activeBoard,
            activeLimit,
            activeStartDate,
            activeEndDate,
            activeGranularity === 'auto' ? 'day' : activeGranularity
          )
        : getMonthlyReports(
            activeBoard,
            activeLimit,
            activeStartDate,
            activeEndDate,
            activeGranularity === 'auto' ? 'month' : activeGranularity
          );
    },
    enabled: !!activeBoard,
    staleTime: dynamicStaleTime * 2, // Historical reports change even less frequently
  });

  const { data: heavyAnalysis, isLoading: isHeavyLoading, isError: isHeavyError } = useQuery({
    queryKey: ['heavy-analysis', activeBoard, activeLimit, activeStartDate, activeEndDate, activeGranularity],
    queryFn: () => getHeavyAnalysis(
      activeBoard,
      activeLimit,
      activeStartDate,
      activeEndDate,
      activeGranularity === 'auto' ? 'day' : activeGranularity
    ),
    enabled: !!activeBoard,
    staleTime: dynamicStaleTime * 3, // Heavy analysis is very expensive
  });

  const { data: analysisSummary, isLoading: isSummaryLoading, isError: isSummaryError } = useQuery({
    queryKey: ['analysis-summary', activeBoard],
    queryFn: () => getAnalysisSummary(activeBoard),
    enabled: !!activeBoard,
    staleTime: 1 * 60 * 1000,
  });

  const { data: serverBuckets = null, isLoading: isServerBucketsLoading } = useQuery({
    queryKey: ['time-agg', activeBoard, activePeriod, activeLimit, activeStartDate, activeEndDate, activeGranularity, activeAggMethod],
    queryFn: async () => {
      if (!activeBoard) return null;
      const today = new Date();
      const toEndOfDay = (d) => {
        const dd = new Date(d);
        dd.setHours(23, 59, 59, 999);
        return dd.toISOString();
        };
      const toStartOfDay = (d) => {
        const dd = new Date(d);
        dd.setHours(0, 0, 0, 0);
        return dd.toISOString();
      };
      let startISO, endISO;
      if (activeStartDate && activeEndDate) {
        startISO = toStartOfDay(activeStartDate);
        endISO = toEndOfDay(activeEndDate);
      } else {
        if (activePeriod === 'monthly') {
          const endTmp = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          const startTmp = new Date(today.getFullYear(), today.getMonth() - (Number(activeLimit) - 1), 1);
          startISO = toStartOfDay(startTmp);
          endISO = toEndOfDay(endTmp);
        } else {
          const endTmp = today;
          const startTmp = new Date(today);
          startTmp.setDate(endTmp.getDate() - (Number(activeLimit) - 1));
          startISO = toStartOfDay(startTmp);
          endISO = toEndOfDay(endTmp);
        }
      }
      const mapAgg = { AVG: 'avg', MAX: 'max', SUM: 'sum', MIN: 'min' };
      const agg = mapAgg[String(activeAggMethod || 'AVG').toUpperCase()] || 'avg';
      const gran = activeGranularity || 'auto';
      const [dl, ul, cpu, mem] = await Promise.all([
        getTimeAggregate(activeBoard, { startTime: startISO, endTime: endISO, granularity: gran, metric: 'download_mbps', agg }),
        getTimeAggregate(activeBoard, { startTime: startISO, endTime: endISO, granularity: gran, metric: 'upload_mbps', agg }),
        getTimeAggregate(activeBoard, { startTime: startISO, endTime: endISO, granularity: gran, metric: 'cpu_load', agg: 'avg' }),
        getTimeAggregate(activeBoard, { startTime: startISO, endTime: endISO, granularity: gran, metric: 'free_memory', agg: 'avg' }),
      ]);
      const toKey = (p) => {
        const dt = new Date(p);
        if (isNaN(dt.getTime())) return String(p);
        return dt.toISOString().slice(0, 19);
      };
      const m = new Map();
      const apply = (arr, key) => {
        (arr || []).forEach(item => {
          const k = toKey(item.period);
          const v = Number(item.value || 0);
          const prev = m.get(k) || { period: k };
          prev[key] = v;
          m.set(k, prev);
        });
      };
      apply(dl, 'dl');
      apply(ul, 'ul');
      apply(cpu, 'cpu');
      apply(mem, 'mem');
      const merged = Array.from(m.values()).sort((a, b) => new Date(a.period) - new Date(b.period));
      const traffic = merged.map(x => ({ date: x.period, dl: x.dl || 0, ul: x.ul || 0 }));
      const resource = merged.map(x => ({ date: x.period, cpu: x.cpu || 0, mem: x.mem || 0 }));
      return { traffic, resource };
    },
    enabled: !!activeBoard && activeBucketSource === 'server',
    staleTime: dynamicStaleTime,
  });

  // Auto-select first board - DEACTIVATED (User preference for manual selection)
  /*
  useEffect(() => {
    if (boards.length > 0 && !selectedBoard) {
      setSelectedBoard(boards[0].board_id);
    }
  }, [boards, selectedBoard]);
  */

  // Derived Data
  const reportData = useMemo(() => {
    if (!Array.isArray(reportRows)) return [];
    return reportRows.map(r => {
      const d = new Date(r.log_time || r.log_date || r.log_month);
      const displayDate = isNaN(d.getTime()) ? '' : d.toLocaleDateString();
      const dlExisting = Number(r.download_mbps || r.dl_mbps || r.avg_download || r.download_speed);
      const ulExisting = Number(r.upload_mbps || r.ul_mbps || r.avg_upload || r.upload_speed);
      const rxCandidate = Number(r.total_download_bytes || r.total_rx_bytes || r.rx_bytes || r.download_bytes || r.daily_download || 0);
      const txCandidate = Number(r.total_upload_bytes || r.total_tx_bytes || r.tx_bytes || r.upload_bytes || r.daily_upload || 0);
      const download_mbps = Number.isFinite(dlExisting) && !Number.isNaN(dlExisting) ? dlExisting : toMbps(rxCandidate);
      const upload_mbps = Number.isFinite(ulExisting) && !Number.isNaN(ulExisting) ? ulExisting : toMbps(txCandidate);
      const interface_name = r.interface_name || r.interface || r.ifname || r.name || r.username || r.pppoe_username || r.hotspot_username || '';
      return { ...r, displayDate, download_mbps, upload_mbps, interface_name };
    });
  }, [reportRows]);

  const filteredReportData = useMemo(() => {
    if (!nameFilter) return reportData;
    return reportData.filter(r => {
      const names = [r.interface_name, r.pppoe_username, r.username, r.hotspot_username];
      return names.some(n => n && String(n).toLowerCase().includes(nameFilter.toLowerCase()));
    });
  }, [reportData, nameFilter]);

  const interfaceTopData = useMemo(() => {
    let rows = (interfaceAnalysis || []);
    if (nameFilter) {
      const nf = String(nameFilter).toLowerCase();
      rows = rows.filter(v => {
        const nm = v.interface || v.interface_name || '';
        return String(nm).toLowerCase().includes(nf);
      });
    }
    return rows.slice(0, 20).map(v => {
      const dl = Number(v.download_value || 0);
      const ul = Number(v.upload_value || 0);
      return {
        name: v.interface || v.interface_name || 'Unknown',
        downloadValue: Number(dl.toFixed(2)),
        uploadValue: Number(ul.toFixed(2)),
        totalValue: Number((dl + ul).toFixed(2))
      };
    });
  }, [interfaceAnalysis, nameFilter]);

  const pppoeTopData = useMemo(() => {
    const rows = Array.isArray(pppoeAnalysis) ? pppoeAnalysis : [];
    const nf = String(nameFilter || '').toLowerCase();
    const agg = new Map();
    for (const r of rows) {
      const name = r.username || r.pppoe_username || 'Unknown';
      if (nf && !String(name).toLowerCase().includes(nf)) continue;
      const std = standardizeTableData([r], 'traffic')[0] || {};
      const dl = Number(std.rx || 0);
      const ul = Number(std.tx || 0);
      const prev = agg.get(name) || { dl: 0, ul: 0 };
      prev.dl += dl;
      prev.ul += ul;
      agg.set(name, prev);
    }
    const arr = Array.from(agg.entries()).map(([name, v]) => {
      if (usageUnit === 'Mbps') {
        const dl = Number(toMbps(v.dl).toFixed(2));
        const ul = Number(toMbps(v.ul).toFixed(2));
        return { name, downloadValue: dl, uploadValue: ul, totalValue: Number((dl + ul).toFixed(2)) };
      }
      return { 
        name, 
        downloadValue: bytesToUnit(v.dl, usageUnit), 
        uploadValue: bytesToUnit(v.ul, usageUnit), 
        totalValue: bytesToUnit(v.dl + v.ul, usageUnit) 
      };
    });
    arr.sort((a, b) => Number(b.totalValue || 0) - Number(a.totalValue || 0));
    return arr.slice(0, 5);
  }, [pppoeAnalysis, usageUnit, nameFilter]);

  const hotspotTopData = useMemo(() => {
    const rows = Array.isArray(hotspotAnalysis) ? hotspotAnalysis : [];
    const nf = String(nameFilter || '').toLowerCase();
    const agg = new Map();
    for (const r of rows) {
      const name = r.username || r.hotspot_username || 'Unknown';
      if (nf && !String(name).toLowerCase().includes(nf)) continue;
      const std = standardizeTableData([r], 'traffic')[0] || {};
      const dl = Number(std.rx || 0);
      const ul = Number(std.tx || 0);
      const prev = agg.get(name) || { dl: 0, ul: 0 };
      prev.dl += dl;
      prev.ul += ul;
      agg.set(name, prev);
    }
    const arr = Array.from(agg.entries()).map(([name, v]) => {
      if (usageUnit === 'Mbps') {
        const dl = Number(toMbps(v.dl).toFixed(2));
        const ul = Number(toMbps(v.ul).toFixed(2));
        return { name, downloadValue: dl, uploadValue: ul, totalValue: Number((dl + ul).toFixed(2)) };
      }
      return { 
        name, 
        downloadValue: bytesToUnit(v.dl, usageUnit), 
        uploadValue: bytesToUnit(v.ul, usageUnit), 
        totalValue: bytesToUnit(v.dl + v.ul, usageUnit) 
      };
    });
    arr.sort((a, b) => Number(b.totalValue || 0) - Number(a.totalValue || 0));
    return arr.slice(0, 5);
  }, [hotspotAnalysis, usageUnit, nameFilter]);

  const trafficSeries = useMemo(() => {
    return reportData.map(r => {
      const std = standardizeTableData([r], 'traffic')[0];
      const totalBytes = Number(std.total || 0);
      const mbpsFromSpeed = Number((std.rx_mbps || 0) + (std.tx_mbps || 0));
      
      if (usageUnit === 'Mbps') {
        const value = mbpsFromSpeed > 0 ? mbpsFromSpeed : Number(toMbps(totalBytes).toFixed(2));
        return { date: r.displayDate, value };
      }
      
      return { date: r.displayDate, value: bytesToUnit(totalBytes, usageUnit) };
    });
  }, [reportData, usageUnit]);

  const capacityStats = useMemo(() => {
    if (heavyAnalysis?.percentiles) {
      const p95Raw = heavyAnalysis.percentiles.p95_dl || 0;
      const p99Raw = heavyAnalysis.percentiles.p99_dl || 0;
      const maxRaw = heavyAnalysis.percentiles.max_dl || 0;
      
      if (usageUnit === 'Mbps') {
        return {
          p95: Number(toMbps(p95Raw).toFixed(2)),
          p99: Number(toMbps(p99Raw).toFixed(2)),
          max: Number(toMbps(maxRaw).toFixed(2)),
          maxDate: heavyAnalysis.percentiles.max_dl_date || ''
        };
      }
      
      return {
        p95: bytesToUnit(p95Raw, usageUnit),
        p99: bytesToUnit(p99Raw, usageUnit),
        max: bytesToUnit(maxRaw, usageUnit),
        maxDate: heavyAnalysis.percentiles.max_dl_date || ''
      };
    }
    return { p95: 0, p99: 0, max: 0, maxDate: '' };
  }, [heavyAnalysis, usageUnit]);

  const anomaliesList = useMemo(() => {
    if (heavyAnalysis?.anomalies) {
      return heavyAnalysis.anomalies.map(a => {
        const valRaw = a.traffic_value || 0;
        let finalVal = 0;
        
        if (a.type === 'traffic') {
          finalVal = usageUnit === 'Mbps' ? toMbps(valRaw) : bytesToUnit(valRaw, usageUnit);
        } else {
          finalVal = a.cpu_value || 0;
        }
        
        return {
          date: a.date,
          value: finalVal,
          type: a.type || (Math.abs(a.traffic_z_score) > Math.abs(a.cpu_z_score) ? 'traffic' : 'cpu'),
          z: Math.max(Math.abs(a.traffic_z_score || 0), Math.abs(a.cpu_z_score || 0))
        };
      });
    }
    return [];
  }, [heavyAnalysis, usageUnit]);

  const corrValue = useMemo(() => {
    if (heavyAnalysis?.correlation) {
      return { r: heavyAnalysis.correlation.pearson_r, n: heavyAnalysis.correlation.sample_size };
    }
    return { r: 0, n: 0 };
  }, [heavyAnalysis]);

  const nameOptions = useMemo(() => {
    const set = new Set();
    reportData.forEach(r => {
      [r.interface_name, r.pppoe_username, r.username, r.hotspot_username].forEach(n => {
        if (n && typeof n === 'string') set.add(n);
      });
    });
    return Array.from(set).sort();
  }, [reportData]);

  return {
    // States
    selectedBoard, setSelectedBoard: updateSelectedBoard,
    isCompact, setIsCompact,
    innerActiveTab, setInnerActiveTab,
    usageUnit, setUsageUnit,
    nameFilter, setNameFilter,
    nameOptions,
    period, setPeriod: updatePeriod,
    limit, setLimit: updateLimit,
    pivotAgg, setPivotAgg: updatePivotAgg,
    startDate, setStartDate: updateStartDate,
    endDate, setEndDate: updateEndDate,
    comparePrev, setComparePrev: updateComparePrev,
    aggMethod, setAggMethod: updateAggMethod,
    activeTab,
    clientsTableMode, setClientsTableMode,
    clientsChartStacked, setClientsChartStacked,
    interfacesTableMode, setInterfacesTableMode,
    pppoeTableMode, setPppoeTableMode,
    hotspotTableMode, setHotspotTableMode,
    granularity, setGranularity: updateGranularity,
    bucketSource, setBucketSource: updateBucketSource,
    autoApply, setAutoApply,
    isLocked, setIsLocked,
    isTimeLocked, setIsTimeLocked,
    currentPhase, setCurrentPhase,
    normalizationConfig, setNormalizationConfig,
    
    // Actions
    handleLockConfig,
    handleTimeLock,
    handleResetConfig,
    applyFilters,
    resetFilters,
    hasPendingChanges,
    
    // Data
    boards, isBoardsLoading, isBoardsError,
    reportRows, isKpiLoading, isKpiError,
    heavyAnalysis, isHeavyLoading, isHeavyError,
    analysisSummary, isSummaryLoading, isSummaryError,
    interfaceAnalysis, isInterfaceLoading, isInterfaceError,
    pppoeAnalysis, hotspotAnalysis, clientsAnalysis,
    
    // Derived
    reportData, filteredReportData,
    interfaceTopData, pppoeTopData, hotspotTopData,
    trafficSeries, capacityStats, anomaliesList, corrValue,
    serverBuckets, isServerBucketsLoading,
    resourceAnomalies: heavyAnalysis?.resource_anomalies || [],
    interfacesSummary: analysisSummary?.interfaces || [],
    pppoeSummary: analysisSummary?.pppoe || [],
    hotspotSummary: analysisSummary?.hotspot || [],
    latestClientCounts: (() => {
      const src = (Array.isArray(clientsAnalysis) && clientsAnalysis.length) ? clientsAnalysis : reportData;
      const last = src && src.length ? src[src.length - 1] : {};
      const p = Number(
        last?.total_pppoe ?? last?.pppoe_active ?? last?.pppoe_count ?? last?.pppoe ?? 0
      );
      const h = Number(
        last?.total_hotspot ?? last?.hotspot_active ?? last?.hotspot_count ?? last?.hotspot ?? 0
      );
      return { pppoe: p, hotspot: h };
    })(),
    clientsChartData: (() => {
      const src = (Array.isArray(clientsAnalysis) && clientsAnalysis.length) ? clientsAnalysis : reportData;
      return (src || []).map(r => {
        const rawDate = r.displayDate || r.date || r.log_date || r.log_time || '';
        const date = rawDate ? new Date(rawDate).toLocaleDateString() : '';
        const total_pppoe = Number(
          r.total_pppoe ?? r.pppoe_active ?? r.pppoe_count ?? r.pppoe ?? 0
        );
        const total_hotspot = Number(
          r.total_hotspot ?? r.hotspot_active ?? r.hotspot_count ?? r.hotspot ?? 0
        );
        return { date, total_pppoe, total_hotspot };
      });
    })(),
    // Actions
    navigate
  };
};
