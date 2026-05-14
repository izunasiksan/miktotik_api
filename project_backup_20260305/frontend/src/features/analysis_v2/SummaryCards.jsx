import React from 'react';
import { BarChart3, Database } from 'lucide-react';

const SummaryCards = ({ resourceUsageStats, topInterfacesFixed, aggMethod = 'AVG' }) => {
  const labelMap = {
    AVG: 'Avg',
    MAX: 'Max',
    MIN: 'Min',
    SUM: 'Sum'
  };
  const aggLabel = labelMap[String(aggMethod || 'AVG').toUpperCase()] || 'Avg';
  return (
    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
          <BarChart3 size={20} />
        </div>
        <div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{aggLabel} CPU Usage</div>
          <div className="text-xl font-black text-gray-800">{resourceUsageStats.cpu}%</div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
          <Database size={20} />
        </div>
        <div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{aggLabel} Mem Usage</div>
          <div className="text-xl font-black text-gray-800">{resourceUsageStats.mem}%</div>
        </div>
      </div>
      <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Top Interfaces by Speed (Mbps)</div>
        <div className="flex flex-wrap gap-2">
          {topInterfacesFixed && topInterfacesFixed.length > 0 ? topInterfacesFixed.map((i, idx) => (
            <div key={idx} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-700">{i.name}</span>
              <div className="flex items-center gap-1 text-[10px] font-black">
                <span className="text-blue-500">{i.rxMbps}↓</span>
                <span className="text-emerald-500">{i.txMbps}↑</span>
              </div>
            </div>
          )) : (
            <span className="text-[10px] text-gray-400 italic">Data interface belum tersedia di sampel ini</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
