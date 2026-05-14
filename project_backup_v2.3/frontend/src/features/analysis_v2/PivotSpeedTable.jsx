import React from 'react';
import { RefreshCw, Zap } from 'lucide-react';

const PivotSpeedTable = ({ pivotTables }) => {
  if (!pivotTables) return null;

  return (
    <>
      {/* Speed Per Hari */}
      {pivotTables.speedDay && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-indigo-600" />
              <h3 className="font-bold text-gray-700">Pivot Speed (Per Hari)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total UL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg UL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.speedDay.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_upload_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_upload_mbps || 0).toFixed(2)} Mbps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Speed Per Jam */}
      {pivotTables.speedHour && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-blue-600" />
              <h3 className="font-bold text-gray-700">Pivot Speed (Per Jam)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total UL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.speedHour.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_upload_mbps || 0).toFixed(2)} Mbps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Speed Per Interface */}
      {pivotTables.speedInterface && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-emerald-600" />
              <h3 className="font-bold text-gray-700">Pivot Speed (Per Interface)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Interface</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total UL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg UL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.speedInterface.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500 truncate max-w-[120px]" title={row.Interface}>{row.Interface}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_upload_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_upload_mbps || 0).toFixed(2)} Mbps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Speed Per Jam + Interface */}
      {pivotTables.speedHourInterface && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-amber-600" />
              <h3 className="font-bold text-gray-700">Pivot Speed (Per Jam + Interface)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                  <th className="px-4 py-3 border-b border-gray-100">Interface</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Total UL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.speedHourInterface.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500 truncate max-w-[120px]" title={row.Interface}>{row.Interface}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.total_upload_mbps || 0).toFixed(2)} Mbps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Peak Traffic Per Hari */}
      {pivotTables.speedDayPeak && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-rose-600" />
              <h3 className="font-bold text-gray-700">Peak Traffic (Per Hari)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Max DL</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Max UL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.speedDayPeak.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.max_download_mbps || 0).toFixed(2)} Mbps</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.max_upload_mbps || 0).toFixed(2)} Mbps</td>
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

export default PivotSpeedTable;
