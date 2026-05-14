const toISO = (value) => {
  try {
    if (!value) return null;
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d?.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
};

const toDisplay = (iso) => {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return '';
  }
};

const parseNum = (v) => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const clampPercent = (n) => {
  if (n === null) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

const bytesToMbps = (bytes) => {
  const n = parseNum(bytes);
  if (n === null) return null;
  return (n * 8) / 1_000_000;
};

export const normalizeBucketsV2 = (buckets = [], options = {}) => {
  const mode = options.mode === 'frontend' ? 'frontend' : 'server';
  const timeLock = !!options.timeLock;
  const startISO = options.startTime ? toISO(options.startTime) : null;
  const endISO = options.endTime ? toISO(options.endTime) : null;
  const requestedGranularity = options.granularity || 'auto';

  let validCount = 0;
  let droppedCount = 0;
  let gapCount = 0;
  let invalidFieldCount = 0;

  const data = [];

  for (const row of buckets) {
    const periodISO = toISO(row?.period);
    if (!periodISO) {
      droppedCount += 1;
      continue;
    }

    // Traffic normalization
    let rx = null;
    let tx = null;
    const unit = mode === 'server' ? 'Mbps' : 'Bytes'; // Explicit unit per mode

    if (mode === 'server') {
      tx = parseNum(row?.upload_mbps);
      rx = parseNum(row?.download_mbps);
    } else {
      // Frontend mode: stay in Bytes as per NORMALIZATION_RULE "stay in bytes" logic
      // but the rule says "Konversi byte-unit eksplisit" in Stage 0 if needed.
      // However, the standard field says "rx: Number|null".
      // Let's keep the bytesToMbps conversion if we want 'Mbps' as standard unit,
      // or keep it as bytes if unit is 'Bytes'.
      // The rule says: "Mapping: download_mbps/bytes -> rx, upload_mbps/bytes -> tx"
      tx = parseNum(row?.upload_bytes);
      rx = parseNum(row?.download_bytes);
    }

    if (rx === null) invalidFieldCount += 1;
    if (tx === null) invalidFieldCount += 1;
    const total = (Number.isFinite(rx) ? rx : 0) + (Number.isFinite(tx) ? tx : 0);

    // Resource normalization
    let cpuPercent = null;
    if (row?.cpu_percent_standard !== undefined && row?.cpu_percent_standard !== null) {
      cpuPercent = clampPercent(parseNum(row?.cpu_percent_standard));
    } else if (row?.cpu_load !== undefined && row?.cpu_load !== null) {
      cpuPercent = clampPercent(parseNum(row?.cpu_load));
    }
    if (cpuPercent === null) invalidFieldCount += 1;

    const freeMemory = parseNum(row?.free_memory);
    const totalMemory = parseNum(row?.total_memory);
    if (freeMemory === null) invalidFieldCount += 1;
    if (totalMemory === null) invalidFieldCount += 1;

    const memUsage = Number.isFinite(totalMemory) && totalMemory > 0 && Number.isFinite(freeMemory)
      ? clampPercent(((totalMemory - freeMemory) / totalMemory) * 100)
      : null;

    const clientsActive = parseNum(row?.total_active ?? row?.clients_active);

    data.push({
      timestamp: periodISO,
      displayDate: toDisplay(periodISO),
      isGap: !!row?.isGap,
      // traffic
      rx,
      tx,
      total,
      unit,
      // resource
      cpu_percent_standard: cpuPercent,
      free_memory: freeMemory,
      total_memory: totalMemory,
      mem_usage: memUsage,
      clients_active: clientsActive,
    });
    if (row?.isGap) gapCount += 1;
    validCount += 1;
  }

  // Ensure deterministic ordering by timestamp
  data.sort((a, b) => {
    const ta = a.timestamp || '';
    const tb = b.timestamp || '';
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return 0;
  });

  const computedGranularity = (() => {
    if (requestedGranularity && requestedGranularity !== 'auto') return requestedGranularity;
    // Try to infer from dataset
    if (data.length >= 2) {
      const t0 = new Date(data[0].timestamp).getTime();
      const t1 = new Date(data[1].timestamp).getTime();
      const deltaMs = Math.abs(t1 - t0);
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;
      if (deltaMs <= 2 * oneHour) return 'hour';
      if (deltaMs <= 2 * oneDay) return 'day';
      if (deltaMs <= 45 * oneDay) return 'month';
      return 'year';
    }
    // Fallback to range-based rule if dataset too small
    if (startISO && endISO) {
      const durMs = Math.abs(new Date(endISO) - new Date(startISO));
      const days = durMs / (24 * 60 * 60 * 1000);
      if (days <= 2) return 'hour';
      if (days <= 90) return 'day';
      if (days <= 24 * 30) return 'month';
      return 'year';
    }
    return 'day';
  })();

  // Optional gap fill (only when timeLock + explicit range)
  let finalData = data;
  if (timeLock && startISO && endISO) {
    const timeline = buildTimeline(startISO, endISO, computedGranularity);
    const existing = new Map(finalData.map(d => [d.timestamp, d]));
    const filled = [];
    for (const t of timeline) {
      if (existing.has(t)) {
        filled.push(existing.get(t));
      } else {
        filled.push({
          timestamp: t,
          displayDate: toDisplay(t),
          isGap: true,
          rx: 0,
          tx: 0,
          total: 0,
          unit: 'Mbps',
          cpu_percent_standard: null,
          free_memory: null,
          total_memory: null,
          mem_usage: null,
        });
        gapCount += 1;
      }
    }
    finalData = filled;
    // Keep deterministic ordering
    finalData.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  }

  return {
    data: finalData,
    meta: { 
      validCount, 
      droppedCount, 
      gapCount, 
      invalidFieldCount, 
      granularity: computedGranularity, 
      requestedGranularity, 
      timeLock, 
      mode 
    },
  };
};

export const buildTimeline = (startISO, endISO, granularity) => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const slots = [];
  const cursor = new Date(start);
  const step = (g) => {
    switch (g) {
      case 'hour': cursor.setHours(cursor.getHours() + 1); break;
      case 'day': cursor.setDate(cursor.getDate() + 1); break;
      case 'month': cursor.setMonth(cursor.getMonth() + 1); break;
      case 'year': cursor.setFullYear(cursor.getFullYear() + 1); break;
      default: cursor.setDate(cursor.getDate() + 1); break;
    }
  };
  while (cursor <= end) {
    slots.push(cursor.toISOString());
    step(granularity);
  }
  return slots;
};

