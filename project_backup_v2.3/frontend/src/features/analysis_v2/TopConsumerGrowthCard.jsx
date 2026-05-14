import React from 'react';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { bytesToUnit } from '../analysis_utils.jsx';

/**
 * Top Consumer Growth Card.
 */
const TopConsumerGrowthCard = ({ topGrowthUsers, usageUnit, isLoading }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Top Consumer Growth</h3>
        <span className="text-xs text-gray-500">Lonjakan Tertinggi</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
          <div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
          <div className="h-10 bg-gray-50 animate-pulse rounded-lg" />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {topGrowthUsers.length > 0 ? (
            topGrowthUsers.map((u, i) => (
              <li key={i} className="py-2.5 first:pt-0 last:pb-0 animate-in slide-in-from-bottom duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 truncate max-w-[120px]">{u.name}</span>
                    <span className="text-[10px] text-gray-400">Avg {(Number(bytesToUnit(u.currentUsage, usageUnit)) || 0).toFixed(1)} {usageUnit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`flex items-center text-xs font-black ${u.growth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {u.growth >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
                      {(Number(Math.abs(u.growth)) || 0).toFixed(1)}%
                    </div>
                    {u.isHigh && (
                      <div className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase rounded animate-pulse">
                        Alert
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${u.isHigh ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, Math.abs(u.growth))}%` }}
                  />
                </div>
              </li>
            ))
          ) : (
            <div className="py-6 text-center">
              <Zap size={24} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400 font-medium">Data pertumbuhan tidak tersedia</p>
            </div>
          )}
        </ul>
      )}
    </div>
  );
};

export default TopConsumerGrowthCard;
