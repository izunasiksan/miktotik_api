import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Line } from 'recharts';
import { bytesToUnit, safeMedian, toMbps, formatBytesAuto } from '../analysis_utils.jsx';
import { median } from 'simple-statistics';

const TrafficKpiCard = ({ title, value, delta, totals, usageUnit, isLoading }) => {
  const displayValue = React.useMemo(() => {
    if (isLoading) return '...';
    if (usageUnit === 'Mbps') return `${toMbps(value || 0).toFixed(2)} Mbps`;
    if (usageUnit === 'Auto') return formatBytesAuto(value || 0);
    return `${bytesToUnit(value || 0, usageUnit).toFixed(2)} ${usageUnit}`;
  }, [value, usageUnit, isLoading]);
  
  const chartUnit = usageUnit === 'Auto' ? 'GB' : usageUnit;
  
  const pctChange = React.useMemo(() => {
    if (isLoading || !totals || !totals.length) return null;
    const safeVals = totals.filter(n => typeof n === 'number' && !Number.isNaN(n));
    const base = safeVals.length ? median(safeVals) : 0;
    if (!base || base <= 0) return null;
    const latest = totals[totals.length - 1];
    return ((latest - base) / base) * 100;
  }, [totals, isLoading]);

  const chartData = React.useMemo(() => {
    if (isLoading || !totals) return [];
    return totals.map((v, i) => ({ 
      i, 
      y: usageUnit === 'Mbps' ? toMbps(v) : bytesToUnit(v, chartUnit) 
    }));
  }, [totals, usageUnit, chartUnit, isLoading]);

  const baselineData = React.useMemo(() => {
    if (isLoading || !totals) return [];
    const base = safeMedian(totals);
    const b = usageUnit === 'Mbps' ? toMbps(base || 0) : bytesToUnit(base || 0, chartUnit);
    return totals.map((_, i) => ({ i, y: b }));
  }, [totals, usageUnit, chartUnit, isLoading]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">{title} ({usageUnit === 'Auto' ? chartUnit : usageUnit})</div>
        {isLoading ? (
          <div className="h-8 bg-gray-100 animate-pulse rounded-lg w-2/3 mb-2" />
        ) : (
          <div className="text-2xl font-bold text-gray-900">{displayValue}</div>
        )}
        
        {isLoading ? (
          <div className="h-4 bg-gray-50 animate-pulse rounded w-1/2 mt-1" />
        ) : (
          <>
            {delta != null && (
              <div className={`text-xs mt-1 ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {delta >= 0 ? '▲' : '▼'} {(Number(Math.abs(delta)) || 0).toFixed(1)}% vs prev
              </div>
            )}
            
            {pctChange != null && (
              <div className={`text-xs mt-1 ${pctChange >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                Δ baseline {pctChange >= 0 ? '+' : '-'}{(Number(Math.abs(pctChange)) || 0).toFixed(1)}%
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 h-16 -mx-2 relative overflow-hidden" style={{ minHeight: '64px' }}>
        {isLoading ? (
          <div className="absolute inset-0 bg-gray-50 animate-pulse rounded-lg mx-2" />
        ) : (
          totals && totals.length > 0 && (
            <div className="absolute inset-0 w-full h-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="y" stroke="#60a5fa" fill="#dbeafe" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="y" data={baselineData} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TrafficKpiCard;
