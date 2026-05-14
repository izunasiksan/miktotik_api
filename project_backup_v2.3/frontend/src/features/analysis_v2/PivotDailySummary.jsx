import React from 'react';
import { RefreshCw } from 'lucide-react';
import { formatBytesAuto } from '../analysis_utils.jsx';

const PivotDailySummary = ({ pivotTables }) => {
  if (!pivotTables) return null;

  return (
    <>
      {pivotTables.dailySummaryPerBoard && pivotTables.dailySummaryPerBoard.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-teal-600" />
              <h3 className="font-bold text-gray-700">Daily Summary Per Board</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Date</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total UL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg UL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Max DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Max UL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.dailySummaryPerBoard.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu || row.day}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_download_bytes)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.total_upload_bytes)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_download || row.avg_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_upload || row.avg_upload_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.max_download || row.max_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.max_upload || row.max_upload_mbps || 0).toFixed(2)} Mbps</td>
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

export default PivotDailySummary;
