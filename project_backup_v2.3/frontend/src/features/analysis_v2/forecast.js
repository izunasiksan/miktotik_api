/**
 * STAGE 6: CAPACITY FORECAST (FRONTEND DERIVATION)
 * Berdasarkan 06 CAPACITY_FORECAST_FLOW_RULE.md
 */

/**
 * Menghitung metrik forecast berdasarkan output backend dan konfigurasi kapasitas.
 * 
 * @param {Object} heavyForecast - Output dari Backend (projected_values, bands)
 * @param {Object} scopedDataset - Dataset Stage 1 untuk konteks metadata
 * @param {Object} capacityConfig - Konfigurasi kapasitas { value, unit, label }
 * @returns {Object} ForecastMetrics
 */
export const calculateForecastMetricsV2 = (heavyForecast, scopedDataset, capacityConfig = null) => {
  if (!heavyForecast || !Array.isArray(heavyForecast.projections)) {
    return {
      projections: [],
      ttc: { value: null, label: 'No Data', severity: 'STABLE' },
      recommendation: { action: 'Wait', message: 'Menunggu data proyeksi dari backend.' }
    };
  }

  // STEP 2: Capacity Identification
  // Gunakan config override atau metadata dari scopedDataset
  const capacityValue = capacityConfig?.value ?? scopedDataset?.meta?.capacity ?? 100; // Default 100 if unknown
  const horizon = heavyForecast.meta?.horizon_days || 7;

  // STEP 4 & 5: Headroom & TTC Derivation
  let ttcTimestamp = null;
  const projections = heavyForecast.projections.map(p => {
    const val = p.projected_value || 0;
    const upper = p.upper_bound || val;
    const lower = p.lower_bound || val;

    // Utilization = projected_value / capacity
    const utilization = capacityValue > 0 ? (val / capacityValue) : 0;
    
    // Headroom (Conservative) = capacity - upper_bound
    const headroom = capacityValue - upper;

    // STEP 5: Find first timestamp where upper_bound >= capacity
    if (!ttcTimestamp && upper >= capacityValue) {
      ttcTimestamp = p.timestamp;
    }

    return {
      timestamp: p.timestamp,
      value: val,
      upper,
      lower,
      utilization,
      headroom
    };
  });

  // STEP 5 (cont): Calculate TTC relative to now
  const now = new Date();
  let ttcValue = null;
  let ttcLabel = '> Horizon';
  let severity = 'STABLE';

  if (ttcTimestamp) {
    const targetDate = new Date(ttcTimestamp);
    const diffMs = targetDate - now;
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    
    ttcValue = diffDays;
    ttcLabel = `${diffDays} Hari`;
    
    // STEP 6: Recommendation Logic
    if (diffDays < 7) {
      severity = 'CRITICAL';
    } else if (diffDays < 30) {
      severity = 'WARNING';
    }
  }

  const recommendation = getRecommendation(severity, ttcLabel);

  // STEP 7: Final Output Generation
  return {
    projections,
    ttc: {
      value: ttcValue,
      label: ttcLabel,
      severity
    },
    recommendation
  };
};

/**
 * Helper to generate recommendation based on severity.
 */
function getRecommendation(severity, ttcLabel) {
  switch (severity) {
    case 'CRITICAL':
      return {
        action: 'Upgrade / QoS Kritis',
        message: `Beban diprediksi melampaui kapasitas dalam ${ttcLabel}. Segera lakukan upgrade bandwidth atau optimasi QoS.`
      };
    case 'WARNING':
      return {
        action: 'Evaluasi Ekspansi',
        message: `Beban mendekati kapasitas dalam ${ttcLabel}. Rencanakan ekspansi atau audit penggunaan traffic.`
      };
    default:
      return {
        action: 'Aman',
        message: 'Kapasitas sistem saat ini masih mencukupi untuk proyeksi beban mendatang.'
      };
  }
}
