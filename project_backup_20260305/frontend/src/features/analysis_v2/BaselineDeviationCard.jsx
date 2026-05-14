import React from 'react';
import { safeMedian, avg, std } from '../analysis_utils.jsx';

/**
 * Baseline Deviation and Volatility Card.
 */
const BaselineDeviationCard = ({ totals, isLoading }) => {
  const stats = React.useMemo(() => {
    if (!totals || !totals.length) return null;
    const baseT = safeMedian(totals);
    const latestT = totals[totals.length - 1];
    const pctT = baseT > 0 ? ((latestT - baseT) / baseT) * 100 : 0;
    const mu = avg(totals);
    const sd = std(totals);
    const cv = mu > 0 ? (sd / mu) : 0;
    const cvLabel = cv < 0.3 ? 'Stabil' : cv < 0.6 ? 'Moderat' : 'Volatil';
    
    return {
      traffic: { val: (pctT >= 0 ? '+' : '') + (Number(pctT) || 0).toFixed(1) + '%', alert: Math.abs(pctT) > 50 },
      volatility: { val: cvLabel, sub: `CV: ${(Number(cv) || 0).toFixed(2)}`, alert: cv >= 0.6 }
    };
  }, [totals]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Baseline Deviasi</h3>
      </div>
      {isLoading || !stats ? (
        <div className="space-y-2">
          <div className="h-10 bg-gray-50 animate-pulse rounded-xl" />
          <div className="h-10 bg-gray-50 animate-pulse rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in zoom-in duration-500">
          <div className={`p-4 rounded-xl border ${stats.traffic.alert ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-black mb-1">Traffic vs Median</div>
            <div className={`text-2xl font-black ${stats.traffic.alert ? 'text-rose-700' : 'text-gray-900'}`}>{stats.traffic.val}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Deviasi Sesaat</div>
          </div>
          <div className={`p-4 rounded-xl border ${stats.volatility.alert ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-black mb-1">Volatilitas</div>
            <div className={`text-2xl font-black ${stats.volatility.alert ? 'text-rose-700' : 'text-gray-900'}`}>{stats.volatility.val}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{stats.volatility.sub}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaselineDeviationCard;
