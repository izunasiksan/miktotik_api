import { useMemo, useState } from 'react';
import { 
  calculateDataQualityScore, 
  fillGaps,
  analyzeDataUnits,
  METRIC_REGISTRY
} from '../analysis_utils.jsx';

/**
 * Hook khusus untuk Validasi Data & Audit Integritas (Layer DESCRIPTIVE + VALIDATION)
 * Implementasi Weighted Health Scoring & Automatic Unit Mapping
 */
export const useDataAudit = (reportData, config = {}) => {
  const { startDate, endDate, granularity = 'day', normalizationConfig } = config;
  
  // State for manual unit overrides
  const [unitOverrides, setUnitOverrides] = useState({});

  const updateUnitOverride = (key, newUnit) => {
    setUnitOverrides(prev => ({ ...prev, [key]: newUnit }));
  };

  const metricMetadata = useMemo(() => {
    if (!reportData || reportData.length === 0) return {};
    const baseMapping = analyzeDataUnits(reportData);
    
    // Apply overrides and check health
    const finalMapping = { ...baseMapping };
    Object.keys(unitOverrides).forEach(key => {
      if (finalMapping[key]) {
        finalMapping[key] = {
          ...finalMapping[key],
          unit: unitOverrides[key],
          isManual: true
        };
      }
    });
    
    return finalMapping;
  }, [reportData, unitOverrides]);

  const formatTableDate = (r) => {
    const rawDate = r.log_time || r.log_date || r.log_month || r.created_at || r.last_update;
    if (!rawDate) return 'N/A';
    try {
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      return dateObj.toLocaleString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        day: '2-digit', 
        month: 'short' 
      });
    } catch {
      return 'N/A';
    }
  };

  const dataQuality = useMemo(() => {
    if (!reportData || reportData.length === 0) return null;
    
    let missingFields = 0;
    let outOfBounds = 0;
    let negativeValues = 0;
    let totalWeightScore = 0;
    const anomalyRows = [];
    
    const WEIGHTS = {
      MISSING: 1,
      OUT_OF_BOUNDS: 3,
      NEGATIVE: 3
    };

    // Auto-detect fields from data to avoid mis-concept
    const fieldsToAudit = Object.keys(reportData[0]).filter(k => 
      !['log_time', 'log_date', 'displayDate', 'is_gap', 'id', 'created_at'].includes(k)
    );

    reportData.forEach((r, idx) => {
      let rowHasIssue = false;
      const issues = [];

      fieldsToAudit.forEach(field => {
        const val = r[field];
        const meta = METRIC_REGISTRY[field];
        if (!meta) return;

        const isMissing = val === undefined || val === null || val === '';
        
        if (isMissing) {
          missingFields++;
          totalWeightScore += WEIGHTS.MISSING;
          rowHasIssue = true;
          issues.push(`${field} is missing`);
        } else {
          const num = Number(val);
          if (!isNaN(num)) {
            // 1. Negative Check
            if (num < 0) {
              negativeValues++;
              totalWeightScore += WEIGHTS.NEGATIVE;
              rowHasIssue = true;
              issues.push(`${field} is negative (${num})`);
            }
            
            // 2. Range Validation (Dynamic based on unit)
            let maxAllowed = meta.range[1];
            // If it's a percentage, it should be 100 or 1.0 depending on normalization
            if (meta.type === 'usage' && normalizationConfig?.percentage?.unit === 'Decimal') {
              maxAllowed = 1;
            } else if (meta.type === 'usage') {
              maxAllowed = 100;
            }

            if (num > maxAllowed) {
              outOfBounds++;
              totalWeightScore += WEIGHTS.OUT_OF_BOUNDS;
              rowHasIssue = true;
              issues.push(`${field} out of bounds (${num} > ${maxAllowed})`);
            }
          }
        }
      });

      if (rowHasIssue) {
        anomalyRows.push({
          index: idx,
          date: r.displayDate || r.log_time || 'Unknown',
          issues: issues.join(', '),
          severity: issues.some(i => i.includes('out of bounds') || i.includes('negative')) ? 'HIGH' : 'MEDIUM'
        });
      }
    });
    
    // Max weight: points * fields * max weight
    const maxWeight = reportData.length * fieldsToAudit.length * 3;
    const healthScore = Math.max(0, 100 - (totalWeightScore / maxWeight * 100));
    
    return {
      missingFields,
      outOfBounds,
      negativeValues,
      anomalyRows,
      healthScore: Math.round(healthScore),
      status: healthScore > 95 ? 'Excellent' : healthScore > 80 ? 'Good' : 'Poor',
      color: healthScore > 95 ? 'text-emerald-500' : healthScore > 80 ? 'text-amber-500' : 'text-rose-500'
    };
  }, [reportData, normalizationConfig]);

  const integrityAudit = useMemo(() => {
    if (!reportData || reportData.length < 2) return null;
    
    const dates = reportData.map(r => {
      const val = r.log_time || r.log_date || r.log_month || r.created_at;
      const t = val ? new Date(val).getTime() : NaN;
      return t;
    }).filter(d => !isNaN(d)).sort((a, b) => a - b);
    
    if (dates.length < 2) return { 
      totalSamples: reportData.length, 
      timeGaps: 0, 
      isConsistent: true,
      periodRange: { start: 'N/A', end: 'N/A' }
    };

    let totalGaps = 0;
    
    // 1. Deteksi Dynamic Interval
    const diffs = [];
    for (let i = 1; i < dates.length; i++) {
      diffs.push(dates[i] - dates[i-1]);
    }
    const sortedDiffs = [...diffs].sort((a, b) => a - b);
    const medianInterval = sortedDiffs[Math.floor(sortedDiffs.length / 2)];
    const gapThreshold = medianInterval * 1.5;

    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i] - dates[i-1];
      if (diff > gapThreshold) {
        totalGaps++;
      }
    }
    
    // Calculate expected points if startDate/endDate provided
    let expectedPoints = reportData.length;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end - start;
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && diffMs > 0) {
        if (granularity === 'day') {
          expectedPoints = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        } else if (granularity === 'hour') {
          expectedPoints = Math.ceil(diffMs / (1000 * 60 * 60)) + 1;
        }
      }
    }

    const qualityScore = calculateDataQualityScore(reportData, expectedPoints);
    
    return {
      totalSamples: reportData.length,
      timeGaps: totalGaps,
      isConsistent: totalGaps === 0,
      medianIntervalMinutes: Math.round(medianInterval / 60000),
      qualityScore,
      periodRange: {
        start: new Date(dates[0]).toLocaleDateString('id-ID'),
        end: new Date(dates[dates.length - 1]).toLocaleDateString('id-ID')
      }
    };
  }, [reportData, startDate, endDate, granularity]);

  const normalizedData = useMemo(() => {
    if (!reportData || !startDate || !endDate) return reportData;
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return reportData;
      const diffMs = e - s;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
      
      if (granularity === 'hour' && diffHours > 7 * 24) return reportData;
      if (granularity === 'day' && diffDays > 31) return reportData;
      if (granularity === 'month' && diffMonths > 12) return reportData;
      
      return fillGaps(reportData, startDate, endDate, granularity);
    } catch {
      return reportData;
    }
  }, [reportData, startDate, endDate, granularity]);

  return {
    dataQuality,
    integrityAudit,
    normalizedData,
    formatTableDate,
    metricMetadata,
    updateUnitOverride
  };
};
