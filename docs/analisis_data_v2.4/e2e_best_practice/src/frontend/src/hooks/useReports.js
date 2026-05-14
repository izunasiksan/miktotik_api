import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  getBoards, getDailyReports, getMonthlyReports, 
  getInterfaceReports, getPPPoEReports, getHotspotReports, 
  getClientStats, getSpeedStats, getResourceReports
} from '../services/api.js';

export const useReports = () => {
  const [selectedBoardId, setSelectedBoardId] = useState('');
  
  const [period, setPeriod] = useState('daily');
  const [activeTab, setActiveTab] = useState('summary');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [usageUnit, setUsageUnit] = useState('MB');
  const [nameFilter, setNameFilter] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [clientLimit, setClientLimit] = useState(60);
  const [clientsTableMode, setClientsTableMode] = useState('pivot');
  const [clientsPivotAgg, setClientsPivotAgg] = useState('max');
  const [clientsChartStacked, setClientsChartStacked] = useState(false);
  const [interfacesTableMode, setInterfacesTableMode] = useState('pivot');
  const [pppoeTableMode, setPppoeTableMode] = useState('pivot');
  const [hotspotTableMode, setHotspotTableMode] = useState('pivot');
  const [interfacesPivotAgg, setInterfacesPivotAgg] = useState('sum');
  const [pppoePivotAgg, setPppoePivotAgg] = useState('sum');
  const [hotspotPivotAgg, setHotspotPivotAgg] = useState('sum');
  const [isExporting, setIsExporting] = useState(false);
  const [isPivotDialogOpen, setIsPivotDialogOpen] = useState(false);
  const [pivotTarget, setPivotTarget] = useState('');
  const [pivotTempAgg, setPivotTempAgg] = useState('sum');
  const [trafficSort, setTrafficSort] = useState({ field: 'logTime', order: 'desc' });

  const handleTrafficSort = (field) => {
    setTrafficSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
    }));
  };

  const openPivotDialog = (target) => {
    setPivotTarget(target);
    let current = 'sum';
    if (target === 'interfaces') current = interfacesPivotAgg;
    else if (target === 'pppoe') current = pppoePivotAgg;
    else if (target === 'hotspot') current = hotspotPivotAgg;
    else if (target === 'clients') current = clientsPivotAgg;
    setPivotTempAgg(current || 'sum');
    setIsPivotDialogOpen(true);
  };

  const applyPivotAgg = () => {
    if (pivotTarget === 'interfaces') setInterfacesPivotAgg(pivotTempAgg);
    if (pivotTarget === 'pppoe') setPppoePivotAgg(pivotTempAgg);
    if (pivotTarget === 'hotspot') setHotspotPivotAgg(pivotTempAgg);
    if (pivotTarget === 'clients') setClientsPivotAgg(pivotTempAgg);
    setIsPivotDialogOpen(false);
  };

  // Fetch boards
  const { 
    data: boards = [], 
    isLoading: isBoardsLoading, 
    isError: isBoardsError 
  } = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(),
  });

  const selectedBoard = useMemo(() => {
    if (selectedBoardId) return selectedBoardId;
    if (boards && boards.length > 0) return boards[0].boardId;
    return '';
  }, [selectedBoardId, boards]);

  const setSelectedBoard = setSelectedBoardId;

  // Effect to show error toast
  useEffect(() => {
    if (isBoardsError) {
      toast.error("Failed to load devices list");
    }
  }, [isBoardsError]);

  // Fetch reports
  const { 
    data: reportData = [], 
    isLoading: isReportsLoading,
    isError: isReportsError 
  } = useQuery({
    queryKey: ['reports', selectedBoard, activeTab, period, startTime, endTime, clientLimit],
    queryFn: async () => {
      if (!selectedBoard) return [];
      
      let result = [];
      try {
        const isAll = selectedBoard === 'all';
        const boardIds = isAll ? (boards || []).map(b => b.boardId).filter(Boolean) : [selectedBoard];
        
        if (boardIds.length === 0 && isAll) return [];

        if (activeTab === 'traffic') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getSpeedStats(id, 30, startTime || null, endTime || null)));
            const map = new Map();
            arrays.forEach(arr => {
              (arr || []).forEach(item => {
                const d = new Date(item.logTime || item.logDate);
                if (isNaN(d.getTime())) return;
                const key = d.toISOString().slice(0, 16); 
                const prev = map.get(key) || { 
                  logTime: d.toISOString(), 
                  downloadMbps: 0, uploadMbps: 0,
                  cnt: 0
                };
                prev.downloadMbps += Number(item.downloadMbps || 0);
                prev.uploadMbps += Number(item.uploadMbps || 0);
                prev.cnt += 1;
                map.set(key, prev);
              });
            });
            result = Array.from(map.values()).map(v => ({
              logTime: v.logTime,
              downloadMbps: v.downloadMbps,
              uploadMbps: v.uploadMbps,
            }));
          } else {
            result = await getSpeedStats(selectedBoard, 30, startTime || null, endTime || null);
          }
        } else if (activeTab === 'resource') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getResourceReports(id, 30, startTime || null, endTime || null)));
            const map = new Map();
            arrays.forEach(arr => {
              (arr || []).forEach(item => {
                const d = new Date(item.logTime);
                if (isNaN(d.getTime())) return;
                const key = d.toISOString().slice(0, 16);
                const prev = map.get(key) || { 
                  logTime: d.toISOString(), 
                  cpuLoad: 0, freeMemory: 0, freeHdd: 0,
                  cnt: 0
                };
                prev.cpuLoad += Number(item.cpuLoad || 0);
                prev.freeMemory += Number(item.freeMemory || 0);
                prev.freeHdd += Number(item.freeHdd || 0);
                prev.cnt += 1;
                map.set(key, prev);
              });
            });
            result = Array.from(map.values()).map(v => ({
              logTime: v.logTime,
              cpuLoad: v.cnt ? v.cpuLoad / v.cnt : 0,
              freeMemory: v.freeMemory,
              freeHdd: v.freeHdd,
            }));
          } else {
            result = await getResourceReports(selectedBoard, 30, startTime || null, endTime || null);
          }
        } else if (activeTab === 'interfaces') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getInterfaceReports(id, 100, startTime || null, endTime || null)));
            result = arrays.flat();
          } else {
            result = await getInterfaceReports(selectedBoard, 100, startTime || null, endTime || null);
          }
        } else if (activeTab === 'summary') {
          if (isAll) {
            if (period === 'daily') {
              const arrays = await Promise.all(boardIds.map(id => getDailyReports(id, 30, startTime || null, endTime || null)));
              const map = new Map();
              arrays.forEach(arr => {
                (arr || []).forEach(item => {
                  const d = new Date(item.logDate || item.logTime);
                  if (isNaN(d.getTime())) return;
                  const key = d.toISOString().slice(0, 10);
                  const prev = map.get(key) || { 
                    logDate: d.toISOString().slice(0, 10), 
                    sumAvgDownload: 0, sumAvgUpload: 0, 
                    totalDownloadBytes: 0, totalUploadBytes: 0,
                    cnt: 0,
                  };
                  prev.sumAvgDownload += Number(item.avgDownload || 0);
                  prev.sumAvgUpload += Number(item.avgUpload || 0);
                  prev.totalDownloadBytes += Number(item.totalDownloadBytes || 0);
                  prev.totalUploadBytes += Number(item.totalUploadBytes || 0);
                  prev.cnt += 1;
                  map.set(key, prev);
                });
              });
              result = Array.from(map.values()).map(v => ({
                logDate: v.logDate,
                avgDownload: v.cnt ? v.sumAvgDownload / v.cnt : 0,
                avgUpload: v.cnt ? v.sumAvgUpload / v.cnt : 0,
                totalDownloadBytes: v.totalDownloadBytes,
                totalUploadBytes: v.totalUploadBytes,
              }));
            } else {
              const arrays = await Promise.all(boardIds.map(id => getMonthlyReports(id, 12, startTime || null, endTime || null)));
              const map = new Map();
              arrays.forEach(arr => {
                (arr || []).forEach(item => {
                  const d = new Date(item.logMonth || item.logDate);
                  if (isNaN(d.getTime())) return;
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
                  const prev = map.get(key) || { 
                    logMonth: key, 
                    totalDownloadBytes: 0, totalUploadBytes: 0,
                    sumAvgDownload: 0, sumAvgUpload: 0, cnt: 0
                  };
                  prev.totalDownloadBytes += Number(item.totalDownloadBytes || 0);
                  prev.totalUploadBytes += Number(item.totalUploadBytes || 0);
                  prev.sumAvgDownload += Number(item.avgDownload || 0);
                  prev.sumAvgUpload += Number(item.avgUpload || 0);
                  prev.cnt += 1;
                  map.set(key, prev);
                });
              });
              result = Array.from(map.values()).map(v => ({
                logMonth: v.logMonth,
                totalDownloadBytes: v.totalDownloadBytes,
                totalUploadBytes: v.totalUploadBytes,
                avgDownload: v.cnt ? v.sumAvgDownload / v.cnt : 0,
                avgUpload: v.cnt ? v.sumAvgUpload / v.cnt : 0,
              }));
            }
          } else {
            if (period === 'daily') {
              result = await getDailyReports(selectedBoard, 30, startTime || null, endTime || null);
            } else {
              result = await getMonthlyReports(selectedBoard, 12, startTime || null, endTime || null);
            }
          }
        } else if (activeTab === 'clients') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getClientStats(id, clientLimit, startTime || null, endTime || null)));
            result = arrays.flat();
          } else {
            result = await getClientStats(selectedBoard, clientLimit, startTime || null, endTime || null);
          }
        } else if (activeTab === 'pppoe') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getPPPoEReports(id, 100, startTime || null, endTime || null)));
            result = arrays.flat();
          } else {
            result = await getPPPoEReports(selectedBoard, 100, startTime || null, endTime || null);
          }
        } else if (activeTab === 'hotspot') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getHotspotReports(id, 100, startTime || null, endTime || null)));
            result = arrays.flat();
          } else {
            result = await getHotspotReports(selectedBoard, 100, startTime || null, endTime || null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch reports", error);
        throw error;
      }
      
      const sortedData = [...(result || [])].sort((a, b) => {
        const dateA = new Date(a.logDate || a.logMonth || a.logTime || 0);
        const dateB = new Date(b.logDate || b.logMonth || b.logTime || 0);
        return dateA - dateB;
      });

      return sortedData.map(item => {
          const dateObj = new Date(item.logDate || item.logMonth || item.logTime);
          let displayDate = activeTab === 'summary' && period === 'monthly'
              ? dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
              : dateObj.toLocaleDateString();
          
          if (activeTab === 'traffic') {
              displayDate = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
          
          return {
              ...item,
              displayDate,
          };
      });
    },
    enabled: !!selectedBoard && (selectedBoard !== 'all' || (boards && boards.length > 0)),
  });

  const { data: interfacesSummary = [] } = useQuery({
    queryKey: ['reports', 'interfaces', selectedBoard, startTime, endTime, 'summary'],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const isAll = selectedBoard === 'all';
      const ids = isAll ? (boards || []).map(b => b.boardId).filter(Boolean) : [selectedBoard];
      const arrays = await Promise.all(ids.map(id => getInterfaceReports(id, 100, startTime || null, endTime || null)));
      const merged = arrays.flat();
      return [...merged].sort((a, b) => new Date(a.logDate || 0) - new Date(b.logDate || 0));
    },
    enabled: !!selectedBoard && activeTab === 'summary',
  });

  const { data: pppoeSummary = [] } = useQuery({
    queryKey: ['reports', 'pppoe', selectedBoard, startTime, endTime, 'summary'],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const isAll = selectedBoard === 'all';
      const ids = isAll ? (boards || []).map(b => b.boardId).filter(Boolean) : [selectedBoard];
      const arrays = await Promise.all(ids.map(id => getPPPoEReports(id, 100, startTime || null, endTime || null)));
      const merged = arrays.flat();
      return [...merged].sort((a, b) => new Date(a.logDate || 0) - new Date(b.logDate || 0));
    },
    enabled: !!selectedBoard && activeTab === 'summary',
  });

  const { data: hotspotSummary = [] } = useQuery({
    queryKey: ['reports', 'hotspot', selectedBoard, startTime, endTime, 'summary'],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const isAll = selectedBoard === 'all';
      const ids = isAll ? (boards || []).map(b => b.boardId).filter(Boolean) : [selectedBoard];
      const arrays = await Promise.all(ids.map(id => getHotspotReports(id, 100, startTime || null, endTime || null)));
      const merged = arrays.flat();
      return [...merged].sort((a, b) => new Date(a.logDate || 0) - new Date(b.logDate || 0));
    },
    enabled: !!selectedBoard && activeTab === 'summary',
  });

  useEffect(() => {
    if (isReportsError) {
      toast.error("Failed to load report data");
    }
  }, [isReportsError]);

  const nameOptions = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    if (activeTab === 'interfaces') return Array.from(new Set(reportData.map(r => r.interfaceName).filter(Boolean))).sort();
    if (activeTab === 'pppoe') return Array.from(new Set(reportData.map(r => r.pppoeUsername).filter(Boolean))).sort();
    if (activeTab === 'hotspot') return Array.from(new Set(reportData.map(r => r.username).filter(Boolean))).sort();
    return [];
  }, [reportData, activeTab]);

  const filteredReportData = useMemo(() => {
    if (!nameFilter || activeTab === 'summary') return reportData;
    const term = nameFilter.toLowerCase();
    if (activeTab === 'interfaces') return reportData.filter(r => String(r.interfaceName || '').toLowerCase().includes(term));
    if (activeTab === 'pppoe') return reportData.filter(r => String(r.pppoeUsername || '').toLowerCase().includes(term));
    if (activeTab === 'hotspot') return reportData.filter(r => String(r.username || '').toLowerCase().includes(term));
    return reportData;
  }, [reportData, nameFilter, activeTab]);

  return {
    selectedBoard, setSelectedBoard,
    period, setPeriod,
    activeTab, setActiveTab,
    startTime, setStartTime,
    endTime, setEndTime,
    usageUnit, setUsageUnit,
    nameFilter, setNameFilter,
    isCompact, setIsCompact,
    clientLimit, setClientLimit,
    clientsTableMode, setClientsTableMode,
    clientsPivotAgg, setClientsPivotAgg,
    clientsChartStacked, setClientsChartStacked,
    interfacesTableMode, setInterfacesTableMode,
    pppoeTableMode, setPppoeTableMode,
    hotspotTableMode, setHotspotTableMode,
    interfacesPivotAgg, setInterfacesPivotAgg,
    pppoePivotAgg, setPppoePivotAgg,
    hotspotPivotAgg, setHotspotPivotAgg,
    isExporting, setIsExporting,
    isPivotDialogOpen, setIsPivotDialogOpen,
    pivotTarget, setPivotTarget,
    pivotTempAgg, setPivotTempAgg,
    trafficSort, setTrafficSort,
    handleTrafficSort,
    openPivotDialog,
    applyPivotAgg,
    boards, isBoardsLoading, isBoardsError,
    reportData, filteredReportData, isReportsLoading, isReportsError,
    interfacesSummary, pppoeSummary, hotspotSummary,
    nameOptions
  };
};
