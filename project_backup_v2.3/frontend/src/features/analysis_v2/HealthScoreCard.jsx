import React from 'react';
import { ShieldCheck, AlertCircle, Activity } from 'lucide-react';

const HealthScoreCard = ({ score: healthScore, isLoading }) => {
  if (!isLoading && !healthScore) return null;

  return (
    <div className={`rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between ${healthScore?.bgColor || 'bg-white'}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Health Score</div>
          {isLoading ? (
            <Activity className="h-4 w-4 text-gray-200 animate-pulse" />
          ) : (
            healthScore.icon
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-100 animate-pulse rounded-lg w-1/2" />
            <div className="h-4 bg-gray-50 animate-pulse rounded w-1/3" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-black ${healthScore.color}`}>{healthScore.score}</div>
              <div className="text-[10px] font-bold text-gray-400">/ 100</div>
            </div>
            <div className={`text-xs font-bold mt-1 ${healthScore.color}`}>{healthScore.status}</div>
          </>
        )}
      </div>

      <div className="mt-4 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full bg-gray-300 animate-pulse" />
        ) : (
          <div 
            className={`h-full transition-all duration-1000 ${
              healthScore.score > 80 ? 'bg-emerald-500' : 
              healthScore.score > 60 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${healthScore.score}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default HealthScoreCard;
