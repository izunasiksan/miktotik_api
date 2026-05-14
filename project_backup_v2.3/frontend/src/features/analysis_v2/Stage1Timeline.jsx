import React from 'react';
import { buildTimeline } from '../utils/normalization.js';

const fmt = (iso) => {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return '';
  }
};

const Stage1Timeline = ({ startTime, endTime, granularity = 'auto', onSelectRange, densities = [], highContrast = false, cbFriendly = false }) => {
  const ticks = React.useMemo(() => {
    if (!startTime || !endTime) return [];
    const g = ['hour', 'day', 'month', 'year'].includes(granularity) ? granularity : 'day';
    return buildTimeline(startTime, endTime, g);
  }, [startTime, endTime, granularity]);

  const [hoverIdx, setHoverIdx] = React.useState(-1);
  const densMap = React.useMemo(() => {
    const m = new Map();
    if (Array.isArray(densities)) {
      densities.forEach((d) => {
        try {
          const iso = new Date(d.period).toISOString();
          m.set(iso, Number(d.count || 0));
        } catch {
          /* noop */
        }
      });
    }
    return m;
  }, [densities]);
  const perTickCounts = React.useMemo(() => ticks.map(t => densMap.get(t) || 0), [ticks, densMap]);
  const [minC, maxC] = React.useMemo(() => {
    if (perTickCounts.length === 0) return [0, 0];
    let mn = Number.POSITIVE_INFINITY;
    let mx = 0;
    for (const c of perTickCounts) {
      if (c < mn) mn = c;
      if (c > mx) mx = c;
    }
    if (!Number.isFinite(mn)) mn = 0;
    return [mn, mx];
  }, [perTickCounts]);
  const totalRows = React.useMemo(() => perTickCounts.reduce((a, b) => a + b, 0), [perTickCounts]);
  const gView = React.useMemo(() => (['hour', 'day', 'month', 'year'].includes(granularity) ? granularity : 'day'), [granularity]);
  const colorFor = (c) => {
    if (maxC <= minC) return highContrast ? 'bg-indigo-600' : 'bg-blue-200';
    const ratio = (c - minC) / (maxC - minC);
    if (highContrast) {
      if (ratio < 0.2) return 'bg-indigo-200';
      if (ratio < 0.4) return 'bg-indigo-400';
      if (ratio < 0.6) return 'bg-indigo-600';
      if (ratio < 0.8) return 'bg-indigo-800';
      return 'bg-black';
    }
    if (ratio < 0.2) return 'bg-blue-100';
    if (ratio < 0.4) return 'bg-blue-300';
    if (ratio < 0.6) return 'bg-blue-400';
    if (ratio < 0.8) return 'bg-blue-500';
    return 'bg-blue-700';
  };

  const patternStyle = (c) => {
    if (!cbFriendly) return undefined;
    if (maxC <= minC) return undefined;
    const ratio = (c - minC) / (maxC - minC);
    if (ratio >= 0.6) {
      return {
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 2px, transparent 2px, transparent 4px)'
      };
    }
    return undefined;
  };

  const handleClick = (idx) => {
    if (!Array.isArray(ticks) || ticks.length === 0) return;
    const s = ticks[idx];
    const e = ticks[Math.min(idx + 1, ticks.length - 1)];
    if (onSelectRange) onSelectRange(s, e);
  };

  if (!ticks || ticks.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs text-gray-500">
        Timeline tidak tersedia. Set periode terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="text-xs text-gray-600 mb-2">
        Timeline: {fmt(startTime)} → {fmt(endTime)} • {ticks.length} slot • {gView} • {totalRows} rows
      </div>
      <div className="flex items-stretch gap-1" role="listbox" aria-label="Timeline slots" aria-activedescendant={hoverIdx >= 0 ? `tl-opt-${hoverIdx}` : undefined}>
        {ticks.map((t, idx) => (
          <button
            key={t}
            id={`tl-opt-${idx}`}
            role="option"
            aria-selected={hoverIdx === idx}
            title={`${fmt(t)} • ${perTickCounts[idx]} rows`}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(-1)}
            onClick={() => handleClick(idx)}
            className={`flex-1 h-3 rounded transition-colors ${hoverIdx === idx ? (highContrast ? 'bg-black' : 'bg-blue-600') : colorFor(perTickCounts[idx])} hover:${highContrast ? 'bg-indigo-900' : 'bg-blue-800'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${highContrast ? 'focus-visible:ring-indigo-400' : 'focus-visible:ring-blue-300'}`}
            style={patternStyle(perTickCounts[idx])}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] text-gray-700">Klik slot untuk memilih sub-range.</div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-700">Low</span>
          <div className={`w-3 h-3 rounded ${highContrast ? 'bg-indigo-200' : 'bg-blue-100'}`} />
          <div className={`w-3 h-3 rounded ${highContrast ? 'bg-indigo-400' : 'bg-blue-300'}`} />
          <div className={`w-3 h-3 rounded ${highContrast ? 'bg-indigo-600' : 'bg-blue-400'}`} />
          <div className={`w-3 h-3 rounded ${highContrast ? 'bg-indigo-800' : 'bg-blue-500'}`} />
          <div className={`w-3 h-3 rounded ${highContrast ? 'bg-black' : 'bg-blue-700'}`} style={cbFriendly ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 2px, transparent 2px, transparent 4px)' } : undefined} />
          <span className="text-[11px] text-gray-700">High</span>
        </div>
      </div>
      <div className="mt-1 text-[11px] text-gray-700" aria-live="polite">
        {hoverIdx >= 0 ? `Detail: ${fmt(ticks[hoverIdx])} • ${perTickCounts[hoverIdx]} rows` : 'Arahkan kursor ke slot untuk melihat jumlah baris.'}
      </div>
    </div>
  );
};

export default Stage1Timeline;
