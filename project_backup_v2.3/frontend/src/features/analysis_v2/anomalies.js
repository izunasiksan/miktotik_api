/**
 * STAGE 5 — ANOMALY VALIDATION
 * Memvalidasi kandidat anomali dari Backend (Heavy Analysis).
 * Mengacu pada 05 ANOMALY_VALIDATION_RULE.md & 05 ANOMALY_VALIDATION_FLOW_RULE.md
 */

/**
 * Memvalidasi dan menggabungkan kandidat anomali menjadi Event.
 * @param {Array} candidates Kandidat anomali dari backend (heavyData.anomalies).
 * @param {Object} scopedDataset Dataset dari Stage 1 (Context Locked).
 * @param {Object} habitMetrics Profil baseline dari Stage 4.
 * @returns {Object} AnomalyMetrics berisi daftar event dan ringkasan.
 */
export const validateAnomaliesV2 = (candidates = [], scopedDataset = {}, habitMetrics = null) => {
  if (!candidates || candidates.length === 0) {
    return { events: [], summary: { total: 0, high: 0, medium: 0, low: 0 } };
  }

  const data = scopedDataset.data || [];
  const granularity = scopedDataset.meta?.granularity || 'hour';
  const maintenanceWindows = scopedDataset.meta?.maintenanceWindows || [];

  // Create a map for quick gap checking
  const gapMap = new Map();
  data.forEach(row => {
    if (row.isGap) gapMap.set(row.period, true);
  });

  // 1. Grouping Candidates by Metric & Filter Gaps
  const metricGroups = {};
  candidates.forEach(cand => {
    // STEP 2: Candidate Validation - isGap Check
    if (gapMap.has(cand.timestamp)) return; 

    if (!metricGroups[cand.metric]) metricGroups[cand.metric] = [];
    metricGroups[cand.metric].push(cand);
  });

  let allEvents = [];

  // 2. Process each metric group to find events
  Object.keys(metricGroups).forEach(metric => {
    const cands = metricGroups[metric].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // STEP 4: Event Merging (Aggregation)
    // Gabungkan kandidat yang berdekatan (jarak ≤ 1 bucket)
    let currentEvent = null;
    const metricEvents = [];

    cands.forEach(cand => {
      const candTime = new Date(cand.timestamp).getTime();
      
      if (!currentEvent) {
        currentEvent = {
          id: `evt_${metric}_${candTime}`,
          metric,
          points: [cand],
          startTime: cand.timestamp,
          endTime: cand.timestamp,
          peakValue: cand.value,
          peakScore: Math.abs(cand.score),
          status: 'active'
        };
      } else {
        const lastPointTime = new Date(currentEvent.endTime).getTime();
        // Cek jarak bucket (estimasi berdasarkan granularity)
        const bucketMs = getBucketDurationMs(granularity);
        const distance = candTime - lastPointTime;

        if (distance <= bucketMs * 1.5) { // Toleransi 1.5x bucket
          currentEvent.points.push(cand);
          currentEvent.endTime = cand.timestamp;
          if (Math.abs(cand.score) > currentEvent.peakScore) {
            currentEvent.peakScore = Math.abs(cand.score);
            currentEvent.peakValue = cand.value;
          }
        } else {
          metricEvents.push(currentEvent);
          currentEvent = {
            id: `evt_${metric}_${candTime}`,
            metric,
            points: [cand],
            startTime: cand.timestamp,
            endTime: cand.timestamp,
            peakValue: cand.value,
            peakScore: Math.abs(cand.score),
            status: 'active'
          };
        }
      }
    });
    if (currentEvent) metricEvents.push(currentEvent);

    allEvents = [...allEvents, ...metricEvents];
  });

  // 3. STEP 3 & 5 & 6: Validation, Severity Scoring, & Muting
  const validatedEvents = allEvents.map(evt => {
    const durationBuckets = evt.points.length;
    
    // STEP 3: Window & Duration Check
    // Misal: ≥ 2 bucket untuk dianggap anomali (tergantung rule)
    const isOutlierOnly = durationBuckets < 2;

    // STEP 5: Severity Scoring
    // Magnitude (peakScore) + Duration + Cross-Metric (to be implemented)
    let severity = 'LOW';
    if (evt.peakScore >= 5 || durationBuckets >= 5) {
      severity = 'HIGH';
    } else if (evt.peakScore >= 3 || durationBuckets >= 3) {
      severity = 'MEDIUM';
    }

    // STEP 6: Maintenance Check (Muting)
    const isMuted = maintenanceWindows.some(window => {
      const start = new Date(window.start).getTime();
      const end = new Date(window.end).getTime();
      const evtStart = new Date(evt.startTime).getTime();
      return evtStart >= start && evtStart <= end;
    });

    return {
      ...evt,
      severity,
      durationBuckets,
      isOutlier: isOutlierOnly,
      status: isMuted ? 'muted' : 'active',
      evidence: `${evt.metric} deviation score: ${evt.peakScore.toFixed(2)} over ${durationBuckets} buckets`
    };
  });

  // 4. STEP 7: Final Output Generation
  const summary = {
    total: validatedEvents.length,
    high: validatedEvents.filter(e => e.severity === 'HIGH' && e.status !== 'muted').length,
    medium: validatedEvents.filter(e => e.severity === 'MEDIUM' && e.status !== 'muted').length,
    low: validatedEvents.filter(e => e.severity === 'LOW' && e.status !== 'muted').length,
    muted: validatedEvents.filter(e => e.status === 'muted').length
  };

  return {
    events: validatedEvents,
    summary
  };
};

/**
 * Estimasi durasi bucket dalam ms berdasarkan granularity.
 */
const getBucketDurationMs = (granularity) => {
  switch (granularity) {
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case 'hour': return 60 * 60 * 1000;
    case 'day': return 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
};
