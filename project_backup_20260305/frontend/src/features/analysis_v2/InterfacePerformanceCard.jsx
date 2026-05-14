import React from 'react';
import { Network } from 'lucide-react';

/**
 * Interface Performance Card based on P95 metrics.
 */
const InterfacePerformanceCard = ({ interfaceAnalysis, isLoading }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-full hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Network className="h-4 w-4 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Interface Performance (P95)</h3>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl" />
          ))
        ) : interfaceAnalysis && interfaceAnalysis.length > 0 ? (
          interfaceAnalysis.slice(0, 4).map((it, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-right duration-300" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800 truncate max-w-[120px]">{it.interface_name || it.interface}</span>
                <span className="text-[10px] text-gray-400">Avg: {(Number(it.avg_download) || 0).toFixed(1)} Mbps</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-gray-900">{(Number(it.p95_download) || 0).toFixed(1)} Mbps</div>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${it.p95_download > 80 ? 'bg-rose-500' : it.p95_download > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, it.p95_download)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">{Math.min(100, Math.round(it.p95_download))}%</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-gray-400 text-xs">Tidak ada data interface.</div>
        )}
      </div>
      <p className="mt-4 text-[10px] text-gray-400 italic">
        * Analisis utilitas interface menggunakan metode P95 (95th Percentile) untuk mengabaikan lonjakan singkat (noise).
      </p>
    </div>
  );
};

export default InterfacePerformanceCard;
