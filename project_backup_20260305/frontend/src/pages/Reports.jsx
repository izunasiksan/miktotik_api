import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, BarChart, Bar
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { 
  getBoards, getDailyReports, getMonthlyReports, 
  getInterfaceReports, getPPPoEReports, getHotspotReports, 
  getClientStats 
} from '../services/api.js';
import { FileText, Activity, Users, Download, Wifi, Network } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/Modal.jsx';
 

function SizedContainer({ heightClass = "h-64", children }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const rect = ref.current.getBoundingClientRect();
      const w = Math.max(0, Math.floor(rect.width));
      const h = Math.max(0, Math.floor(rect.height));
      setSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const ready = size.w > 0 && size.h > 0;
  const childWithKey = React.isValidElement(children)
    ? React.cloneElement(children, { key: `${size.w}x${size.h}` })
    : children;

  return (
    <div ref={ref} className={`${heightClass} w-full`}>
      {ready ? (
        childWithKey
      ) : (
        <div className="h-full w-full bg-gray-100 rounded animate-pulse" />
      )}
    </div>
  );
}

const Reports = () => {
  const [selectedBoard, setSelectedBoard] = useState('');
  const [period, setPeriod] = useState('daily'); // 'daily' or 'monthly'
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'traffic', 'resource', 'interfaces', 'pppoe', 'hotspot'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
  const chartHeight = isCompact ? 'h-56' : 'h-64';
  const cardPadding = isCompact ? 'p-3' : 'p-4';
  const gridGap = isCompact ? 'gap-4' : 'gap-6';
  const [isExporting, setIsExporting] = useState(false);
  const [isPivotDialogOpen, setIsPivotDialogOpen] = useState(false);
  const [pivotTarget, setPivotTarget] = useState('');
  const [pivotTempAgg, setPivotTempAgg] = useState('sum');

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

  // Effect to set default selected board
  React.useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoard) {
      setSelectedBoard(boards[0].board_id);
    }
  }, [boards, selectedBoard]);

  // Effect to show error toast
  React.useEffect(() => {
    if (isBoardsError) {
      toast.error("Failed to load devices list");
    }
  }, [isBoardsError]);

  // Fetch reports
  const { 
    data: reportData = [], 
    isLoading,
    isError: isReportsError 
  } = useQuery({
    queryKey: ['reports', selectedBoard === 'all' ? 'all' : selectedBoard, activeTab, period, startDate, endDate, clientLimit, selectedBoard === 'all' ? (boards || []).map(b => b.board_id) : null],
    queryFn: async () => {
      if (!selectedBoard) return [];
      
      let result = [];
      try {
        const isAll = selectedBoard === 'all';
        const boardIds = isAll ? (boards || []).map(b => b.board_id).filter(Boolean) : [selectedBoard];
        if ((activeTab === 'summary' || activeTab === 'traffic' || activeTab === 'resource')) {
          if (isAll) {
            if (boardIds.length === 0) return [];
            if (period === 'daily') {
              const arrays = await Promise.all(boardIds.map(id => getDailyReports(id, 30, startDate || null, endDate || null)));
              const map = new Map();
              arrays.forEach(arr => {
                (arr || []).forEach(item => {
                  const d = new Date(item.log_date || item.log_time);
                  if (isNaN(d.getTime())) return;
                  const key = d.toISOString().slice(0, 10);
                  const prev = map.get(key) || { 
                    log_date: d.toISOString().slice(0, 10), 
                    sum_avg_download: 0, sum_avg_upload: 0, 
                    total_download_bytes: 0, total_upload_bytes: 0,
                    cpu_sum: 0, cpu_cnt: 0, max_cpu_load: 0 
                  };
                  prev.sum_avg_download += Number(item.avg_download || 0);
                  prev.sum_avg_upload += Number(item.avg_upload || 0);
                  prev.total_download_bytes += Number(item.total_download_bytes || 0);
                  prev.total_upload_bytes += Number(item.total_upload_bytes || 0);
                  if (item.avg_cpu_load != null) {
                    prev.cpu_sum += Number(item.avg_cpu_load || 0);
                    prev.cpu_cnt += 1;
                  }
                  prev.max_cpu_load = Math.max(prev.max_cpu_load, Number(item.max_cpu_load || 0));
                  map.set(key, prev);
                });
              });
              result = Array.from(map.values()).map(v => ({
                log_date: v.log_date,
                avg_download: v.sum_avg_download,
                avg_upload: v.sum_avg_upload,
                total_download_bytes: v.total_download_bytes,
                total_upload_bytes: v.total_upload_bytes,
                avg_cpu_load: v.cpu_cnt ? v.cpu_sum / v.cpu_cnt : 0,
                max_cpu_load: v.max_cpu_load,
              }));
            } else {
              const arrays = await Promise.all(boardIds.map(id => getMonthlyReports(id, 12, startDate || null, endDate || null)));
              const map = new Map();
              arrays.forEach(arr => {
                (arr || []).forEach(item => {
                  const d = new Date(item.log_month || item.log_date);
                  if (isNaN(d.getTime())) return;
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
                  const prev = map.get(key) || { 
                    log_month: key, 
                    total_download_bytes: 0, total_upload_bytes: 0,
                    sum_avg_download: 0, sum_avg_upload: 0, cnt: 0
                  };
                  prev.total_download_bytes += Number(item.total_download_bytes || 0);
                  prev.total_upload_bytes += Number(item.total_upload_bytes || 0);
                  prev.sum_avg_download += Number(item.avg_download || 0);
                  prev.sum_avg_upload += Number(item.avg_upload || 0);
                  prev.cnt += 1;
                  map.set(key, prev);
                });
              });
              result = Array.from(map.values()).map(v => ({
                log_month: v.log_month,
                total_download_bytes: v.total_download_bytes,
                total_upload_bytes: v.total_upload_bytes,
                avg_download: v.sum_avg_download,
                avg_upload: v.sum_avg_upload,
              }));
            }
          } else {
            if (period === 'daily') {
              result = await getDailyReports(selectedBoard, 30, startDate || null, endDate || null);
            } else {
              result = await getMonthlyReports(selectedBoard, 12, startDate || null, endDate || null);
            }
          }
        } else if (activeTab === 'interfaces') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getInterfaceReports(id, 100, startDate || null, endDate || null)));
            result = arrays.flat();
          } else {
            result = await getInterfaceReports(selectedBoard, 100, startDate || null, endDate || null);
          }
        } else if (activeTab === 'clients') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getClientStats(id, clientLimit, startDate || null, endDate || null)));
            result = arrays.flat();
          } else {
            result = await getClientStats(selectedBoard, clientLimit, startDate || null, endDate || null);
          }
        } else if (activeTab === 'pppoe') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getPPPoEReports(id, 100, startDate || null, endDate || null)));
            result = arrays.flat();
          } else {
            result = await getPPPoEReports(selectedBoard, 100, startDate || null, endDate || null);
          }
        } else if (activeTab === 'hotspot') {
          if (isAll) {
            const arrays = await Promise.all(boardIds.map(id => getHotspotReports(id, 100, startDate || null, endDate || null)));
            result = arrays.flat();
          } else {
            result = await getHotspotReports(selectedBoard, 100, startDate || null, endDate || null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch reports", error);
        throw error;
      }
      
      // Sort data by date ascending
      const sortedData = [...result].sort((a, b) => {
        const dateA = new Date(a.log_date || a.log_month || a.log_time);
        const dateB = new Date(b.log_date || b.log_month || b.log_time);
        return dateA - dateB;
      });

      // Formatting
      return sortedData.map(item => {
          const dateObj = new Date(item.log_date || item.log_month || item.log_time);
          const displayDate = activeTab === 'summary' && period === 'monthly'
              ? dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
              : dateObj.toLocaleDateString();
          
          return {
              ...item,
              displayDate,
          };
      });
    },
    enabled: selectedBoard === 'all' ? (boards && boards.length > 0) : !!selectedBoard,
  });

  const {
    data: interfacesSummary = [],
  } = useQuery({
    queryKey: ['reports', 'interfaces', selectedBoard === 'all' ? 'all' : selectedBoard, startDate, endDate, 'summary', selectedBoard === 'all' ? (boards || []).map(b => b.board_id) : null],
    queryFn: async () => {
      if (!selectedBoard) return [];
      if (selectedBoard === 'all') {
        const ids = (boards || []).map(b => b.board_id).filter(Boolean);
        if (ids.length === 0) return [];
        const arrays = await Promise.all(ids.map(id => getInterfaceReports(id, 100, startDate || null, endDate || null)));
        const merged = arrays.flat();
        return [...merged].sort((a, b) => {
          const dateA = new Date(a.log_date || a.log_month);
          const dateB = new Date(b.log_date || b.log_month);
          return dateA - dateB;
        });
      }
      const result = await getInterfaceReports(selectedBoard, 100, startDate || null, endDate || null);
      return [...result].sort((a, b) => {
        const dateA = new Date(a.log_date || a.log_month);
        const dateB = new Date(b.log_date || b.log_month);
        return dateA - dateB;
      });
    },
    enabled: (selectedBoard === 'all' ? (boards && boards.length > 0) : !!selectedBoard) && activeTab === 'summary',
  });

  const {
    data: pppoeSummary = [],
  } = useQuery({
    queryKey: ['reports', 'pppoe', selectedBoard === 'all' ? 'all' : selectedBoard, startDate, endDate, 'summary', selectedBoard === 'all' ? (boards || []).map(b => b.board_id) : null],
    queryFn: async () => {
      if (!selectedBoard) return [];
      if (selectedBoard === 'all') {
        const ids = (boards || []).map(b => b.board_id).filter(Boolean);
        if (ids.length === 0) return [];
        const arrays = await Promise.all(ids.map(id => getPPPoEReports(id, 100, startDate || null, endDate || null)));
        const merged = arrays.flat();
        return [...merged].sort((a, b) => {
          const dateA = new Date(a.log_date || a.log_month);
          const dateB = new Date(b.log_date || b.log_month);
          return dateA - dateB;
        });
      }
      const result = await getPPPoEReports(selectedBoard, 100, startDate || null, endDate || null);
      return [...result].sort((a, b) => {
        const dateA = new Date(a.log_date || a.log_month);
        const dateB = new Date(b.log_date || b.log_month);
        return dateA - dateB;
      });
    },
    enabled: (selectedBoard === 'all' ? (boards && boards.length > 0) : !!selectedBoard) && activeTab === 'summary',
  });

  const {
    data: hotspotSummary = [],
  } = useQuery({
    queryKey: ['reports', 'hotspot', selectedBoard === 'all' ? 'all' : selectedBoard, startDate, endDate, 'summary', selectedBoard === 'all' ? (boards || []).map(b => b.board_id) : null],
    queryFn: async () => {
      if (!selectedBoard) return [];
      if (selectedBoard === 'all') {
        const ids = (boards || []).map(b => b.board_id).filter(Boolean);
        if (ids.length === 0) return [];
        const arrays = await Promise.all(ids.map(id => getHotspotReports(id, 100, startDate || null, endDate || null)));
        const merged = arrays.flat();
        return [...merged].sort((a, b) => {
          const dateA = new Date(a.log_date || a.log_month);
          const dateB = new Date(b.log_date || b.log_month);
          return dateA - dateB;
        });
      }
      const result = await getHotspotReports(selectedBoard, 100, startDate || null, endDate || null);
      return [...result].sort((a, b) => {
        const dateA = new Date(a.log_date || a.log_month);
        const dateB = new Date(b.log_date || b.log_month);
        return dateA - dateB;
      });
    },
    enabled: (selectedBoard === 'all' ? (boards && boards.length > 0) : !!selectedBoard) && activeTab === 'summary',
  });

  // Effect to show reports error toast
  React.useEffect(() => {
    if (isReportsError) {
      toast.error("Failed to load report data");
    }
  }, [isReportsError]);

  const nameOptions = React.useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    if (activeTab === 'interfaces') {
      return Array.from(new Set(reportData.map(r => r.interface_name).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    }
    if (activeTab === 'pppoe') {
      return Array.from(new Set(reportData.map(r => r.pppoe_username).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    }
    if (activeTab === 'hotspot') {
      return Array.from(new Set(reportData.map(r => r.username).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    }
    return [];
  }, [reportData, activeTab]);

  const filteredReportData = React.useMemo(() => {
    if (!nameFilter || activeTab === 'summary') return reportData;
    const term = nameFilter.toLowerCase();
    if (activeTab === 'interfaces') {
      return (reportData || []).filter(r => String(r.interface_name || '').toLowerCase().includes(term));
    }
    if (activeTab === 'pppoe') {
      return (reportData || []).filter(r => String(r.pppoe_username || '').toLowerCase().includes(term));
    }
    if (activeTab === 'hotspot') {
      return (reportData || []).filter(r => String(r.username || '').toLowerCase().includes(term));
    }
    return reportData;
  }, [reportData, nameFilter, activeTab]);

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      const toCSVCell = (v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const nowStr = new Date().toISOString().split('T')[0];
      let headers = [];
      let rows = [];
      let base = `${activeTab}_report`;
      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
      if (activeTab === 'clients') {
        if (clientsTableMode === 'pivot') {
          const byDate = new Map();
          (reportData || []).forEach(row => {
            const d = new Date(row.log_time || row.log_date || row.log_month);
            if (isNaN(d.getTime())) return;
            const key = d.toLocaleDateString();
            const rec = byDate.get(key) || { date: key, sumP: 0, sumH: 0, maxP: 0, maxH: 0, cnt: 0 };
            const p = Number(row.total_pppoe || 0);
            const h = Number(row.total_hotspot || 0);
            rec.sumP += p;
            rec.sumH += h;
            rec.maxP = Math.max(rec.maxP, p);
            rec.maxH = Math.max(rec.maxH, h);
            rec.cnt += 1;
            byDate.set(key, rec);
          });
          const data = Array.from(byDate.values()).map(r => {
            if (clientsPivotAgg === 'avg') {
              const p = r.cnt ? Math.round(r.sumP / r.cnt) : 0;
              const h = r.cnt ? Math.round(r.sumH / r.cnt) : 0;
              return { date: r.date, pppoe: p, hot: h, tot: p + h };
            }
            return { date: r.date, pppoe: r.maxP, hot: r.maxH, tot: r.maxP + r.maxH };
          }).sort((a, b) => new Date(a.date) - new Date(b.date));
          headers = ['Tanggal', 'PPPoE', 'Hotspot', 'Total'];
          rows = data.map(r => [r.date, r.pppoe, r.hot, r.tot]);
          base = `clients_pivot_${clientsPivotAgg}`;
        } else {
          headers = ['Log Time', 'PPPoE', 'Hotspot', 'Total', 'stat_id', 'board_id'];
          rows = (reportData || []).map(row => {
            const time = new Date(row.log_time || row.log_date || row.log_month).toLocaleString();
            const p = Number(row.total_pppoe || 0);
            const h = Number(row.total_hotspot || 0);
            const t = Number(row.total_active || p + h);
            return [time, p, h, t, row.stat_id ?? '', row.board_id ?? ''];
          });
          base = `clients_raw`;
        }
      } else if (activeTab === 'interfaces') {
        if (interfacesTableMode === 'pivot') {
          const byNameDay = new Map();
          (filteredReportData || []).forEach(r => {
            const name = r.interface_name || 'unknown';
            const date = r.displayDate || new Date(r.log_date || r.log_month || r.log_time).toLocaleDateString();
            const key = `${name}__${date}`;
            const day = byNameDay.get(key) || { name, dl: 0, ul: 0 };
            day.dl += Number(r.total_rx_bytes || 0);
            day.ul += Number(r.total_tx_bytes || 0);
            byNameDay.set(key, day);
          });
          const byName = new Map();
          Array.from(byNameDay.values()).forEach(day => {
            const agg = byName.get(day.name) || { name: day.name, sumDl: 0, sumUl: 0, maxDl: 0, maxUl: 0, days: 0 };
            agg.sumDl += day.dl;
            agg.sumUl += day.ul;
            agg.maxDl = Math.max(agg.maxDl, day.dl);
            agg.maxUl = Math.max(agg.maxUl, day.ul);
            agg.days += 1;
            byName.set(day.name, agg);
          });
          const data = Array.from(byName.values()).map(v => {
            let dlBytes = 0, ulBytes = 0;
            if (interfacesPivotAgg === 'avg') {
              dlBytes = v.days ? v.sumDl / v.days : 0;
              ulBytes = v.days ? v.sumUl / v.days : 0;
            } else if (interfacesPivotAgg === 'max') {
              dlBytes = v.maxDl;
              ulBytes = v.maxUl;
            } else {
              dlBytes = v.sumDl;
              ulBytes = v.sumUl;
            }
            const dl = dlBytes / div;
            const ul = ulBytes / div;
            return { name: v.name, dl, ul, tot: dl + ul };
          }).sort((a, b) => b.tot - a.tot);
          headers = ['Interface', `Download (${usageUnit})`, `Upload (${usageUnit})`, `Total (${usageUnit})`];
          rows = data.map(r => [r.name, (Number(r.dl) || 0).toFixed(2), (Number(r.ul) || 0).toFixed(2), (Number(r.tot) || 0).toFixed(2)]);
          base = `interfaces_pivot_${interfacesPivotAgg}_${usageUnit}`;
        } else {
          headers = ['Date', 'Interface', `Download (${usageUnit})`, `Upload (${usageUnit})`];
          rows = (filteredReportData || []).map(row => {
            const date = row.displayDate || new Date(row.log_date || row.log_month || row.log_time).toLocaleDateString();
            const dl = (Number(row.total_rx_bytes || 0) / div).toFixed(2);
            const ul = (Number(row.total_tx_bytes || 0) / div).toFixed(2);
            return [date, row.interface_name || 'unknown', dl, ul];
          });
          base = `interfaces_raw_${usageUnit}`;
        }
      } else if (activeTab === 'pppoe') {
        if (pppoeTableMode === 'pivot') {
          const byNameDay = new Map();
          (filteredReportData || []).forEach(r => {
            const name = r.pppoe_username || r.username || 'unknown';
            const date = r.displayDate || new Date(r.log_date || r.log_month || r.log_time).toLocaleDateString();
            const key = `${name}__${date}`;
            const day = byNameDay.get(key) || { name, dl: 0, ul: 0 };
            day.dl += Number(r.download_bytes || r.daily_download || 0);
            day.ul += Number(r.upload_bytes || r.daily_upload || 0);
            byNameDay.set(key, day);
          });
          const byName = new Map();
          Array.from(byNameDay.values()).forEach(day => {
            const agg = byName.get(day.name) || { name: day.name, sumDl: 0, sumUl: 0, maxDl: 0, maxUl: 0, days: 0 };
            agg.sumDl += day.dl;
            agg.sumUl += day.ul;
            agg.maxDl = Math.max(agg.maxDl, day.dl);
            agg.maxUl = Math.max(agg.maxUl, day.ul);
            agg.days += 1;
            byName.set(day.name, agg);
          });
          const data = Array.from(byName.values()).map(v => {
            let dlBytes = 0, ulBytes = 0;
            if (pppoePivotAgg === 'avg') {
              dlBytes = v.days ? v.sumDl / v.days : 0;
              ulBytes = v.days ? v.sumUl / v.days : 0;
            } else if (pppoePivotAgg === 'max') {
              dlBytes = v.maxDl;
              ulBytes = v.maxUl;
            } else {
              dlBytes = v.sumDl;
              ulBytes = v.sumUl;
            }
            const dl = dlBytes / div;
            const ul = ulBytes / div;
            return { name: v.name, dl, ul, tot: dl + ul };
          }).sort((a, b) => b.tot - a.tot);
          headers = ['Username', `Download (${usageUnit})`, `Upload (${usageUnit})`, `Total (${usageUnit})`];
          rows = data.map(r => [r.name, (Number(r.dl) || 0).toFixed(2), (Number(r.ul) || 0).toFixed(2), (Number(r.tot) || 0).toFixed(2)]);
          base = `pppoe_pivot_${pppoePivotAgg}_${usageUnit}`;
        } else {
          headers = ['Date', 'Username', `Download (${usageUnit})`, `Upload (${usageUnit})`];
          rows = (filteredReportData || []).map(row => {
            const date = row.displayDate || new Date(row.log_date || row.log_month || row.log_time).toLocaleDateString();
            const dl = (Number(row.download_bytes || 0) / div).toFixed(2);
            const ul = (Number(row.upload_bytes || 0) / div).toFixed(2);
            return [date, row.pppoe_username || 'unknown', dl, ul];
          });
          base = `pppoe_raw_${usageUnit}`;
        }
      } else if (activeTab === 'hotspot') {
        if (hotspotTableMode === 'pivot') {
          const byNameDay = new Map();
          (filteredReportData || []).forEach(r => {
            const name = r.username || r.hotspot_username || 'unknown';
            const date = r.displayDate || new Date(r.log_date || r.log_month || r.log_time).toLocaleDateString();
            const key = `${name}__${date}`;
            const day = byNameDay.get(key) || { name, dl: 0, ul: 0 };
            day.dl += Number(r.daily_download || r.download_bytes || 0);
            day.ul += Number(r.daily_upload || r.upload_bytes || 0);
            byNameDay.set(key, day);
          });
          const byName = new Map();
          Array.from(byNameDay.values()).forEach(day => {
            const agg = byName.get(day.name) || { name: day.name, sumDl: 0, sumUl: 0, maxDl: 0, maxUl: 0, days: 0 };
            agg.sumDl += day.dl;
            agg.sumUl += day.ul;
            agg.maxDl = Math.max(agg.maxDl, day.dl);
            agg.maxUl = Math.max(agg.maxUl, day.ul);
            agg.days += 1;
            byName.set(day.name, agg);
          });
          const data = Array.from(byName.values()).map(v => {
            let dlBytes = 0, ulBytes = 0;
            if (hotspotPivotAgg === 'avg') {
              dlBytes = v.days ? v.sumDl / v.days : 0;
              ulBytes = v.days ? v.sumUl / v.days : 0;
            } else if (hotspotPivotAgg === 'max') {
              dlBytes = v.maxDl;
              ulBytes = v.maxUl;
            } else {
              dlBytes = v.sumDl;
              ulBytes = v.sumUl;
            }
            const dl = dlBytes / div;
            const ul = ulBytes / div;
            return { name: v.name, dl, ul, tot: dl + ul };
          }).sort((a, b) => b.tot - a.tot);
          headers = ['Username', `Download (${usageUnit})`, `Upload (${usageUnit})`, `Total (${usageUnit})`];
          rows = data.map(r => [r.name, (Number(r.dl) || 0).toFixed(2), (Number(r.ul) || 0).toFixed(2), (Number(r.tot) || 0).toFixed(2)]);
          base = `hotspot_pivot_${hotspotPivotAgg}_${usageUnit}`;
        } else {
          headers = ['Date', 'Username', `Download (${usageUnit})`, `Upload (${usageUnit})`];
          rows = (filteredReportData || []).map(row => {
            const date = row.displayDate || new Date(row.log_date || row.log_month || row.log_time).toLocaleDateString();
            const dl = (Number(row.daily_download || 0) / div).toFixed(2);
            const ul = (Number(row.daily_upload || 0) / div).toFixed(2);
            return [date, row.username || 'unknown', dl, ul];
          });
          base = `hotspot_raw_${usageUnit}`;
        }
      } else {
        toast.error('Export belum didukung untuk tab ini');
        return;
      }
      if (format === 'csv') {
        const csv = [headers.map(toCSVCell).join(','), ...rows.map(r => r.map(toCSVCell).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${base}_${selectedBoard}_${nowStr}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      toast.success('Berhasil download CSV');
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Gagal export');
    } finally {
      setIsExporting(false);
    }
  };

  const interfaceTopData = React.useMemo(() => {
    if (activeTab !== 'interfaces') return [];
    const map = new Map();
    const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    (filteredReportData || []).forEach(row => {
      const name = row.interface_name || 'unknown';
      const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
      const dl = Number(row.total_rx_bytes || 0) / div;
      const ul = Number(row.total_tx_bytes || 0) / div;
      prev.downloadValue += dl;
      prev.uploadValue += ul;
      prev.totalValue = prev.downloadValue + prev.uploadValue;
      map.set(name, prev);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => b.totalValue - a.totalValue);
    return arr.slice(0, 10);
  }, [activeTab, filteredReportData, usageUnit]);

  const pppoeTopData = React.useMemo(() => {
    if (activeTab !== 'pppoe') return [];
    const map = new Map();
    const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    (filteredReportData || []).forEach(row => {
      const name = row.pppoe_username || 'unknown';
      const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
      const dl = Number(row.download_bytes || 0) / div;
      const ul = Number(row.upload_bytes || 0) / div;
      prev.downloadValue += dl;
      prev.uploadValue += ul;
      prev.totalValue = prev.downloadValue + prev.uploadValue;
      map.set(name, prev);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => b.totalValue - a.totalValue);
    return arr.slice(0, 10);
  }, [activeTab, filteredReportData, usageUnit]);

  const hotspotTopData = React.useMemo(() => {
    if (activeTab !== 'hotspot') return [];
    const map = new Map();
    const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    (filteredReportData || []).forEach(row => {
      const name = row.username || 'unknown';
      const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
      const dl = Number(row.daily_download || 0) / div;
      const ul = Number(row.daily_upload || 0) / div;
      prev.downloadValue += dl;
      prev.uploadValue += ul;
      prev.totalValue = prev.downloadValue + prev.uploadValue;
      map.set(name, prev);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => b.totalValue - a.totalValue);
    return arr.slice(0, 10);
  }, [activeTab, filteredReportData, usageUnit]);

  const latestClientCounts = React.useMemo(() => {
    if (activeTab !== 'clients' || !reportData || reportData.length === 0) {
      return { pppoe: 0, hotspot: 0 };
    }
    const last = reportData[reportData.length - 1] || {};
    return {
      pppoe: Number(last.total_pppoe || 0),
      hotspot: Number(last.total_hotspot || 0),
    };
  }, [activeTab, reportData]);
  
  const clientsChartData = React.useMemo(() => {
    if (activeTab !== 'clients' || !reportData || reportData.length === 0) return [];
    const byDate = new Map();
    (reportData || []).forEach(row => {
      const d = new Date(row.log_time || row.log_date || row.log_month);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString();
      const rec = byDate.get(key) || { date: key, sumP: 0, sumH: 0, maxP: 0, maxH: 0, cnt: 0 };
      const p = Number(row.total_pppoe || 0);
      const h = Number(row.total_hotspot || 0);
      rec.sumP += p;
      rec.sumH += h;
      rec.maxP = Math.max(rec.maxP, p);
      rec.maxH = Math.max(rec.maxH, h);
      rec.cnt += 1;
      byDate.set(key, rec);
    });
    const rows = Array.from(byDate.values()).map(r => {
      if (clientsPivotAgg === 'avg') {
        const p = r.cnt ? Math.round(r.sumP / r.cnt) : 0;
        const h = r.cnt ? Math.round(r.sumH / r.cnt) : 0;
        return { date: r.date, total_pppoe: p, total_hotspot: h };
      }
      return { date: r.date, total_pppoe: r.maxP, total_hotspot: r.maxH };
    }).sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return da - db;
    });
    return rows;
  }, [activeTab, reportData, clientsPivotAgg]);

  const renderTrafficOverview = () => {
    const downloadKey = period === 'monthly' ? 'total_download_bytes' : 'avg_download';
    const uploadKey = period === 'monthly' ? 'total_upload_bytes' : 'avg_upload';
    return (
      <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Traffic Overview (MB)</h3>
        <SizedContainer heightClass={chartHeight}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
            <AreaChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayDate" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={downloadKey} name="Download" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
              <Area type="monotone" dataKey={uploadKey} name="Upload" stackId="1" stroke="#10b981" fill="#10b981" />
            </AreaChart>
          </ResponsiveContainer>
        </SizedContainer>
      </div>
    );
  };

  const renderResourceUsage = () => (
    <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Resource Usage</h3>
      <SizedContainer heightClass={chartHeight}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
          <LineChart data={reportData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avg_cpu_load" name="CPU Load (%)" stroke="#ef4444" />
            <Line type="monotone" dataKey="max_cpu_load" name="Max CPU (%)" stroke="#b91c1c" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </SizedContainer>
    </div>
  );

  const renderTable = (columns, rows) => (
    <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    {columns.map((col, idx) => (
                        <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {col.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, idx) => (
                    <tr key={idx}>
                        {columns.map((col, cIdx) => (
                            <td key={cIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {col.render ? col.render(row) : row[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
                {rows.length === 0 && (
                    <tr>
                        <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                            No data available
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            System Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
             <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mr-2">
               Historical / Polled
             </span>
            Historical performance data and aggregated statistics
          </p>
        </div>
        <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${isExporting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}
            >
                <Download className="w-4 h-4" /> CSV
            </button>
            
            <button
              onClick={() => setIsCompact(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded ${isCompact ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Compact Mode"
            >
              {isCompact ? 'Compact: ON' : 'Compact: OFF'}
            </button>
        </div>
      </div>

      {/* Controls */}
      <div className={`bg-white ${cardPadding} rounded-lg shadow mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Device</label>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              disabled={isBoardsLoading || isBoardsError || boards.length === 0}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {isBoardsLoading && <option>Loading devices...</option>}
              {isBoardsError && <option>Error loading devices</option>}
              {!isBoardsLoading && !isBoardsError && boards.length === 0 && <option value="">No devices found</option>}
              {!isBoardsLoading && !isBoardsError && boards.length > 0 && (
                <option value="all">All Devices • {boards.length}</option>
              )}
              {!isBoardsLoading && !isBoardsError && boards.length > 0 && boards.map((board) => (
                <option key={board.board_id} value={board.board_id}>
                  {board.board_name || board.name} ({board.ip_address || board.host})
                </option>
              ))}
            </select>
          </div>

          {(activeTab === 'summary' || activeTab === 'traffic' || activeTab === 'resource') && (
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Period</label>
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'daily' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => setPeriod('daily')}
                >
                    Daily
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => setPeriod('monthly')}
                >
                    Monthly
                </button>
                </div>
            </div>
          )}
          {activeTab === 'clients' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Limit</label>
              <select
                value={clientLimit}
                onChange={(e) => setClientLimit(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>All</option>
                <option value={30}>Last 30</option>
                <option value={60}>Last 60</option>
                <option value={90}>Last 90</option>
                <option value={200}>Last 200</option>
              </select>
            </div>
          )}
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range (Optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap"
                title="Show all periods"
              >
                All Period
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
            {[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'traffic', label: 'Traffic Overview', icon: Activity },
                { id: 'resource', label: 'Resource Usage', icon: Download },
                { id: 'interfaces', label: 'Interfaces', icon: Network },
                { id: 'clients', label: 'Client Counts', icon: Users },
                { id: 'pppoe', label: 'PPPoE Usage', icon: Users },
                { id: 'hotspot', label: 'Hotspot Usage', icon: Wifi },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                    `}
                >
                    <tab.icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                    {tab.label}
                </button>
            ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
            <LoadingSpinner />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
                  {renderTrafficOverview()}
                  {renderResourceUsage()}
                </div>

                <div className={`grid grid-cols-1 ${isCompact ? 'lg:grid-cols-3 xl:grid-cols-3' : 'lg:grid-cols-2'} ${gridGap}`}>
                <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top Interfaces by Usage ({usageUnit})</h3>
                    <div className="bg-gray-100 rounded-md p-1">
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'MB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('MB')}
                      >
                        MB
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'GB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('GB')}
                      >
                        GB
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'TB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('TB')}
                      >
                        TB
                      </button>
                    </div>
                  </div>
                  <SizedContainer heightClass={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                      <BarChart data={(function(){
                        const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                        const map = new Map();
                        (interfacesSummary || []).forEach(row => {
                          const name = row.interface_name || 'unknown';
                          const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
                          const dl = Number(row.total_rx_bytes || 0) / div;
                          const ul = Number(row.total_tx_bytes || 0) / div;
                          prev.downloadValue += dl;
                          prev.uploadValue += ul;
                          prev.totalValue = prev.downloadValue + prev.uploadValue;
                          map.set(name, prev);
                        });
                        const arr = Array.from(map.values());
                        arr.sort((a, b) => b.totalValue - a.totalValue);
                        return arr.slice(0, 10);
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#6366f1" />
                        <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SizedContainer>
                </div>

                <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top PPPoE Users by Usage ({usageUnit})</h3>
                    <div className="bg-gray-100 rounded-md p-1">
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'MB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('MB')}
                      >
                        MB
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'GB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('GB')}
                      >
                        GB
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'TB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('TB')}
                      >
                        TB
                      </button>
                    </div>
                  </div>
                  <SizedContainer heightClass={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                      <BarChart data={(function(){
                        const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                        const map = new Map();
                        (pppoeSummary || []).forEach(row => {
                          const name = row.pppoe_username || 'unknown';
                          const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
                          const dl = Number(row.download_bytes || row.daily_download || 0) / div;
                          const ul = Number(row.upload_bytes || row.daily_upload || 0) / div;
                          prev.downloadValue += dl;
                          prev.uploadValue += ul;
                          prev.totalValue = prev.downloadValue + prev.uploadValue;
                          map.set(name, prev);
                        });
                        const arr = Array.from(map.values());
                        arr.sort((a, b) => b.totalValue - a.totalValue);
                        return arr.slice(0, 10);
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#a78bfa" />
                        <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SizedContainer>
                </div>

                <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top Hotspot Users by Usage ({usageUnit})</h3>
                    <div className="bg-gray-100 rounded-md p-1">
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'MB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('MB')}
                      >
                        MB
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'GB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('GB')}
                      >
                        GB
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded ${usageUnit === 'TB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setUsageUnit('TB')}
                      >
                        TB
                      </button>
                    </div>
                  </div>
                  <SizedContainer heightClass={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                      <BarChart data={(function(){
                        const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                        const map = new Map();
                        (hotspotSummary || []).forEach(row => {
                          const name = row.username || 'unknown';
                          const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
                          const dl = Number(row.daily_download || 0) / div;
                          const ul = Number(row.daily_upload || 0) / div;
                          prev.downloadValue += dl;
                          prev.uploadValue += ul;
                          prev.totalValue = prev.downloadValue + prev.uploadValue;
                          map.set(name, prev);
                        });
                        const arr = Array.from(map.values());
                        arr.sort((a, b) => b.totalValue - a.totalValue);
                        return arr.slice(0, 10);
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#60a5fa" />
                        <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SizedContainer>
                </div>
                </div>
              </div>
            )}
            {activeTab === 'traffic' && renderTrafficOverview()}
            {activeTab === 'resource' && renderResourceUsage()}
            {activeTab === 'clients' && (
              <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Client Counts (Per Hari)</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPivotDialog('clients')}
                    className="px-3 py-1.5 rounded bg-white shadow ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Opsi Pivot
                  </button>
                  <div className="bg-gray-100 rounded-md p-1">
                    <button
                      className={`px-3 py-1.5 rounded ${!clientsChartStacked ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setClientsChartStacked(false)}
                    >
                      Grouped
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded ${clientsChartStacked ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setClientsChartStacked(true)}
                    >
                      Stacked
                    </button>
                  </div>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      Latest PPPoE: {latestClientCounts.pppoe}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
                      Latest Hotspot: {latestClientCounts.hotspot}
                    </span>
                  </div>
                </div>
                <SizedContainer heightClass={chartHeight}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                    <BarChart data={clientsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_pppoe" name="PPPoE Clients" fill="#3b82f6" stackId={clientsChartStacked ? 'clients' : undefined} />
                      <Bar dataKey="total_hotspot" name="Hotspot Clients" fill="#f59e0b" stackId={clientsChartStacked ? 'clients' : undefined} />
                    </BarChart>
                  </ResponsiveContainer>
                </SizedContainer>
              </div>
            )}
          
          {activeTab === 'clients' && (
            <div className={`bg-white ${cardPadding} rounded-lg shadow mt-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Tabel Client Counts</h3>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 rounded-md p-1">
                    <button
                      className={`px-3 py-1.5 rounded ${clientsTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setClientsTableMode('pivot')}
                    >
                      Pivot
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded ${clientsTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setClientsTableMode('raw')}
                    >
                      Semua Data
                    </button>
                  </div>
                  {clientsTableMode === 'pivot' && (
                    <button
                      onClick={() => openPivotDialog('clients')}
                      className="px-3 py-1.5 rounded bg-white shadow ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Opsi Pivot
                    </button>
                  )}
                </div>
              </div>
              
              {clientsTableMode === 'pivot' ? (
                <div className="overflow-auto rounded-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PPPoE</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotspot</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(function(){
                        const byDate = new Map();
                        (reportData || []).forEach(row => {
                          const d = new Date(row.log_time || row.log_date || row.log_month);
                          if (isNaN(d.getTime())) return;
                          const key = d.toLocaleDateString();
                          const rec = byDate.get(key) || { date: key, sumP: 0, sumH: 0, maxP: 0, maxH: 0, cnt: 0 };
                          const p = Number(row.total_pppoe || 0);
                          const h = Number(row.total_hotspot || 0);
                          rec.sumP += p;
                          rec.sumH += h;
                          rec.maxP = Math.max(rec.maxP, p);
                          rec.maxH = Math.max(rec.maxH, h);
                          rec.cnt += 1;
                          byDate.set(key, rec);
                        });
                        const rows = Array.from(byDate.values()).map(r => {
                          if (clientsPivotAgg === 'avg') {
                            const p = r.cnt ? Math.round(r.sumP / r.cnt) : 0;
                            const h = r.cnt ? Math.round(r.sumH / r.cnt) : 0;
                            return { date: r.date, pppoe: p, hot: h, tot: p + h };
                          }
                          return { date: r.date, pppoe: r.maxP, hot: r.maxH, tot: r.maxP + r.maxH };
                        }).sort((a, b) => {
                          const da = new Date(a.date).getTime();
                          const db = new Date(b.date).getTime();
                          return da - db;
                        });
                        return rows.map((r, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-3 text-sm text-gray-900">{r.date}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{r.pppoe}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{r.hot}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">{r.tot}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-auto rounded-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PPPoE</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotspot</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">stat_id</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">board_id</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(reportData || []).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-3 text-sm text-gray-900">{new Date(row.log_time || row.log_date || row.log_month).toLocaleString()}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{Number(row.total_pppoe || 0)}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{Number(row.total_hotspot || 0)}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{Number(row.total_active || (Number(row.total_pppoe || 0) + Number(row.total_hotspot || 0)))}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{row.stat_id}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{row.board_id}</td>
                        </tr>
                      ))}
                      {(reportData || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
            
            {activeTab === 'interfaces' && (
              <div className="space-y-6">
                <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top Interfaces by Usage ({usageUnit})</h3>
                  <div className="flex items-center gap-2">
                      <select
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px]"
                      >
                        <option value="">Semua Interface</option>
                        {nameOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openPivotDialog('interfaces')}
                        className="px-3 py-1.5 rounded bg-white shadow ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Opsi Pivot
                      </button>
                      <div className="bg-gray-100 rounded-md p-1">
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'MB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('MB')}
                        >
                          MB
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'GB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('GB')}
                        >
                          GB
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'TB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('TB')}
                        >
                          TB
                        </button>
                      </div>
                      <div className="bg-gray-100 rounded-md p-1">
                        <button
                          className={`px-3 py-1.5 rounded ${interfacesTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setInterfacesTableMode('pivot')}
                        >
                          Pivot
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${interfacesTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setInterfacesTableMode('raw')}
                        >
                          Semua Data
                        </button>
                      </div>
                    </div>
                  </div>
                  <SizedContainer heightClass={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                      <BarChart data={interfaceTopData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#6366f1" />
                        <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SizedContainer>
                </div>
                {interfacesTableMode === 'pivot' ? (
                  <div className="overflow-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interface</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Download (${usageUnit})`}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Upload (${usageUnit})`}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total (${usageUnit})`}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(function(){
                          const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                          const byNameDay = new Map();
                          (filteredReportData || []).forEach(r => {
                            const name = r.interface_name || 'unknown';
                            const date = r.displayDate || new Date(r.log_date || r.log_month || r.log_time).toLocaleDateString();
                            const key = `${name}__${date}`;
                            const day = byNameDay.get(key) || { name, dl: 0, ul: 0 };
                            day.dl += Number(r.total_rx_bytes || 0);
                            day.ul += Number(r.total_tx_bytes || 0);
                            byNameDay.set(key, day);
                          });
                          const byName = new Map();
                          Array.from(byNameDay.values()).forEach(day => {
                            const agg = byName.get(day.name) || { name: day.name, sumDl: 0, sumUl: 0, maxDl: 0, maxUl: 0, days: 0 };
                            agg.sumDl += day.dl;
                            agg.sumUl += day.ul;
                            agg.maxDl = Math.max(agg.maxDl, day.dl);
                            agg.maxUl = Math.max(agg.maxUl, day.ul);
                            agg.days += 1;
                            byName.set(day.name, agg);
                          });
                          const rows = Array.from(byName.values()).map(v => {
                            let dlBytes = 0, ulBytes = 0;
                            if (interfacesPivotAgg === 'avg') {
                              dlBytes = v.days ? v.sumDl / v.days : 0;
                              ulBytes = v.days ? v.sumUl / v.days : 0;
                            } else if (interfacesPivotAgg === 'max') {
                              dlBytes = v.maxDl;
                              ulBytes = v.maxUl;
                            } else {
                              dlBytes = v.sumDl;
                              ulBytes = v.sumUl;
                            }
                            const dl = dlBytes / div;
                            const ul = ulBytes / div;
                            return { name: v.name, dl, ul, tot: dl + ul };
                          }).sort((a, b) => b.tot - a.tot);
                          return rows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.dl) || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.ul) || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.tot) || 0).toFixed(2)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderTable([
                    { label: 'Date', key: 'displayDate' },
                    { label: 'Interface', key: 'interface_name' },
                    { label: `Total Download (${usageUnit})`, key: 'total_rx_bytes', render: (row) => {
                      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                      return `${(Number(row.total_rx_bytes || 0) / div).toFixed(2)} ${usageUnit}`;
                    }},
                    { label: `Total Upload (${usageUnit})`, key: 'total_tx_bytes', render: (row) => {
                      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                      return `${(Number(row.total_tx_bytes || 0) / div).toFixed(2)} ${usageUnit}`;
                    }},
                  ], filteredReportData)
                )}
              </div>
            )}
            
            {activeTab === 'pppoe' && (
              <div className="space-y-6">
                <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top PPPoE Users by Usage ({usageUnit})</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px]"
                      >
                        <option value="">Semua Username PPPoE</option>
                        {nameOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openPivotDialog('pppoe')}
                        className="px-3 py-1.5 rounded bg-white shadow ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Opsi Pivot
                      </button>
                      <div className="bg-gray-100 rounded-md p-1">
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'MB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('MB')}
                        >
                          MB
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'GB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('GB')}
                        >
                          GB
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'TB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('TB')}
                        >
                          TB
                        </button>
                      </div>
                      <div className="bg-gray-100 rounded-md p-1">
                        <button
                          className={`px-3 py-1.5 rounded ${pppoeTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setPppoeTableMode('pivot')}
                        >
                          Pivot
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${pppoeTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setPppoeTableMode('raw')}
                        >
                          Semua Data
                        </button>
                      </div>
                    </div>
                  </div>
                  <SizedContainer heightClass={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                      <BarChart data={pppoeTopData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#a78bfa" />
                        <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SizedContainer>
                </div>
                {pppoeTableMode === 'pivot' ? (
                  <div className="overflow-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Download (${usageUnit})`}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Upload (${usageUnit})`}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total (${usageUnit})`}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(function(){
                          const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                          const byNameDay = new Map();
                          (filteredReportData || []).forEach(r => {
                            const name = r.pppoe_username || r.username || 'unknown';
                            const date = r.displayDate || new Date(r.log_date || r.log_month || r.log_time).toLocaleDateString();
                            const key = `${name}__${date}`;
                            const day = byNameDay.get(key) || { name, dl: 0, ul: 0 };
                            day.dl += Number(r.download_bytes || r.daily_download || 0);
                            day.ul += Number(r.upload_bytes || r.daily_upload || 0);
                            byNameDay.set(key, day);
                          });
                          const byName = new Map();
                          Array.from(byNameDay.values()).forEach(day => {
                            const agg = byName.get(day.name) || { name: day.name, sumDl: 0, sumUl: 0, maxDl: 0, maxUl: 0, days: 0 };
                            agg.sumDl += day.dl;
                            agg.sumUl += day.ul;
                            agg.maxDl = Math.max(agg.maxDl, day.dl);
                            agg.maxUl = Math.max(agg.maxUl, day.ul);
                            agg.days += 1;
                            byName.set(day.name, agg);
                          });
                          const rows = Array.from(byName.values()).map(v => {
                            let dlBytes = 0, ulBytes = 0;
                            if (pppoePivotAgg === 'avg') {
                              dlBytes = v.days ? v.sumDl / v.days : 0;
                              ulBytes = v.days ? v.sumUl / v.days : 0;
                            } else if (pppoePivotAgg === 'max') {
                              dlBytes = v.maxDl;
                              ulBytes = v.maxUl;
                            } else {
                              dlBytes = v.sumDl;
                              ulBytes = v.sumUl;
                            }
                            const dl = dlBytes / div;
                            const ul = ulBytes / div;
                            return { name: v.name, dl, ul, tot: dl + ul };
                          }).sort((a, b) => b.tot - a.tot);
                          return rows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.dl) || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.ul) || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.tot) || 0).toFixed(2)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderTable([
                    { label: 'Date', key: 'displayDate' },
                    { label: 'Username', key: 'pppoe_username' },
                    { label: `Total Download (${usageUnit})`, key: 'download_bytes', render: (row) => {
                      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                      return `${(Number(row.download_bytes || 0) / div).toFixed(2)} ${usageUnit}`;
                    }},
                    { label: `Total Upload (${usageUnit})`, key: 'upload_bytes', render: (row) => {
                      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                      return `${(Number(row.upload_bytes || 0) / div).toFixed(2)} ${usageUnit}`;
                    }},
                  ], filteredReportData)
                )}
              </div>
            )}

            {activeTab === 'hotspot' && (
              <div className="space-y-6">
                <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top Hotspot Users by Usage ({usageUnit})</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px]"
                      >
                        <option value="">Semua Username Hotspot</option>
                        {nameOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openPivotDialog('hotspot')}
                        className="px-3 py-1.5 rounded bg-white shadow ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Opsi Pivot
                      </button>
                      <div className="bg-gray-100 rounded-md p-1">
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'MB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('MB')}
                        >
                          MB
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'GB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('GB')}
                        >
                          GB
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${usageUnit === 'TB' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setUsageUnit('TB')}
                        >
                          TB
                        </button>
                      </div>
                      <div className="bg-gray-100 rounded-md p-1">
                        <button
                          className={`px-3 py-1.5 rounded ${hotspotTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setHotspotTableMode('pivot')}
                        >
                          Pivot
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded ${hotspotTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                          onClick={() => setHotspotTableMode('raw')}
                        >
                          Semua Data
                        </button>
                      </div>
                    </div>
                  </div>
                  <SizedContainer heightClass={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                      <BarChart data={hotspotTopData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#60a5fa" />
                        <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SizedContainer>
                </div>
                {hotspotTableMode === 'pivot' ? (
                  <div className="overflow-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Download (${usageUnit})`}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Upload (${usageUnit})`}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total (${usageUnit})`}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(function(){
                          const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                          const byNameDay = new Map();
                          (filteredReportData || []).forEach(r => {
                            const name = r.username || r.hotspot_username || 'unknown';
                            const date = r.displayDate || new Date(r.log_date || r.log_month || r.log_time).toLocaleDateString();
                            const key = `${name}__${date}`;
                            const day = byNameDay.get(key) || { name, dl: 0, ul: 0 };
                            day.dl += Number(r.daily_download || r.download_bytes || 0);
                            day.ul += Number(r.daily_upload || r.upload_bytes || 0);
                            byNameDay.set(key, day);
                          });
                          const byName = new Map();
                          Array.from(byNameDay.values()).forEach(day => {
                            const agg = byName.get(day.name) || { name: day.name, sumDl: 0, sumUl: 0, maxDl: 0, maxUl: 0, days: 0 };
                            agg.sumDl += day.dl;
                            agg.sumUl += day.ul;
                            agg.maxDl = Math.max(agg.maxDl, day.dl);
                            agg.maxUl = Math.max(agg.maxUl, day.ul);
                            agg.days += 1;
                            byName.set(day.name, agg);
                          });
                          const rows = Array.from(byName.values()).map(v => {
                            let dlBytes = 0, ulBytes = 0;
                            if (hotspotPivotAgg === 'avg') {
                              dlBytes = v.days ? v.sumDl / v.days : 0;
                              ulBytes = v.days ? v.sumUl / v.days : 0;
                            } else if (hotspotPivotAgg === 'max') {
                              dlBytes = v.maxDl;
                              ulBytes = v.maxUl;
                            } else {
                              dlBytes = v.sumDl;
                              ulBytes = v.sumUl;
                            }
                            const dl = dlBytes / div;
                            const ul = ulBytes / div;
                            return { name: v.name, dl, ul, tot: dl + ul };
                          }).sort((a, b) => b.tot - a.tot);
                          return rows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.dl) || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.ul) || 0).toFixed(2)}</td>
                              <td className="px-6 py-3 text-sm text-gray-900">{(Number(row.tot) || 0).toFixed(2)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderTable([
                    { label: 'Date', key: 'displayDate' },
                    { label: 'Username', key: 'username' },
                    { label: `Total Download (${usageUnit})`, key: 'daily_download', render: (row) => {
                      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                      return `${(Number(row.daily_download || 0) / div).toFixed(2)} ${usageUnit}`;
                    }},
                    { label: `Total Upload (${usageUnit})`, key: 'daily_upload', render: (row) => {
                      const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
                      return `${(Number(row.daily_upload || 0) / div).toFixed(2)} ${usageUnit}`;
                    }},
                  ], filteredReportData)
                )}
              </div>
            )}
        </div>
      )}

      <Modal
        isOpen={isPivotDialogOpen}
        onClose={() => setIsPivotDialogOpen(false)}
        title="Opsi Aggregator Pivot"
        size="sm"
      >
        <div className="space-y-4">
          {pivotTarget === 'clients' ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="pivotAgg"
                  value="max"
                  checked={pivotTempAgg === 'max'}
                  onChange={(e) => setPivotTempAgg(e.target.value)}
                />
                Max
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="pivotAgg"
                  value="avg"
                  checked={pivotTempAgg === 'avg'}
                  onChange={(e) => setPivotTempAgg(e.target.value)}
                />
                Average
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="pivotAgg"
                  value="sum"
                  checked={pivotTempAgg === 'sum'}
                  onChange={(e) => setPivotTempAgg(e.target.value)}
                />
                Sum
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="pivotAgg"
                  value="avg"
                  checked={pivotTempAgg === 'avg'}
                  onChange={(e) => setPivotTempAgg(e.target.value)}
                />
                Avg/Day
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="pivotAgg"
                  value="max"
                  checked={pivotTempAgg === 'max'}
                  onChange={(e) => setPivotTempAgg(e.target.value)}
                />
                Max/Day
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsPivotDialogOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
            >
              Batal
            </button>
            <button
              onClick={applyPivotAgg}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              Simpan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;
