import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopInterfacesV2, getTopPPPoEV2, getTopHotspotV2 } from '../services/api_v2.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';

const TopList = ({ title, data, unit, isLoading, isError, emptyText = 'Tidak ada data' }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center h-40">
        <LoadingSpinner size="sm" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-4 h-40">
        <div className="text-rose-600 text-sm">Gagal memuat {title}</div>
      </div>
    );
  }
  const items = Array.isArray(data) ? data : [];
  return (
    <div className={`bg-white rounded-xl border ${isLoading ? 'border-blue-200 animate-pulse' : 'border-gray-200'} overflow-hidden transition-colors`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <div className="text-xs text-gray-500">{unit}</div>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500">{emptyText}</li>
        )}
        {items.map((it, idx) => (
          <li key={it.name || idx} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 text-xs text-gray-500">{idx + 1}</div>
              <div>
                <div className="text-sm font-medium text-gray-800 truncate max-w-[14rem]" title={it.name}>{it.name}</div>
                <div className="text-xs text-gray-500">DL {formatNumber(it.download_value)} • UL {formatNumber(it.upload_value)}</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-900">{formatNumber(it.total_value)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const formatNumber = (val) => {
  if (val == null || Number.isNaN(val)) return '-';
  if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T';
  if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
  return String(Math.round(val));
};

const Stage2TopListsPanel = ({ boardId, startTime, endTime }) => {
  const enabled = !!boardId && !!startTime && !!endTime;
  const params = React.useMemo(() => ({
    days: 30,
    pivot_agg: 'sum',
    start_date: startTime,
    end_date: endTime,
    limit: 5,
  }), [startTime, endTime]);

  const { data: topIfaces = [], isLoading: l1, isError: e1 } = useQuery({
    queryKey: ['v2', 'top', 'interfaces', boardId, startTime, endTime],
    enabled,
    queryFn: () => getTopInterfacesV2(boardId, params),
    staleTime: 30000,
    retry: 1,
  });

  const { data: topPPPoE = [], isLoading: l2, isError: e2 } = useQuery({
    queryKey: ['v2', 'top', 'pppoe', boardId, startTime, endTime],
    enabled,
    queryFn: () => getTopPPPoEV2(boardId, params),
    staleTime: 30000,
    retry: 1,
  });

  const { data: topHotspot = [], isLoading: l3, isError: e3 } = useQuery({
    queryKey: ['v2', 'top', 'hotspot', boardId, startTime, endTime],
    enabled,
    queryFn: () => getTopHotspotV2(boardId, params),
    staleTime: 30000,
    retry: 1,
  });

  const isRefreshing = l1 || l2 || l3;
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRefreshing ? 'transition-opacity' : ''}`}>
      <TopList title="Top Interfaces" unit="Mbps (Total)" data={topIfaces} isLoading={l1} isError={e1} />
      <TopList title="Top PPPoE" unit="Bytes (Total)" data={topPPPoE} isLoading={l2} isError={e2} />
      <TopList title="Top Hotspot" unit="Bytes (Total)" data={topHotspot} isLoading={l3} isError={e3} />
    </div>
  );
};

export default Stage2TopListsPanel;
