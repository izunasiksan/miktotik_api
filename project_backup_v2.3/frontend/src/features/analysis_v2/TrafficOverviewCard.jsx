import React from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { downloadElementAsImage } from '../utils/exportUtils.js';

const TrafficOverviewCard = ({ id, data, usageUnit, isCompact, cardPadding, scopeLabel, granularityLabel, isLoading }) => {
  const chartId = id || 'traffic-overview-chart';
  
  return (
    <div id={chartId} className={`bg-white ${cardPadding} rounded-2xl shadow-sm border border-gray-100 h-full relative group`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            Traffic Overview ({usageUnit})
          </h3>
          {isLoading ? (
            <div className="h-3 bg-gray-50 animate-pulse rounded w-32 mt-1" />
          ) : (
            (scopeLabel || granularityLabel) && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {scopeLabel && `Scope: ${scopeLabel}`}
                {scopeLabel && granularityLabel && ' • '}
                {granularityLabel && `Granularitas: ${granularityLabel}`}
              </p>
            )
          )}
        </div>
        {!isLoading && (
          <button 
            onClick={() => downloadElementAsImage(chartId, `traffic-overview-${new Date().getTime()}.png`)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Download as Image"
          >
            <Download size={18} />
          </button>
        )}
      </div>
      <div className="w-full" style={{ height: isCompact ? '220px' : '280px' }}>
        {isLoading ? (
          <div className="w-full h-full bg-gray-50 animate-pulse rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                }}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Area 
                type="monotone" 
                dataKey="dl" 
                name={`Download (${usageUnit})`} 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorDl)" 
              />
              <Area 
                type="monotone" 
                dataKey="ul" 
                name={`Upload (${usageUnit})`} 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorUl)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TrafficOverviewCard;
