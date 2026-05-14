import React from 'react';
import { RefreshCw } from 'lucide-react';
import { formatBytesAuto } from '../analysis_utils';

const PivotInterfaceTable = ({ pivotTables }) => {
  if (!pivotTables) return null;

  return (
    <>
      {pivotTables.ifaceMonthAgg && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-emerald-600" />
              <h3 className="font-bold text-gray-700">Interface Monthly Pivot</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Bulan</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total TX</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total RX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.ifaceMonthAgg.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_tx_bytes)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_rx_bytes)}</td>
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

export default PivotInterfaceTable;
