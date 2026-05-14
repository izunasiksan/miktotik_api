import React from 'react';
import { Zap } from 'lucide-react';
import { bytesToUnit } from '../analysis_utils.jsx';

const TodayTrafficCard = ({ todayTraffic, usageUnit, isLoading }) => {
  if (!isLoading && !todayTraffic) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trafik Hari Ini</div>
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
        
        {isLoading ? (
          <div className="h-8 bg-gray-100 animate-pulse rounded-lg w-3/4 mb-3" />
        ) : (
          <div className="text-2xl font-bold text-gray-900">
            {(Number(bytesToUnit((todayTraffic?.rx || 0) + (todayTraffic?.tx || 0), usageUnit)) || 0).toFixed(2)}
            <span className="text-xs ml-1 font-medium text-gray-500">{usageUnit}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 font-medium uppercase">Download</span>
          {isLoading ? (
            <div className="h-3 bg-blue-50 animate-pulse rounded w-16" />
          ) : (
            <span className="text-xs text-blue-600 font-bold">
              {(Number(bytesToUnit(todayTraffic?.rx || 0, usageUnit)) || 0).toFixed(1)} {usageUnit}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 font-medium uppercase">Upload</span>
          {isLoading ? (
            <div className="h-3 bg-emerald-50 animate-pulse rounded w-16" />
          ) : (
            <span className="text-xs text-emerald-600 font-bold">
              {(Number(bytesToUnit(todayTraffic?.tx || 0, usageUnit)) || 0).toFixed(1)} {usageUnit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayTrafficCard;
