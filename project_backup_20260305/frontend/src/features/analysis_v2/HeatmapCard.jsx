import React from 'react';
import { bytesToUnit } from '../analysis_utils.jsx';

/**
 * Heatmap Card for daily traffic intensity.
 */
const HeatmapCard = ({ totals, usageUnit, isLoading }) => {
  const values = React.useMemo(() => (totals || []).slice(-14), [totals]);

  const cls = (v, q) => {
    if (v <= q[0]) return 'bg-blue-50';
    if (v <= q[1]) return 'bg-blue-100';
    if (v <= q[2]) return 'bg-blue-200';
    if (v <= q[3]) return 'bg-blue-300';
    return 'bg-blue-400';
  };

  const quantiles = React.useMemo(() => {
    if (!values.length) return [0, 0, 0, 0];
    const sorted = [...values].sort((a, b) => a - b);
    return [0.2, 0.4, 0.6, 0.8].map(p => sorted[Math.floor(p * (sorted.length - 1))] || 0);
  }, [values]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Heatmap Harian (14 hari)</h3>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-50 animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 animate-in zoom-in duration-500">
          {values.length ? values.map((v, i) => (
            <div key={i} className={`h-8 rounded-lg shadow-sm ${cls(v, quantiles)} hover:ring-2 hover:ring-blue-500 transition-all cursor-help`} title={`Traffic: ${(Number(bytesToUnit(v, usageUnit)) || 0).toFixed(2)} ${usageUnit}`} />
          )) : Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded-lg" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[10px] text-gray-400 font-bold uppercase">Rendah</span>
        <div className="flex gap-1">
          <span className="inline-block w-4 h-3 rounded bg-blue-50" />
          <span className="inline-block w-4 h-3 rounded bg-blue-100" />
          <span className="inline-block w-4 h-3 rounded bg-blue-200" />
          <span className="inline-block w-4 h-3 rounded bg-blue-300" />
          <span className="inline-block w-4 h-3 rounded bg-blue-400" />
        </div>
        <span className="text-[10px] text-gray-400 font-bold uppercase">Tinggi</span>
      </div>
    </div>
  );
};

export default HeatmapCard;
