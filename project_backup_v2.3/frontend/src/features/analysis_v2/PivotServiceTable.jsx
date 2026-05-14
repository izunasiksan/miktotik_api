import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { formatBytesAuto } from '../analysis_utils';

const PivotServiceTable = ({ pivotTables }) => {
  if (!pivotTables) return null;

  return (
    <>
      {pivotTables.pppoeMonthAgg && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              <h3 className="font-bold text-gray-700">PPPoE Monthly Pivot</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Bulan</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total Upload</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.pppoeMonthAgg.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_upload_bytes)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_download_bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pivotTables.hotspotMonthAgg && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-orange-600" />
              <h3 className="font-bold text-gray-700">Hotspot Monthly Aggregation</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Bulan</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total Download</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total Upload</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total Uptime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.hotspotMonthAgg.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_download)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_upload)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_uptime || 0).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default PivotServiceTable;
