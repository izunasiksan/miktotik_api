/**
 * TREND_AGGREGATION_RULE V2 Implementation
 * O(n) Complexity, Forward-only, Immutable
 */

export const calculateTrendMetricsV2 = (scopedDataset) => {
  const { data = [], meta = {} } = scopedDataset;
  if (!data.length) return null;

  // 1. Slope & Delta (First vs Last valid data points)
  const first = data.find(d => !d.isGap);
  const last = [...data].reverse().find(d => !d.isGap);

  const calculateSlope = (fVal, lVal) => {
    if (fVal === null || lVal === null) return { delta: 0, growth: 0 };
    const delta = lVal - fVal;
    const growth = fVal !== 0 ? (delta / Math.abs(fVal)) * 100 : (lVal > 0 ? 100 : 0);
    return { delta, growth };
  };

  const trafficTrend = {
    rx: calculateSlope(first?.rx, last?.rx),
    tx: calculateSlope(first?.tx, last?.tx),
    total: calculateSlope(first?.total, last?.total),
  };

  const resourceTrend = {
    cpu: calculateSlope(first?.cpu_percent_standard, last?.cpu_percent_standard),
    mem: calculateSlope(first?.mem_usage, last?.mem_usage),
  };

  // 2. Extreme Points (Peak & Trough) - O(n) single pass
  let peakRx = { value: -Infinity, timestamp: null };
  let peakTx = { value: -Infinity, timestamp: null };
  let peakCpu = { value: -Infinity, timestamp: null };
  let troughRx = { value: Infinity, timestamp: null };

  data.forEach(row => {
    if (row.isGap) return;

    if (row.rx !== null) {
      if (row.rx > peakRx.value) { peakRx = { value: row.rx, timestamp: row.timestamp }; }
      if (row.rx < troughRx.value) { troughRx = { value: row.rx, timestamp: row.timestamp }; }
    }
    if (row.tx !== null && row.tx > peakTx.value) {
      peakTx = { value: row.tx, timestamp: row.timestamp };
    }
    if (row.cpu_percent_standard !== null && row.cpu_percent_standard > peakCpu.value) {
      peakCpu = { value: row.cpu_percent_standard, timestamp: row.timestamp };
    }
  });

  // 3. Volatility (Standard Deviation) - O(n)
  const calculateVolatility = (key) => {
    const values = data.filter(d => !d.isGap && d[key] !== null).map(d => d[key]);
    if (values.length < 2) return { stdDev: 0, status: 'Stable' };
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Simple status based on coefficient of variation or just stdDev
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 0;
    const status = cv > 0.5 ? 'Volatile' : 'Stable';
    
    return { stdDev, cv, status };
  };

  return {
    traffic: {
      slope: trafficTrend,
      peaks: { rx: peakRx, tx: peakTx },
      troughs: { rx: troughRx },
      volatility: { rx: calculateVolatility('rx'), tx: calculateVolatility('tx') }
    },
    resource: {
      slope: resourceTrend,
      peaks: { cpu: peakCpu },
      volatility: { cpu: calculateVolatility('cpu_percent_standard') }
    },
    meta: {
      timestamp: new Date().toISOString(),
      scopedId: meta.scope?.boardId || 'unknown',
      contextLocked: meta.contextLocked
    }
  };
};
