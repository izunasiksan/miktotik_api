import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { getBoardsV2, getAggregateAll, getTimeDensityV2, getHeavyAnalysisV2 } from '../services/api_v2.js';
import { normalizeBucketsV2 } from '../utils/normalization.js';
import { calculateTrendMetricsV2 } from '../utils/trend.js';
import { calculateHabitMetricsV2 } from '../utils/habits.js';
import { validateAnomaliesV2 } from '../utils/anomalies.js';
import { calculateForecastMetricsV2 } from '../utils/forecast.js';

export const useAnalysisV2Controller = () => {
  const queryClient = useQueryClient();
  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['v2', 'boards'],
    queryFn: getBoardsV2,
    staleTime: 30000,
    retry: 1,
  });
  const pipeline = useMemo(() => ['normalization', 'scope', 'trend', 'correlation', 'habits', 'anomaly', 'capacity', 'insight'], []);

  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const effectiveBoardId = selectedBoardId ?? (boards[0]?.board_id || boards[0]?.id || null);

  const [granularity, setGranularity] = useState('auto');
  const [agg, setAgg] = useState('avg');
  const [timeLock, setTimeLock] = useState(false);
  const [period, setPeriod] = useState('custom');
  const [limit, setLimit] = useState(30);
  const [entityType, setEntityType] = useState('board');
  const [entityName, setEntityName] = useState('');
  const [entityNames, setEntityNames] = useState([]);
  const [combine, setCombine] = useState('total');
  const [ifacePrimaryOnly, setIfacePrimaryOnly] = useState(false);
  const [ifaceActiveOnly, setIfaceActiveOnly] = useState(false);

  const [endTime, setEndTime] = useState(() => new Date().toISOString());
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  });

  const queries = useQueries({
    queries: [
      {
        queryKey: [
          'v2',
          'aggregate-all',
          effectiveBoardId,
          startTime,
          endTime,
          granularity,
          agg,
          entityType,
          entityName,
          JSON.stringify(entityNames || []),
          combine,
          ifacePrimaryOnly ? 1 : 0,
          ifaceActiveOnly ? 1 : 0,
        ],
        enabled: !!effectiveBoardId && !!startTime && !!endTime,
        queryFn: () => getAggregateAll(effectiveBoardId, {
          startTime,
          endTime,
          granularity,
          agg,
          entityType,
          entityNames,
          combine,
          ifacePrimaryOnly,
          ifaceActiveOnly,
        }),
        staleTime: 30000,
        retry: 1,
        keepPreviousData: true,
      },
      {
        queryKey: [
          'v2',
          'time-density',
          effectiveBoardId,
          startTime,
          endTime,
          granularity,
          entityType,
          JSON.stringify(entityNames || []),
        ],
        enabled: !!effectiveBoardId && !!startTime && !!endTime,
        queryFn: () => getTimeDensityV2(effectiveBoardId, {
          startTime,
          endTime,
          granularity,
          entityType,
          entityNames,
        }),
        staleTime: 60000,
        retry: 1,
        keepPreviousData: true,
      },
      {
        queryKey: [
          'v2',
          'heavy-analysis',
          effectiveBoardId,
          startTime,
          endTime,
          granularity,
          entityType,
          JSON.stringify(entityNames || []),
        ],
        enabled: !!effectiveBoardId && !!startTime && !!endTime,
        queryFn: () => getHeavyAnalysisV2(effectiveBoardId, {
          startTime,
          endTime,
          granularity,
          entityType,
          entityNames,
          analysisTypes: ['correlation', 'anomalies', 'forecast']
        }),
        staleTime: 60000,
        retry: 1,
        keepPreviousData: true,
      }
    ]
  });
  const aggQuery = queries[0] || {};
  const densityQuery = queries[1] || {};
  const heavyQuery = queries[2] || {};
  const aggData = aggQuery.data ?? [];
  const isAggLoading = !!aggQuery.isLoading;
  const isAggError = !!aggQuery.isError;

  const isHeavyLoading = !!heavyQuery.isLoading;
  const heavyData = heavyQuery.data || {};

  const { baseBuckets, perEntity } = useMemo(() => {
    if (Array.isArray(aggData)) {
      return { baseBuckets: aggData, perEntity: null };
    }
    if (aggData && typeof aggData === 'object') {
      const total = Array.isArray(aggData.total) ? aggData.total : [];
      const sbe = Array.isArray(aggData.series_by_entity) ? aggData.series_by_entity : null;
      return { baseBuckets: total, perEntity: sbe };
    }
    return { baseBuckets: [], perEntity: null };
  }, [aggData]);

  const normalization = useMemo(() => {
    return normalizeBucketsV2(baseBuckets, { mode: 'server', timeLock, startTime, endTime, granularity });
  }, [baseBuckets, timeLock, startTime, endTime, granularity]);

  const scopedDataset = useMemo(() => {
    // Stage 1: Scope & Filter (Context Lock)
    // At this stage, normalization is already done. 
    // We apply final filtering if any, and lock the dataset.
    // In this implementation, the filtering is mostly done via backend queries (Mode 1: Server),
    // so Stage 1 ensures the data is valid and adheres to the requested scope.
    
    if (!normalization?.data) return { data: [], meta: {} };

    // Context Lock: No further filtering allowed after this.
    return {
      data: [...normalization.data],
      meta: {
        ...normalization.meta,
        scope: {
          boardId: effectiveBoardId,
          entityType,
          entityNames,
          startTime,
          endTime,
          granularity: normalization.meta.granularity,
        },
        contextLocked: true,
      }
    };
  }, [normalization, effectiveBoardId, entityType, entityNames, startTime, endTime]);

  const trendMetrics = useMemo(() => {
    // Stage 2: Trend & Aggregation (Directional)
    // At this stage, re-filtering is strictly prohibited (Context Lock).
    if (!scopedDataset?.data) return null;
    return calculateTrendMetricsV2(scopedDataset);
  }, [scopedDataset]);

  const correlationMetrics = useMemo(() => {
    // Stage 3: Correlation (Heavy Analysis)
    // Pearson correlation r & sample size n dari Backend.
    // DILARANG re-filter; data harus sinkron dengan ScopedDataset.
    if (!heavyData?.correlation) return null;
    return heavyData.correlation;
  }, [heavyData]);

  const habitMetrics = useMemo(() => {
    // Stage 4: Habits & Patterns (Baseline Profile)
    // DILARANG re-filter; data harus sinkron dengan ScopedDataset.
    if (!scopedDataset?.data) return null;
    return calculateHabitMetricsV2(scopedDataset);
  }, [scopedDataset]);

  const anomalyMetrics = useMemo(() => {
    // Stage 5: Anomaly Validation (Event Merging & Severity)
    // Memproses kandidat dari backend menjadi event yang divalidasi.
    if (!heavyData?.anomalies) return { events: [], summary: { total: 0, high: 0, medium: 0, low: 0 } };
    return validateAnomaliesV2(heavyData.anomalies, scopedDataset, habitMetrics);
  }, [heavyData, scopedDataset, habitMetrics]);

  const forecastMetrics = useMemo(() => {
    // Stage 6: Capacity Forecast (TTC & Headroom)
    // DILARANG re-filter; data harus sinkron dengan ScopedDataset.
    if (!heavyData?.forecast) return null;
    return calculateForecastMetricsV2(heavyData.forecast, scopedDataset);
  }, [heavyData, scopedDataset]);

  const timeDensity = densityQuery.data ?? [];

  const reloadAll = () => {
    queryClient.invalidateQueries({ queryKey: ['v2'] });
  };

  const validateFilterParams = (params) => {
    const errors = [];
    const isoDate = (s) => {
      try {
        if (!s) return null;
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      } catch {
        return null;
      }
    };
    const sISO = isoDate(params.startTime || startTime);
    const eISO = isoDate(params.endTime || endTime);
    if (!sISO || !eISO) errors.push('Tanggal tidak valid (ISO-8601).');
    if (sISO && eISO && new Date(sISO) > new Date(eISO)) errors.push('start_date harus ≤ end_date.');
    const allowedGran = ['auto', 'hour', 'day', 'month', 'year'];
    if (params.granularity && !allowedGran.includes(params.granularity)) errors.push('granularity tidak valid.');
    const allowedAgg = ['avg', 'max', 'sum', 'min'];
    if (params.agg && !allowedAgg.includes(params.agg)) errors.push('aggMethod tidak valid.');
    const allowedPeriod = ['custom', 'daily', 'monthly', 'yearly'];
    const p = params.period || period;
    if (p && !allowedPeriod.includes(p)) errors.push('period tidak valid.');
    if (p && p !== 'custom') {
      const lim = Number.isFinite(params.limit) ? params.limit : limit;
      if (!Number.isFinite(lim) || lim <= 0) errors.push('limit harus angka > 0.');
      if (p === 'daily' && lim > 365) errors.push('limit harian terlalu besar.');
      if (p === 'monthly' && lim > 120) errors.push('limit bulanan terlalu besar.');
      if (p === 'yearly' && lim > 20) errors.push('limit tahunan terlalu besar.');
      if (params.granularity && p === 'daily' && !['auto', 'day', 'hour'].includes(params.granularity)) errors.push('granularity tidak konsisten dengan period harian.');
      if (params.granularity && p === 'monthly' && !['auto', 'month'].includes(params.granularity)) errors.push('granularity tidak konsisten dengan period bulanan.');
      if (params.granularity && p === 'yearly' && !['auto', 'year'].includes(params.granularity)) errors.push('granularity tidak konsisten dengan period tahunan.');
    }
    const allowedEntity = ['board', 'cpu', 'interface', 'pppoe', 'hotspot', 'site_group', 'clients'];
    const ent = params.entityType || entityType;
    if (ent && !allowedEntity.includes(ent)) errors.push('entity tidak valid.');
    // entityNames boleh kosong; jika diisi akan dipakai sebagai filter multi-entity
    const allowedCombine = ['total', 'per_entity', 'both'];
    if (params.combine && !allowedCombine.includes(params.combine)) errors.push('combine tidak valid.');
    return { ok: errors.length === 0, errors };
  };

  return {
    boards,
    isLoading,
    pipeline,
    // selection & params
    selectedBoardId,
    setSelectedBoardId,
    effectiveBoardId,
    granularity,
    setGranularity,
    agg,
    setAgg,
    timeLock,
    setTimeLock,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    period,
    setPeriod,
    limit,
    setLimit,
    entityType,
    setEntityType,
    entityName,
    setEntityName,
    entityNames,
    setEntityNames,
    combine,
    setCombine,
    ifacePrimaryOnly,
    setIfacePrimaryOnly,
    ifaceActiveOnly,
    setIfaceActiveOnly,
    validateFilterParams,
    // data
    aggData,
    isAggLoading,
    isAggError,
    normalization,
    scopedDataset,
    trendMetrics,
    correlationMetrics,
    habitMetrics,
    anomalyMetrics,
    forecastMetrics,
    isHeavyLoading,
    reloadAll,
    perEntitySeries: perEntity,
    timeDensity,
  };
};
