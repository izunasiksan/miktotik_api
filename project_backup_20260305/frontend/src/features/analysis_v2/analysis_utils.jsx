import { median } from 'simple-statistics';

/**
 * Shared Slicing Logic for Tables
 */
export const sliceData = (data, limit) => {
  if (!Array.isArray(data)) return [];
  if (limit === 'all') return data;
  return data.slice(0, Number(limit));
};

/**
 * Utility: Bytes to Unit Conversion
 */
export const bytesToUnit = (bytes, unit = 'MB') => {
  if (unit === 'Mbps') return toMbps(bytes);
  const div = unit === 'TB' ? 1024 ** 4 : unit === 'GB' ? 1024 ** 3 : 1024 ** 2;
  return bytes / div;
};

/**
 * Utility: Mbps Conversion (Network Standard SI 1000)
 */
export const toMbps = (bytes) => {
  if (!bytes) return 0;
  return (bytes * 8) / (1000 * 1000);
};

/**
 * Utility: Safely pick numeric property from object
 */
export const pickNum = (obj, candidates) => {
  if (!obj) return 0;
  for (const k of candidates) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return 0;
};

/**
 * Utility: Sized Container for Recharts
 */
// SizedContainer moved to components/SharedWidgets.jsx

/**
 * Math Helpers
 */
export const sum = (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0);
export const avg = (arr) => (Array.isArray(arr) && arr.length ? sum(arr) / arr.length : 0);
export const max = (arr) => (Array.isArray(arr) && arr.length ? Math.max(...arr) : 0);
export const std = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 0;
  const m = avg(arr);
  const v = arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / arr.length;
  return Math.sqrt(v);
};

export const safeMedian = (arr) => {
  const v = (arr || []).filter(n => typeof n === 'number' && !Number.isNaN(n));
  return v.length ? median(v) : 0;
};

/**
 * Shared Normalization Utility
 * Applies normalization based on configuration and metric registry
 */
export const normalizeRawData = (data, config) => {
  if (!data || !config) return data;
  
  const { customMappings = [] } = config;

  return data.map(item => {
    const newItem = { ...item };
    
    Object.keys(newItem).forEach(field => {
      const val = newItem[field];
      if (val === undefined || val === null || typeof val !== 'number') return;

      // 1. Prioritas: Pemetaan Kustom (Mapping individual)
      const custom = customMappings.find(m => m.field === field);
      if (custom && custom.active !== false) {
        newItem[field] = convertValue(val, custom.source, custom.target);
        return;
      }

      // 2. Fallback: Metric Registry (Standar default jika tidak ada mapping kustom)
      const meta = METRIC_REGISTRY[field];
      if (meta) {
        newItem[field] = convertValue(val, meta.source, meta.unit);
        return;
      }

      // 3. Opsi Terakhir: Inferensi Otomatis
      const inferred = inferUnit(field, [val]);
      if (inferred && !inferred.isAmbiguous) {
        newItem[field] = convertValue(val, inferred.source || inferred.unit, inferred.unit);
      }
    });

    return newItem;
  });
};

/**
 * Utility: Aggregate data by day
 * Groups items by date and applies aggregation function to numeric fields
 */
export const aggregateDailyData = (data, method = 'AVG') => {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  const groups = {};
  
  data.forEach(item => {
    // Extract date part only (YYYY-MM-DD)
    const rawDate = item.log_time || item.log_date || item.log_month || item.created_at;
    if (!rawDate) return;
    
    const dateStr = new Date(rawDate).toISOString().split('T')[0];
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(item);
  });

  const numericFields = [
    'cpu_load', 'cpu_percent', 'cpu', 'cpu_percent_standard',
    'memory_usage', 'mem_usage', 'memory',
    'rx_bytes', 'total_rx_bytes', 'tx_bytes', 'total_tx_bytes',
    'pppoe_count', 'total_pppoe', 'hotspot_count', 'total_hotspot'
  ];

  return Object.keys(groups).sort().map(date => {
    const items = groups[date];
    const result = { ...items[0], log_date: date, log_time: date }; // Base record
    
    numericFields.forEach(field => {
      const values = items
        .map(i => Number(i[field]))
        .filter(v => !isNaN(v));
      
      if (values.length === 0) return;

      switch (method.toUpperCase()) {
        case 'MAX':
          result[field] = Math.max(...values);
          break;
        case 'SUM':
          result[field] = values.reduce((a, b) => a + b, 0);
          break;
        case 'MIN':
          result[field] = Math.min(...values);
          break;
        case 'MEDIAN':
          result[field] = safeMedian(values);
          break;
        case 'AVG':
        default:
          result[field] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
      }
    });

    // Handle interface_analysis if present (nested aggregation)
    if (items[0].interface_analysis) {
      const ifaceGroups = {};
      items.forEach(i => {
        (i.interface_analysis || []).forEach(iface => {
          const name = iface.interface_name || iface.interface;
          if (!ifaceGroups[name]) ifaceGroups[name] = [];
          ifaceGroups[name].push(iface);
        });
      });

      result.interface_analysis = Object.keys(ifaceGroups).map(name => {
        const ifaces = ifaceGroups[name];
        const ifaceResult = { ...ifaces[0] };
        
        ['rx_bytes', 'tx_bytes'].forEach(f => {
          const vals = ifaces.map(idx => Number(idx[f])).filter(v => !isNaN(v));
          if (vals.length === 0) return;
          
          switch (method.toUpperCase()) {
            case 'MAX': ifaceResult[f] = Math.max(...vals); break;
            case 'SUM': ifaceResult[f] = vals.reduce((a, b) => a + b, 0); break;
            case 'MIN': ifaceResult[f] = Math.min(...vals); break;
            case 'MEDIAN': ifaceResult[f] = safeMedian(vals); break;
            case 'AVG': 
            default: ifaceResult[f] = vals.reduce((a, b) => a + b, 0) / vals.length; break;
          }
        });
        return ifaceResult;
      });
    }

    return result;
  });
};

/**
 * Utility: Format bytes to human readable string (SI 1000)
 */
export const formatBytesAuto = (bytes) => {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1000;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Utility: Determine Scope and Granularity based on filter params
 */
export const getSuggestedTimeInfo = (period, limit, startDate, endDate, manualGranularity = 'auto') => {
  // 1. Calculate Scope (in days)
  let scopeDays = 0;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    scopeDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
  } else {
    // Fallback to period and limit
    const numLimit = limit === 'all' ? 365 : Number(limit);
    if (period === 'monthly') {
      scopeDays = numLimit * 30;
    } else {
      scopeDays = numLimit;
    }
  }

  // 2. Format Scope Label
  let scopeLabel = '';
  if (scopeDays <= 1) scopeLabel = '1 Hari';
  else if (scopeDays <= 7) scopeLabel = '7 Hari';
  else if (scopeDays <= 31) scopeLabel = `${scopeDays} Hari`;
  else if (scopeDays <= 365) scopeLabel = `${Math.round(scopeDays / 30)} Bulan`;
  else scopeLabel = `${(scopeDays / 365).toFixed(1)} Tahun`;

  // 3. Determine Granularity (Auto or Manual)
  let granularityLabel = '';
  let granularityValue = ''; 

  if (manualGranularity && manualGranularity !== 'auto') {
    // Manual Override
    granularityValue = manualGranularity;
    switch (manualGranularity) {
      case 'hour': granularityLabel = 'Per Jam'; break;
      case 'day': granularityLabel = 'Per Hari'; break;
      case 'week': granularityLabel = 'Per Minggu'; break;
      case 'month': granularityLabel = 'Per Bulan'; break;
      default: granularityLabel = 'Per Hari';
    }
  } else {
    // Auto Logic
    if (scopeDays <= 1) {
      granularityLabel = 'Per Jam';
      granularityValue = 'hour';
    } else if (scopeDays <= 31) {
      granularityLabel = 'Per Hari';
      granularityValue = 'day';
    } else if (scopeDays <= 365) {
      granularityLabel = 'Per Minggu';
      granularityValue = 'week';
    } else {
      granularityLabel = 'Per Bulan';
      granularityValue = 'month';
    }

    // Override granularity if period is monthly (explicitly requested by user via period)
    if (period === 'monthly' && scopeDays > 31) {
      granularityLabel = 'Per Bulan';
      granularityValue = 'month';
    }
  }

  return {
    scopeDays,
    scopeLabel,
    granularityLabel,
    granularityValue,
    isAuto: manualGranularity === 'auto'
  };
};

/**
 * Table Response Contract / Standardization
 * Ensures data passed to tables has consistent fields
 */
export const standardizeTableData = (data, type = 'generic') => {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => {
    let displayDate = item.displayDate || '';
    if (!displayDate) {
      const rawDate = item.log_time || item.log_date || item.log_month || item.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        displayDate = isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString();
      }
    }

    const base = {
      ...item,
      displayDate
    };

    // Specific standardizations based on type
    if (type === 'traffic') {
      base.rx = Number(
        item.total_download_bytes
        || item.total_rx_bytes
        || item.rx_bytes
        || item.download_bytes
        || item.download_value
        || item.downloadValue
        || item.daily_download
        || item.total_rx
        || 0
      );
      base.tx = Number(
        item.total_upload_bytes
        || item.total_tx_bytes
        || item.tx_bytes
        || item.upload_bytes
        || item.upload_value
        || item.uploadValue
        || item.daily_upload
        || item.total_tx
        || 0
      );
      // Speed metrics (Mbps) fallback for daily reports when byte counters are 0
      base.rx_mbps = Number(
        item.download_mbps
        || item.avg_download
        || item.dl_mbps
        || 0
      );
      base.tx_mbps = Number(
        item.upload_mbps
        || item.avg_upload
        || item.ul_mbps
        || 0
      );
      base.total = base.rx + base.tx;
    }

    if (type === 'resource') {
      const rawCpu = Number(item.cpu_load || item.avg_cpu_load || item.cpu || item.cpu_usage || item.cpu_percent || item.cpu_p || item.avg_cpu || item.sum_cpu || item.sum_cpu_load || 0);
      const rawMem = Number(item.min_free_memory || item.free_memory || item.memory || item.avg_mem || item.sum_mem || item.sum_free_memory || 0);
      
      base.cpu = rawCpu;
      base.cpu_percent_standard = rawCpu;
      
      // Simpan nilai mem "apa adanya" untuk konsumsi lain (bisa bytes atau persen tergantung sumber)
      base.mem = rawMem;
      base.is_mem_bytes = rawMem > 1000;
      
      // Preferensi: gunakan persen kalau tersedia eksplisit dari DB/API
      const memPercentCandidate = Number(
        item.mem_percent ?? item.memory_usage ?? item.mem_usage
      );
      
      const hasValidPercent = Number.isFinite(memPercentCandidate) && memPercentCandidate >= 0 && memPercentCandidate <= 100;
      
      // Coba hitung dari total_memory bila tersedia (free -> usage%)
      const totalMem = Number(item.total_memory || item.total_mem || 0);
      let computedPct = null;
      if (base.is_mem_bytes && totalMem > 0) {
        computedPct = ((totalMem - rawMem) / totalMem) * 100;
      }
      
      // Prioritas: eksplisit persen > hitung dari total > tidak tersedia (null)
      const finalMemPct = hasValidPercent ? memPercentCandidate
        : (computedPct !== null ? computedPct : null);
      
      base.cpu_usage = base.cpu_percent_standard;
      base.mem_usage = finalMemPct;
      base.mem_usage_source = hasValidPercent ? 'provided' : (computedPct !== null ? 'computed' : null);
      base.cpu_p = Number(item.max_cpu_load || item.cpu_p || item.peak_cpu || item.cpu_peak || base.cpu_percent_standard);
    }

    if (type === 'generic') {
      base.cpu_percent_standard = Number(item.cpu_load || item.avg_cpu_load || item.cpu || item.cpu_usage || item.cpu_percent || item.sum_cpu || item.sum_cpu_load || 0);
      base.cpu = base.cpu_percent_standard;
      base.memory = Number(item.min_free_memory || item.free_memory || item.memory || item.mem_usage || item.mem_percent || item.sum_mem || item.sum_free_memory || 0);
      base.rx = Number(
        item.total_download_bytes
        || item.total_rx_bytes
        || item.rx_bytes
        || item.download_bytes
        || item.download_value
        || item.downloadValue
        || item.sum_rx
        || 0
      );
      base.tx = Number(
        item.total_upload_bytes
        || item.total_tx_bytes
        || item.tx_bytes
        || item.upload_bytes
        || item.upload_value
        || item.uploadValue
        || item.sum_tx
        || 0
      );
      base.pppoe = Number(
        item.total_pppoe
        || item.pppoe_count
        || item.pppoe_active
        || item.avg_pppoe_users
        || item.max_pppoe_users
        || item.sum_pppoe
        || item.pppoe
        || 0
      );
      base.hotspot = Number(
        item.total_hotspot
        || item.hotspot_count
        || item.hotspot_active
        || item.avg_hotspot_users
        || item.max_hotspot_users
        || item.sum_hotspot
        || item.hotspot
        || 0
      );
    }

    return base;
  });
};

/**
 * Utility: Fill temporal gaps in time-series data
 * Ensures every day/hour in range has a record
 */
export const fillGaps = (data, startDate, endDate, granularity = 'day') => {
  if (!Array.isArray(data) || !startDate || !endDate) return data;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate start/end dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return data;

  const result = [];
  const dataMap = new Map();
  
  data.forEach(item => {
    const rawDate = item.log_date || item.log_time;
    if (!rawDate) return;
    
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return; // Skip invalid dates
    
    const key = dateObj.toISOString().split(granularity === 'day' ? 'T' : ':')[0];
    dataMap.set(key, item);
  });

  let current = new Date(start);
  let lastKnown = data.length > 0 ? data[0] : null; // Mencegah mis-data dengan forward fill
  let safetyCounter = 0;
  const maxIterations = granularity === 'day' ? 366 : 366 * 24;

  while (current <= end && safetyCounter < maxIterations) {
    safetyCounter++;
    const key = current.toISOString().split(granularity === 'day' ? 'T' : ':')[0];
    
    if (dataMap.has(key)) {
      const item = dataMap.get(key);
      result.push(item);
      lastKnown = item; // Update reference for next gaps
    } else {
      // Create record using lastKnown for states (Forward Fill) and 0 for counters (Reset)
      const gapRecord = {
        log_date: key,
        log_time: key,
        displayDate: current.toLocaleDateString(),
        is_gap: true
      };

      // Apply forward fill logic based on registry
      Object.entries(METRIC_REGISTRY).forEach(([field, meta]) => {
        if (lastKnown && lastKnown[field] !== undefined) {
          // States like CPU, RAM, Temperature are better forward-filled
          if (meta.type === 'usage' || meta.type === 'env' || meta.type === 'resource') {
            gapRecord[field] = lastKnown[field];
          } else {
            // Traffic/Counters are better 0-filled for gaps
            gapRecord[field] = 0;
          }
        } else {
          gapRecord[field] = 0;
        }
      });

      result.push(gapRecord);
    }
    
    if (granularity === 'day') {
      current.setDate(current.getDate() + 1);
    } else {
      current.setHours(current.getHours() + 1);
    }
  }
  
  return result;
};

/**
 * Utility: Calculate Data Quality Score (0-100)
 * Based on data density and zero-value audit
 */
export const calculateDataQualityScore = (data, expectedPoints) => {
  if (!Array.isArray(data) || data.length === 0) return { score: 0, status: 'Kritis', message: 'Tidak ada data' };
  
  const actualPoints = data.length;
  const density = (actualPoints / expectedPoints) * 100;
  
  // Audit Zero Values (Too many zeros might indicate sensor failure)
  const zeroTrafficCount = data.filter(d => (Number(d.rx_bytes) + Number(d.tx_bytes)) === 0).length;
  const zeroTrafficPct = (zeroTrafficCount / actualPoints) * 100;
  
  // Calculate final score
  // Weight: 70% Density, 30% Zero-Value Health
  const densityScore = Math.min(100, density);
  const zeroHealthScore = Math.max(0, 100 - zeroTrafficPct);
  
  const finalScore = (densityScore * 0.7) + (zeroHealthScore * 0.3);
  
  let status = 'Sehat';
  let message = 'Kualitas data sangat baik untuk analisis.';
  
  if (finalScore < 50) {
    status = 'Kritis';
    message = 'Data sangat tidak lengkap. Hasil analisis tidak dapat diandalkan.';
  } else if (finalScore < 80) {
    status = 'Waspada';
    message = 'Ada beberapa celah data. Hasil analisis mungkin kurang akurat.';
  }
  
  return {
    score: Math.round(finalScore),
    status,
    message,
    density: Math.round(density),
    zeroPct: Math.round(zeroTrafficPct)
  };
};

/**
 * Metric Registry: Database referensi satuan standar
 * Memetakan nama kolom ke tipe pengukuran dan rentang valid
 */
export const METRIC_REGISTRY = {
  // Traffic / Network (Source usually Bytes)
  rx_bytes: { unit: 'BYTES', type: 'traffic', label: 'Download', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  tx_bytes: { unit: 'BYTES', type: 'traffic', label: 'Upload', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  total_download_bytes: { unit: 'BYTES', type: 'traffic', label: 'Total Download', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  total_upload_bytes: { unit: 'BYTES', type: 'traffic', label: 'Total Upload', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  total_rx_bytes: { unit: 'BYTES', type: 'traffic', label: 'Total Download', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  total_tx_bytes: { unit: 'BYTES', type: 'traffic', label: 'Total Upload', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  download_bytes: { unit: 'BYTES', type: 'traffic', label: 'Download', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  upload_bytes: { unit: 'BYTES', type: 'traffic', label: 'Upload', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  
  // Speed (Source usually bps or Mbps)
  download_speed: { unit: 'Mbps', type: 'speed', label: 'Speed Down', range: [0, 10000], source: 'Mbps', unit_data_type: 'string' },
  upload_speed: { unit: 'Mbps', type: 'speed', label: 'Speed Up', range: [0, 10000], source: 'Mbps', unit_data_type: 'string' },
  download_mbps: { unit: 'Mbps', type: 'speed', label: 'Speed Down', range: [0, 10000], source: 'Mbps', unit_data_type: 'string' },
  upload_mbps: { unit: 'Mbps', type: 'speed', label: 'Speed Up', range: [0, 10000], source: 'Mbps', unit_data_type: 'string' },
  
  // Resources (Source Percent or Bytes)
  cpu_load: { unit: 'PERCENT', type: 'usage', label: 'CPU Load', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  cpu_usage: { unit: 'PERCENT', type: 'usage', label: 'CPU Usage', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  free_memory: { unit: 'BYTES', type: 'resource', label: 'Free RAM', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  memory_usage: { unit: 'PERCENT', type: 'usage', label: 'RAM Usage', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  free_hdd: { unit: 'BYTES', type: 'resource', label: 'Free HDD', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  avg_cpu_load: { unit: 'PERCENT', type: 'usage', label: 'CPU Avg', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  max_cpu_load: { unit: 'PERCENT', type: 'usage', label: 'CPU Max', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  min_cpu_load: { unit: 'PERCENT', type: 'usage', label: 'CPU Min', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  avg_memory_usage: { unit: 'BYTES', type: 'resource', label: 'RAM Avg', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  max_memory_usage: { unit: 'BYTES', type: 'resource', label: 'RAM Max', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  min_memory_usage: { unit: 'BYTES', type: 'resource', label: 'RAM Min', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  avg_disk_usage: { unit: 'BYTES', type: 'resource', label: 'Disk Avg', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  max_disk_usage: { unit: 'BYTES', type: 'resource', label: 'Disk Max', range: [0, Infinity], source: 'BYTES', unit_data_type: 'string' },
  
  // Daily Aggregates (Often already MB in DB)
  daily_download: { unit: 'BYTES', type: 'traffic', label: 'Daily Down', range: [0, Infinity], source: 'MB', unit_data_type: 'string' },
  daily_upload: { unit: 'BYTES', type: 'traffic', label: 'Daily Up', range: [0, Infinity], source: 'MB', unit_data_type: 'string' },
  
  uptime: { unit: 'SECONDS', type: 'time', label: 'Uptime', range: [0, Infinity], source: 'SECONDS', unit_data_type: 'string' },
  uptime_seconds: { unit: 'SECONDS', type: 'time', label: 'Uptime', range: [0, Infinity], source: 'SECONDS', unit_data_type: 'string' },
  availability_percentage: { unit: 'PERCENT', type: 'usage', label: 'Availability', range: [0, 100], source: 'PERCENT', unit_data_type: 'string' },
  
  // Client Counts
  total_pppoe: { unit: 'COUNT', type: 'quantity', label: 'PPPoE Users', range: [0, Infinity], source: 'COUNT', unit_data_type: 'string' },
  total_hotspot: { unit: 'COUNT', type: 'quantity', label: 'Hotspot Users', range: [0, Infinity], source: 'COUNT', unit_data_type: 'string' },
  total_active: { unit: 'COUNT', type: 'quantity', label: 'Active Clients', range: [0, Infinity], source: 'COUNT', unit_data_type: 'string' },
};

// Ensure every metric metadata has unit_data_type defined as string
Object.keys(METRIC_REGISTRY).forEach(k => {
  if (!METRIC_REGISTRY[k].unit_data_type) {
    METRIC_REGISTRY[k].unit_data_type = 'string';
  }
});

/**
 * Unit Conversion Matrix (Mencegah Misvalue)
 * Mengonversi nilai dari satuan asal ke satuan target
 */
export const convertValue = (val, from, to) => {
  if (val === undefined || val === null || isNaN(val)) return val;
  if (from === to) return val;

  const numVal = Number(val);
  
  // Bytes Matrix
  const byteMap = { 'BYTES': 1, 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
  if (byteMap[from] && byteMap[to]) {
    return (numVal * byteMap[from]) / byteMap[to];
  }

  // Speed Matrix (SI 1000)
  const speedMap = { 'bps': 1, 'Kbps': 1000, 'Mbps': 1000000, 'Gbps': 1000000000 };
  if (speedMap[from] && speedMap[to]) {
    return (numVal * speedMap[from]) / speedMap[to];
  }

  // Time Matrix
  const timeMap = { 'SECONDS': 1, 'MINUTES': 60, 'HOURS': 3600, 'DAYS': 86400 };
  if (timeMap[from] && timeMap[to]) {
    return (numVal * timeMap[from]) / timeMap[to];
  }

  return numVal;
};

/**
 * Pattern Matching: Algoritma untuk inferensi satuan dari nama kolom tidak standar
 */
export const inferUnit = (columnName, sampleValues = []) => {
  const name = columnName.toLowerCase();
  
  // 1. Exact Match from Registry
  if (METRIC_REGISTRY[columnName]) return METRIC_REGISTRY[columnName];
  
  // 2. Pattern Matching
  if (name.includes('bytes') || name.includes('traffic') || name.startsWith('rx_') || name.startsWith('tx_')) {
    return { unit: 'BYTES', type: 'traffic', label: columnName, range: [0, Infinity] };
  }
  
  if (name.includes('percent') || name.includes('pct') || name.endsWith('_p') || name.includes('load') || name.includes('usage')) {
    // Check values to confirm if it's really percentage (0-100)
    const isLikelyPercent = sampleValues.length > 0 && sampleValues.every(v => v >= 0 && v <= 100);
    return { 
      unit: 'PERCENT', 
      type: 'usage', 
      label: columnName, 
      range: [0, 100],
      isAmbiguous: !isLikelyPercent 
    };
  }
  
  if (name.includes('speed') || name.includes('rate') || name.includes('bps')) {
    return { unit: 'Mbps', type: 'speed', label: columnName, range: [0, 10000] };
  }
  
  if (name.includes('temp') || name.includes('degree')) {
    return { unit: 'CELSIUS', type: 'env', label: columnName, range: [-20, 120] };
  }

  if (name.includes('count') || name.includes('total_') || name.includes('num_') || name.includes('users')) {
    return { unit: 'COUNT', type: 'quantity', label: columnName, range: [0, Infinity] };
  }

  // Default Fallback
  return { unit: 'UNIT', type: 'generic', label: columnName, range: [-Infinity, Infinity], isAmbiguous: true };
};

/**
 * Data Unit Analyzer: Menganalisis seluruh dataset untuk mapping satuan otomatis
 */
export const analyzeDataUnits = (data) => {
  if (!Array.isArray(data) || data.length === 0) return {};
  
  const sample = data[0];
  const keys = Object.keys(sample).filter(k => 
    !['log_date', 'log_time', 'displayDate', 'is_gap', 'id', 'created_at'].includes(k)
  );
  
  const mapping = {};
  keys.forEach(key => {
    const rawValues = data.map(d => d[key]).filter(v => v !== undefined && v !== null && v !== '');
    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    rawValues.forEach(v => {
      const t = typeof v;
      if (t === 'number' && isFinite(v)) numericCount++;
      else if (t === 'boolean') booleanCount++;
      else if (t === 'string') {
        const n = Number(v);
        if (!isNaN(n) && isFinite(n)) numericCount++;
        else {
          const d = new Date(v);
          if (!isNaN(d.getTime())) dateCount++;
          else if (v.toLowerCase() === 'true' || v.toLowerCase() === 'false' || v === '0' || v === '1') booleanCount++;
        }
      } else if (v instanceof Date && !isNaN(v.getTime())) {
        dateCount++;
      }
    });
    const total = rawValues.length || 1;
    let dataType = 'string';
    if (numericCount / total >= 0.6) dataType = 'number';
    else if (dateCount / total >= 0.6) dataType = 'datetime';
    else if (booleanCount / total >= 0.6) dataType = 'boolean';

    const numericValues = rawValues.map(v => Number(v)).filter(v => !isNaN(v));
    mapping[key] = inferUnit(key, numericValues);
    mapping[key].data_type = dataType;
    
    // Anomaly Detection based on range
    const { range } = mapping[key];
    const outOfRange = numericValues.filter(v => v < range[0] || v > range[1]);
    mapping[key].anomalyCount = outOfRange.length;
    mapping[key].isHealthy = outOfRange.length === 0;
  });
  
  return mapping;
};

/**
 * Client Pivot Aggregation
 */
export const pivotClientStats = (data, mode = 'day', filterPositive = false) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    const t = pickTs(r);
    if (!t && mode !== 'board') return;
    let key = '';
    if (mode === 'day') {
      const d = new Date(t);
      if (isNaN(d.getTime())) return;
      key = d.toISOString().slice(0, 10);
    } else if (mode === 'hour') {
      const d = new Date(t);
      if (isNaN(d.getTime())) return;
      d.setMinutes(0, 0, 0);
      key = d.toISOString().slice(0, 13);
    } else if (mode === 'board') {
      key = r.board_id || r.boardid || 'UNKNOWN';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  
  const sumField = (arr, names) => arr.reduce((acc, x) => {
    for (const n of names) {
      const v = Number(x[n]);
      if (!isNaN(v)) return acc + v;
    }
    return acc;
  }, 0);
  
  const rows = Object.keys(groups).sort().map(k => {
    const items = groups[k];
    let pppoe = sumField(items, ['total_pppoe', 'pppoe_count', 'pppoe', 'pppoe_users']);
    let hotspot = sumField(items, ['total_hotspot', 'hotspot_count', 'hotspot', 'hotspot_users']);
    let active = sumField(items, ['total_active', 'active', 'active_users']);
    if (filterPositive) {
      pppoe = sumField(items.filter(i => Number(i.total_pppoe || i.pppoe_count || 0) > 0), ['total_pppoe', 'pppoe_count', 'pppoe', 'pppoe_users']);
      hotspot = sumField(items.filter(i => Number(i.total_hotspot || i.hotspot_count || 0) > 0), ['total_hotspot', 'hotspot_count', 'hotspot', 'hotspot_users']);
    }
    const total = pppoe + hotspot;
    let waktu = k;
    if (mode === 'hour') waktu = k.replace('T', ' ').concat(':00');
    if (mode === 'board') waktu = k;
    return { Waktu: waktu, PPPoE: pppoe, Hotspot: hotspot, Active: active, Total: total };
  });
  
  return rows;
};

export const pivotResourceAverage = (data, mode = 'day') => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    let key = '';
    if (mode === 'day') {
      const t = pickTs(r);
      if (!t) return;
      const d = new Date(t);
      if (isNaN(d.getTime())) return;
      key = d.toISOString().slice(0, 10);
    } else if (mode === 'hour') {
      const t = pickTs(r);
      if (!t) return;
      const d = new Date(t);
      if (isNaN(d.getTime())) return;
      d.setMinutes(0, 0, 0);
      key = d.toISOString().slice(0, 13);
    } else if (mode === 'minute') {
      const t = pickTs(r);
      if (!t) return;
      const d = new Date(t);
      if (isNaN(d.getTime())) return;
      d.setSeconds(0, 0);
      key = d.toISOString().slice(0, 16);
    } else if (mode === 'board') {
      key = r.board_id || r.boardid || 'UNKNOWN';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };
  const rows = Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const cpuArr = items.map(i => Number(i.cpu_load));
    const memArr = items.map(i => Number(i.free_memory));
    const hddArr = items.map(i => Number(i.free_hdd));
    const avg_cpu_load = avgNum(cpuArr);
    const avg_free_memory = avgNum(memArr);
    const avg_free_hdd = avgNum(hddArr);
    if (mode === 'board') {
      return { Board: k, avg_cpu_load, avg_free_memory, avg_free_hdd };
    }
    let waktu = k;
    if (mode === 'hour') waktu = k.replace('T', ' ').concat(':00');
    if (mode === 'minute') waktu = k.replace('T', ' ');
    return { Waktu: waktu, avg_cpu_load, avg_free_memory, avg_free_hdd };
  });
  return rows;
};

export const pivotResourceCpuExtrema = (data, mode = 'day') => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    const t = pickTs(r);
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    let key = '';
    if (mode === 'day') {
      key = d.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const rows = Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const cpuVals = items.map(i => Number(i.cpu_load)).filter(v => !isNaN(v));
    const max_cpu_load = cpuVals.length ? Math.max(...cpuVals) : 0;
    const min_cpu_load = cpuVals.length ? Math.min(...cpuVals) : 0;
    return { Waktu: k, max_cpu_load, min_cpu_load };
  });
  return rows;
};

export const pivotSpeedPerDay = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    const t = pickTs(r);
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const dls = items.map(i => Number(i.download_mbps || i.dl_mbps || 0));
    const uls = items.map(i => Number(i.upload_mbps || i.ul_mbps || 0));
    const total_download_mbps = sum(dls);
    const total_upload_mbps = sum(uls);
    const avg_download_mbps = avgNum(dls);
    const avg_upload_mbps = avgNum(uls);
    return { Waktu: k, total_download_mbps, total_upload_mbps, avg_download_mbps, avg_upload_mbps };
  });
};

export const pivotSpeedPerHour = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    const t = pickTs(r);
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    d.setMinutes(0, 0, 0);
    const key = d.toISOString().slice(0, 13);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const dls = items.map(i => Number(i.download_mbps || i.dl_mbps || 0));
    const uls = items.map(i => Number(i.upload_mbps || i.ul_mbps || 0));
    const total_download_mbps = sum(dls);
    const total_upload_mbps = sum(uls);
    const waktu = k.replace('T', ' ').concat(':00');
    return { Waktu: waktu, total_download_mbps, total_upload_mbps };
  });
};

export const pivotSpeedPerInterface = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const key = r.interface_name || r.interface || 'UNKNOWN';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const dls = items.map(i => Number(i.download_mbps || i.dl_mbps || 0));
    const uls = items.map(i => Number(i.upload_mbps || i.ul_mbps || 0));
    const total_download_mbps = sum(dls);
    const total_upload_mbps = sum(uls);
    const avg_download_mbps = avgNum(dls);
    const avg_upload_mbps = avgNum(uls);
    return { Interface: k, total_download_mbps, total_upload_mbps, avg_download_mbps, avg_upload_mbps };
  });
};

export const pivotSpeedPerHourInterface = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    const t = pickTs(r);
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    d.setMinutes(0, 0, 0);
    const hourKey = d.toISOString().slice(0, 13);
    const iface = r.interface_name || r.interface || 'UNKNOWN';
    const key = hourKey + '|' + iface;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const [hourKey, iface] = k.split('|');
    const dls = items.map(i => Number(i.download_mbps || i.dl_mbps || 0));
    const uls = items.map(i => Number(i.upload_mbps || i.ul_mbps || 0));
    const total_download_mbps = sum(dls);
    const total_upload_mbps = sum(uls);
    const waktu = hourKey.replace('T', ' ').concat(':00');
    return { Waktu: waktu, Interface: iface, total_download_mbps, total_upload_mbps };
  });
};

export const pivotSpeedDayPeak = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  const pickTs = (r) => r.log_time || r.log_date || r.created_at || r.log_month;
  data.forEach(r => {
    const t = pickTs(r);
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const dls = items.map(i => Number(i.download_mbps || i.dl_mbps || 0)).filter(v => !isNaN(v));
    const uls = items.map(i => Number(i.upload_mbps || i.ul_mbps || 0)).filter(v => !isNaN(v));
    const max_download_mbps = dls.length ? Math.max(...dls) : 0;
    const max_upload_mbps = uls.length ? Math.max(...uls) : 0;
    return { Waktu: k, max_download_mbps, max_upload_mbps };
  });
};
/**
 * Pivot Daily Summary per Board
 */
export const pivotDailySummaryPerBoard = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_date)
    .map(r => {
      const d = new Date(r.log_date);
      const waktu = isNaN(d.getTime()) ? String(r.log_date) : d.toISOString().slice(0, 10);
      return {
        Waktu: waktu,
        avg_download: Number(r.avg_download || 0),
        max_download: Number(r.max_download || 0),
        total_download_bytes: Number(r.total_download_bytes || 0),
        avg_upload: Number(r.avg_upload || 0),
        max_upload: Number(r.max_upload || 0),
        total_upload_bytes: Number(r.total_upload_bytes || 0),
        avg_cpu_load: Number(r.avg_cpu_load || 0),
        max_cpu_load: Number(r.max_cpu_load || 0),
        min_free_memory: Number(r.min_free_memory || 0),
        avg_hotspot_users: Number(r.avg_hotspot_users || 0),
        max_hotspot_users: Number(r.max_hotspot_users || 0),
        avg_pppoe_users: Number(r.avg_pppoe_users || 0),
        max_pppoe_users: Number(r.max_pppoe_users || 0),
        board_id: r.board_id || r.boardid || 'UNKNOWN'
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu));
  return rows;
};

export const pivotDailyToMonthlyAgg = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time || r.created_at || r.log_month;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  const sumNum = (arr) => arr.filter(v => typeof v === 'number' && !isNaN(v)).reduce((a, b) => a + b, 0);
  const maxNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? Math.max(...nums) : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const avg_download = avgNum(items.map(i => Number(i.avg_download || 0)));
    const max_download = maxNum(items.map(i => Number(i.max_download || 0)));
    const total_download_bytes = sumNum(items.map(i => Number(i.total_download_bytes || 0)));
    const avg_upload = avgNum(items.map(i => Number(i.avg_upload || 0)));
    const max_upload = maxNum(items.map(i => Number(i.max_upload || 0)));
    const total_upload_bytes = sumNum(items.map(i => Number(i.total_upload_bytes || 0)));
    const avg_cpu_load = avgNum(items.map(i => Number(i.avg_cpu_load || 0)));
    const max_cpu_load = maxNum(items.map(i => Number(i.max_cpu_load || 0)));
    return { Waktu: k, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load };
  });
};

export const pivotDailyResourceHealthMonthly = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time || r.created_at || r.log_month;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  const maxNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? Math.max(...nums) : 0;
  };
  const minNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? Math.min(...nums) : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const avg_cpu_load = avgNum(items.map(i => Number(i.avg_cpu_load || 0)));
    const max_cpu_load = maxNum(items.map(i => Number(i.max_cpu_load || 0)));
    const min_free_memory = minNum(items.map(i => Number(i.min_free_memory || i.free_memory || 0)));
    return { Waktu: k, avg_cpu_load, max_cpu_load, min_free_memory };
  });
};

export const pivotDailyUsersMonthly = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time || r.created_at || r.log_month;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  const maxNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? Math.max(...nums) : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const avg_hotspot_users = avgNum(items.map(i => Number(i.avg_hotspot_users || 0)));
    const max_hotspot_users = maxNum(items.map(i => Number(i.max_hotspot_users || 0)));
    const avg_pppoe_users = avgNum(items.map(i => Number(i.avg_pppoe_users || 0)));
    const max_pppoe_users = maxNum(items.map(i => Number(i.max_pppoe_users || 0)));
    return { Waktu: k, avg_hotspot_users, max_hotspot_users, avg_pppoe_users, max_pppoe_users };
  });
};

export const pivotDailyMultiBoardMonthlyComparison = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time || r.created_at || r.log_month;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const monthKey = d.toISOString().slice(0, 7);
    const board = r.board_id || r.boardid || 'UNKNOWN';
    const key = board + '|' + monthKey;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const [board, monthKey] = k.split('|');
    const avg_download = avgNum(items.map(i => Number(i.avg_download || 0)));
    const avg_upload = avgNum(items.map(i => Number(i.avg_upload || 0)));
    const avg_cpu_load = avgNum(items.map(i => Number(i.avg_cpu_load || 0)));
    return { Board: board, Waktu: monthKey, avg_download, avg_upload, avg_cpu_load };
  });
};

export const pivotMonthlySummaryPerBoard = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_month)
    .map(r => {
      const d = new Date(r.log_month);
      const waktu = isNaN(d.getTime()) ? String(r.log_month) : d.toISOString().slice(0, 7);
      return {
        Waktu: waktu,
        board_id: r.board_id || r.boardid || 'UNKNOWN',
        avg_download: Number(r.avg_download || 0),
        max_download: Number(r.max_download || 0),
        total_download_bytes: Number(r.total_download_bytes || 0),
        avg_upload: Number(r.avg_upload || 0),
        max_upload: Number(r.max_upload || 0),
        total_upload_bytes: Number(r.total_upload_bytes || 0),
        avg_cpu_load: Number(r.avg_cpu_load || 0),
        max_cpu_load: Number(r.max_cpu_load || 0),
        avg_hotspot_users: Number(r.avg_hotspot_users || 0),
        max_hotspot_users: Number(r.max_hotspot_users || 0)
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu));
  return rows;
};

export const pivotYearAggFromMonthly = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_month || r.log_date;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = String(d.getUTCFullYear());
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const avgNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  const sumNum = (arr) => arr.filter(v => typeof v === 'number' && !isNaN(v)).reduce((a, b) => a + b, 0);
  const maxNum = (arr) => {
    const nums = arr.filter(v => typeof v === 'number' && !isNaN(v));
    return nums.length ? Math.max(...nums) : 0;
  };
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const avg_download = avgNum(items.map(i => Number(i.avg_download || 0)));
    const max_download = maxNum(items.map(i => Number(i.max_download || 0)));
    const total_download_bytes = sumNum(items.map(i => Number(i.total_download_bytes || 0)));
    const avg_upload = avgNum(items.map(i => Number(i.avg_upload || 0)));
    const max_upload = maxNum(items.map(i => Number(i.max_upload || 0)));
    const total_upload_bytes = sumNum(items.map(i => Number(i.total_upload_bytes || 0)));
    const avg_cpu_load = avgNum(items.map(i => Number(i.avg_cpu_load || 0)));
    const max_cpu_load = maxNum(items.map(i => Number(i.max_cpu_load || 0)));
    const avg_hotspot_users = avgNum(items.map(i => Number(i.avg_hotspot_users || 0)));
    const max_hotspot_users = maxNum(items.map(i => Number(i.max_hotspot_users || 0)));
    return { Tahun: k, avg_download, max_download, total_download_bytes, avg_upload, max_upload, total_upload_bytes, avg_cpu_load, max_cpu_load, avg_hotspot_users, max_hotspot_users };
  });
};

export const pivotMonthlyTrafficComparisonMultiBoard = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_month)
    .map(r => {
      const d = new Date(r.log_month);
      const waktu = isNaN(d.getTime()) ? String(r.log_month) : d.toISOString().slice(0, 7);
      return {
        Board: r.board_id || r.boardid || 'UNKNOWN',
        Waktu: waktu,
        avg_download: Number(r.avg_download || 0),
        avg_upload: Number(r.avg_upload || 0)
      };
    })
    .sort((a, b) => a.Board.localeCompare(b.Board) || a.Waktu.localeCompare(b.Waktu));
  return rows;
};

export const pivotMonthlyCpuTrend = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_month)
    .map(r => {
      const d = new Date(r.log_month);
      const waktu = isNaN(d.getTime()) ? String(r.log_month) : d.toISOString().slice(0, 7);
      return {
        Waktu: waktu,
        avg_cpu_load: Number(r.avg_cpu_load || 0),
        max_cpu_load: Number(r.max_cpu_load || 0)
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu));
  return rows;
};

export const pivotYearPeakFromMonthly = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_month;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = String(d.getUTCFullYear());
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const md = items.map(i => Number(i.max_download || 0)).filter(v => !isNaN(v));
    const mu = items.map(i => Number(i.max_upload || 0)).filter(v => !isNaN(v));
    const peak_download = md.length ? Math.max(...md) : 0;
    const peak_upload = mu.length ? Math.max(...mu) : 0;
    return { Tahun: k, peak_download, peak_upload };
  });
};

export const pivotInterfaceDailyUsage = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_date && (r.interface_name || r.interface))
    .map(r => {
      const d = new Date(r.log_date);
      const waktu = isNaN(d.getTime()) ? String(r.log_date) : d.toISOString().slice(0, 10);
      return {
        Waktu: waktu,
        Board: r.board_id || r.boardid || 'UNKNOWN',
        Interface: r.interface_name || r.interface || 'UNKNOWN',
        total_tx_bytes: Number(r.total_tx_bytes || r.tx_bytes || 0),
        total_rx_bytes: Number(r.total_rx_bytes || r.rx_bytes || 0)
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu) || a.Interface.localeCompare(b.Interface));
  return rows;
};

export const pivotInterfaceDailyBoardAgg = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = (r.board_id || r.boardid || 'UNKNOWN') + '|' + d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const [board, waktu] = k.split('|');
    const total_tx_bytes = items.reduce((acc, i) => acc + Number(i.total_tx_bytes || i.tx_bytes || 0), 0);
    const total_rx_bytes = items.reduce((acc, i) => acc + Number(i.total_rx_bytes || i.rx_bytes || 0), 0);
    return { Board: board, Waktu: waktu, total_tx_bytes, total_rx_bytes };
  });
};

export const pivotInterfaceMonthlyAgg = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const total_tx_bytes = items.reduce((acc, i) => acc + Number(i.total_tx_bytes || i.tx_bytes || 0), 0);
    const total_rx_bytes = items.reduce((acc, i) => acc + Number(i.total_rx_bytes || i.rx_bytes || 0), 0);
    return { Waktu: k, total_tx_bytes, total_rx_bytes };
  });
};

export const pivotInterfaceRanking = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const key = r.interface_name || r.interface || 'UNKNOWN';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const rows = Object.keys(groups).map(k => {
    const items = groups[k];
    const total_tx_bytes = items.reduce((acc, i) => acc + Number(i.total_tx_bytes || i.tx_bytes || 0), 0);
    const total_rx_bytes = items.reduce((acc, i) => acc + Number(i.total_rx_bytes || i.rx_bytes || 0), 0);
    const total_traffic_bytes = total_tx_bytes + total_rx_bytes;
    return { Interface: k, total_tx_bytes, total_rx_bytes, total_traffic_bytes };
  });
  rows.sort((a, b) => b.total_traffic_bytes - a.total_traffic_bytes);
  return rows;
};

export const pivotInterfaceYearlyAgg = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date || r.log_time;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = String(d.getUTCFullYear());
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const total_tx_bytes = items.reduce((acc, i) => acc + Number(i.total_tx_bytes || i.tx_bytes || 0), 0);
    const total_rx_bytes = items.reduce((acc, i) => acc + Number(i.total_rx_bytes || i.rx_bytes || 0), 0);
    return { Tahun: k, total_tx_bytes, total_rx_bytes };
  });
};

export const pivotPPPoEDailyUsage = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_date && (r.pppoe_username || r.username))
    .map(r => {
      const d = new Date(r.log_date);
      const waktu = isNaN(d.getTime()) ? String(r.log_date) : d.toISOString().slice(0, 10);
      const upload_bytes = Number(r.upload_bytes || 0);
      const download_bytes = Number(r.download_bytes || 0);
      return {
        Waktu: waktu,
        User: r.pppoe_username || r.username || 'UNKNOWN',
        upload_bytes,
        download_bytes,
        total_bytes: upload_bytes + download_bytes
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu) || a.User.localeCompare(b.User));
  return rows;
};

export const pivotPPPoEDailyTop = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const dayKey = d.toISOString().slice(0, 10);
    const user = r.pppoe_username || r.username || 'UNKNOWN';
    const key = dayKey + '|' + user;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const rows = Object.keys(groups).map(k => {
    const items = groups[k];
    const [dayKey, user] = k.split('|');
    const total_bytes = items.reduce((acc, i) => acc + Number(i.upload_bytes || 0) + Number(i.download_bytes || 0), 0);
    return { Waktu: dayKey, User: user, total_bytes };
  });
  rows.sort((a, b) => b.Waktu.localeCompare(a.Waktu) || b.total_bytes - a.total_bytes);
  return rows;
};

export const pivotPPPoEMonthlyAgg = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const total_upload_bytes = items.reduce((acc, i) => acc + Number(i.upload_bytes || 0), 0);
    const total_download_bytes = items.reduce((acc, i) => acc + Number(i.download_bytes || 0), 0);
    return { Waktu: k, total_upload_bytes, total_download_bytes };
  });
};

export const pivotPPPoEUserMonthlyTrend = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const monthKey = d.toISOString().slice(0, 7);
    const user = r.pppoe_username || r.username || 'UNKNOWN';
    const key = user + '|' + monthKey;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const rows = Object.keys(groups).map(k => {
    const items = groups[k];
    const [user, monthKey] = k.split('|');
    const total_upload_bytes = items.reduce((acc, i) => acc + Number(i.upload_bytes || 0), 0);
    const total_download_bytes = items.reduce((acc, i) => acc + Number(i.download_bytes || 0), 0);
    return { User: user, Waktu: monthKey, total_upload_bytes, total_download_bytes };
  });
  rows.sort((a, b) => a.User.localeCompare(b.User) || a.Waktu.localeCompare(b.Waktu));
  return rows;
};

export const pivotHotspotDailyUsage = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.log_date && (r.username || r.hotspot_username))
    .map(r => {
      const d = new Date(r.log_date);
      const waktu = isNaN(d.getTime()) ? String(r.log_date) : d.toISOString().slice(0, 10);
      const daily_download = Number(r.daily_download || r.download_bytes || 0);
      const daily_upload = Number(r.daily_upload || r.upload_bytes || 0);
      const daily_uptime = Number(r.daily_uptime || r.uptime || 0);
      return {
        Waktu: waktu,
        User: r.username || r.hotspot_username || 'UNKNOWN',
        daily_download,
        daily_upload,
        daily_uptime,
        total_bytes: daily_download + daily_upload
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu) || a.User.localeCompare(b.User));
  return rows;
};

export const pivotHotspotDailyTop = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const dayKey = d.toISOString().slice(0, 10);
    const user = r.username || r.hotspot_username || 'UNKNOWN';
    const key = dayKey + '|' + user;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const rows = Object.keys(groups).map(k => {
    const items = groups[k];
    const [dayKey, user] = k.split('|');
    const total_bytes = items.reduce((acc, i) => acc + Number(i.daily_download || 0) + Number(i.daily_upload || 0), 0);
    return { Waktu: dayKey, User: user, total_bytes };
  });
  rows.sort((a, b) => b.Waktu.localeCompare(a.Waktu) || b.total_bytes - a.total_bytes);
  return rows;
};

export const pivotHotspotMonthlyAggFromRaw = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const groups = {};
  data.forEach(r => {
    const t = r.log_date;
    if (!t) return;
    const d = new Date(t);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.keys(groups).sort().map(k => {
    const items = groups[k];
    const total_download = items.reduce((acc, i) => acc + Number(i.daily_download || 0), 0);
    const total_upload = items.reduce((acc, i) => acc + Number(i.daily_upload || 0), 0);
    const total_uptime = items.reduce((acc, i) => acc + Number(i.daily_uptime || 0), 0);
    return { Waktu: k, total_download, total_upload, total_uptime };
  });
};

export const pivotHotspotMonthlySummaryPerUser = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.month_period && (r.username || r.hotspot_username))
    .map(r => {
      const d = new Date(r.month_period);
      const waktu = isNaN(d.getTime()) ? String(r.month_period) : d.toISOString().slice(0, 7);
      return {
        Waktu: waktu,
        User: r.username || r.hotspot_username || 'UNKNOWN',
        total_download: Number(r.total_download || 0),
        total_upload: Number(r.total_upload || 0),
        total_uptime: Number(r.total_uptime || 0),
        frequency_days: Number(r.frequency_days || 0),
        is_frequent_user: Boolean(r.is_frequent_user)
      };
    })
    .sort((a, b) => a.Waktu.localeCompare(b.Waktu) || a.User.localeCompare(b.User));
  return rows;
};

export const pivotHotspotMonthlyFrequentUsers = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.month_period && (r.is_frequent_user === true || r.is_frequent_user === 'true'))
    .map(r => {
      const d = new Date(r.month_period);
      const waktu = isNaN(d.getTime()) ? String(r.month_period) : d.toISOString().slice(0, 7);
      return {
        Waktu: waktu,
        User: r.username || r.hotspot_username || 'UNKNOWN',
        total_download: Number(r.total_download || 0),
        total_upload: Number(r.total_upload || 0),
        total_uptime: Number(r.total_uptime || 0)
      };
    })
    .sort((a, b) => b.Waktu.localeCompare(a.Waktu));
  return rows;
};

export const pivotHotspotMonthlyTrafficRanking = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const rows = data
    .filter(r => r.month_period && (r.username || r.hotspot_username))
    .map(r => {
      const d = new Date(r.month_period);
      const waktu = isNaN(d.getTime()) ? String(r.month_period) : d.toISOString().slice(0, 7);
      const total_download = Number(r.total_download || 0);
      const total_upload = Number(r.total_upload || 0);
      const total_bytes = total_download + total_upload;
      return {
        Waktu: waktu,
        User: r.username || r.hotspot_username || 'UNKNOWN',
        total_bytes
      };
    });
  rows.sort((a, b) => b.Waktu.localeCompare(a.Waktu) || b.total_bytes - a.total_bytes);
  return rows;
};
/**
 * Utility: Global Filter Validation
 * Checks for logical errors in filter parameters
 */
export const validateFilterParams = (params) => {
  const { startDate, endDate, period, limit } = params;
  const errors = [];

  // 1. Date Logical Validation
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) errors.push("Tanggal awal tidak valid");
    if (isNaN(end.getTime())) errors.push("Tanggal akhir tidak valid");
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (start > end) {
        errors.push("Tanggal awal tidak boleh lebih besar dari tanggal akhir");
      }
      
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      if (diffDays > 366) {
        errors.push("Rentang waktu maksimal adalah 1 tahun (366 hari)");
      }
    }
  }

  // 2. Limit Validation
  if (limit !== 'all') {
    const numLimit = Number(limit);
    if (isNaN(numLimit) || numLimit <= 0) {
      errors.push("Limit harus berupa angka positif atau 'all'");
    }
    if (numLimit > 1000) {
      errors.push("Limit maksimal yang diperbolehkan adalah 1000 sampel");
    }
  }

  // 3. Period Validation
  const validPeriods = ['daily', 'monthly', 'hourly'];
  if (period && !validPeriods.includes(period)) {
    // Note: period might be coming from activeTab logic, be careful
    // errors.push("Periode agregasi tidak valid");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
