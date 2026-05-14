import React from 'react';
import { Search, CheckCircle } from 'lucide-react';

/**
 * Root Cause Analysis (RCA) Card component.
 */
const RcaCard = ({ rcaData, isLoading }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-full hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-rose-100 p-2 rounded-lg">
          <Search className="h-4 w-4 text-rose-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Root Cause Analysis (RCA)</h3>
      </div>
      
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl" />
          ))
        ) : rcaData && rcaData.length > 0 ? rcaData.map((d, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">{d.date}</div>
              <div className="text-sm font-bold text-gray-700">{d.type}</div>
            </div>
            <div className="flex gap-1">
              {d.isTrafficSpike && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded">TRAFFIC SPIKE</span>}
              {d.isCpuSpike && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded">CPU SPIKE</span>}
              {d.isMemSpike && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded">MEM SPIKE</span>}
            </div>
          </div>
        )) : (
          <div className="py-10 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-medium">Tidak ditemukan anomali korelasi beban.</p>
          </div>
        )}
      </div>
      {rcaData && rcaData.length > 0 && (
        <p className="mt-4 text-[10px] text-gray-400 italic">
          * Sistem mendeteksi korelasi antara lonjakan trafik dengan beban resource untuk mengidentifikasi penyebab masalah jaringan.
        </p>
      )}
    </div>
  );
};

export default RcaCard;
