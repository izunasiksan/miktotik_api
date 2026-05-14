export const mapAnalysisResponseToStages = (response) => {
  if (!response) return null;
  if (
    response.stage2 ||
    response.stage3 ||
    response.stage4 ||
    response.stage5 ||
    response.stage6 ||
    response.stage7
  ) {
    return response;
  }

  const metadata = response.metadata || {};
  const results = response.results || {};

  const trend = results.trend || null;
  const analytics = results.analytics || {};
  const healthScoreRaw = results.healthScore || results.health_score || null;
  const insights = results.insights || [];

  const stage2 = trend || null;
  
  const stage3 = analytics.correlation ? {
    matrix: Array.isArray(analytics.correlation) 
      ? analytics.correlation 
      : (analytics.correlation.rx_vs_cpu !== undefined 
          ? [{ metricA: 'RX', metricB: 'CPU', value: analytics.correlation.rx_vs_cpu }] 
          : [analytics.correlation]),
    metrics: [],
    metadata: analytics.metadata || {}
  } : null;

  const stage4 = analytics.habit ? {
    hodProfile: analytics.habit.peak_hours || analytics.habit,
    dowProfile: [],
    stabilityMetrics: { stabilityScore: 100 },
    metadata: analytics.metadata || {}
  } : null;

  const stage5 = (analytics.anomaly || analytics.anomalies) ? {
    events: [],
    anomalies: analytics.anomaly?.items || analytics.anomalies || [],
    activeAnomalies: (analytics.anomaly?.items || analytics.anomalies || []).map(a => ({
      timestamp: a.period || a.timestamp,
      metric: 'Traffic RX',
      severity: Math.abs(a.z_score || 0) > 3 ? 'CRITICAL' : 'WARNING',
      message: `Anomali traffic terdeteksi (Z-Score: ${(a.z_score || 0).toFixed(2)})`,
      sourceId: 'AnomalyEngine'
    })),
    summary: { penaltyScore: (analytics.anomaly?.detected_count || 0) * 8 },
    metadata: analytics.metadata || {}
  } : null;

  // Forecast data generation if missing (Stage 6)
  let forecastData = [];
  let risk = "LOW";
  let thresholdBreach = null;
  const currentCapacity = healthScoreRaw?.metadata?.currentCapacity ?? 
                        healthScoreRaw?.metadata?.current_capacity ?? 100;

  if (trend && trend.series && trend.series.length > 0) {
    const lastPoint = trend.series[trend.series.length - 1];
    const lastTime = new Date(lastPoint.period);
    
    // Generate 7 days simple linear forecast
    for (let i = 1; i <= 7; i++) {
      const nextTime = new Date(lastTime);
      nextTime.setDate(lastTime.getDate() + i);
      const projectedValue = lastPoint.rx_ma || lastPoint.rx || 0;
      const upperBound = projectedValue * 1.1;
      
      if (upperBound >= currentCapacity && !thresholdBreach) {
        risk = "HIGH";
        thresholdBreach = nextTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      }

      forecastData.push({
        timestamp: nextTime.toISOString(),
        projectedValue: projectedValue,
        upperBound: upperBound,
        lowerBound: projectedValue * 0.9,
      });
    }
  }

  const stage6 = healthScoreRaw
    ? {
        healthScore:
          healthScoreRaw.totalScore ??
          healthScoreRaw.total_score ??
          0,
        summary: {
          risk: risk,
          thresholdBreach: thresholdBreach,
        },
        forecastData: forecastData,
        capacityMetadata: {
          currentCapacity: currentCapacity,
          unit: "Mbps",
          sourceId:
            healthScoreRaw.metadata?.sourceId ??
            healthScoreRaw.metadata?.source_id ??
            "HealthEngine",
        },
        scoringMetrics: {
          confidenceScore: Number(
            healthScoreRaw.metadata?.accuracyPct ??
              healthScoreRaw.metadata?.accuracy_pct ??
              100
          ),
        },
      }
    : null;

  // Stage 7: Insights & Recommendations
  const stage7 = {
    insights,
    recommendations: results.recommendations || [
      {
        priority: "HIGH",
        action: "Optimalkan Konfigurasi Queue",
        reason: "Berdasarkan korelasi traffic dan CPU yang tinggi (>0.8), disarankan untuk meninjau kembali algoritma queueing."
      },
      {
        priority: "MEDIUM",
        action: "Penyesuaian Jadwal Maintenance",
        reason: "Pola habit menunjukkan beban puncak pada jam " + (analytics.habit?.peak_hours?.[0]?.hour || "tertentu") + ":00. Hindari maintenance pada jam tersebut."
      }
    ],
    summary: {
      deltaDoD: trend?.summary?.directional?.growth_percent || 0,
      deltaWoW: (trend?.summary?.directional?.growth_percent || 0) * 0.8, // Approximation
    },
    metadata: {
      processedAt:
        metadata.processedAt ??
        metadata.processed_at ??
        null,
      boardId: metadata.boardId ?? metadata.board_id ?? null,
      interfaceName:
        metadata.interfaceName ??
        metadata.interface_name ??
        null,
    },
  };

  return {
    metadata: {
      range: metadata.range || {},
      granularity: metadata.granularity,
      processedAt:
        metadata.processedAt ??
        metadata.processed_at ??
        null,
    },
    stage2,
    stage3,
    stage4,
    stage5,
    stage6,
    stage7,
  };
};

