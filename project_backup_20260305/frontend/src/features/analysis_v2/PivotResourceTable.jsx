import React from 'react';
import { Cpu } from 'lucide-react';
import { formatBytesAuto } from '../analysis_utils.jsx';

const PivotResourceTable = ({ pivotTables }) => {
  if (!pivotTables) return null;

  return (
    <>
      {/* Resource Usage Pivot Helper Table */}
      {pivotTables.resource && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-blue-500" />
              <h3 className="font-bold text-gray-700">Pivot Resource Usage</h3>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase">Helper Pivot</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">CPU (%)</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Mem (%)</th>
                    <th className="px-4 py-3 border-b border-gray-100 text-right">Peak (%)</th>
                    <th className="px-4 py-3 border-b border-gray-100 text-right">Free RAM</th>
                    <th className="px-4 py-3 border-b border-gray-100 text-right">Total RAM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.resource.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">{row['CPU (%)']}%</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                      <div className="flex items-center justify-end gap-2">
                        <span>{row['Mem (%)']}{row['Mem (%)'] !== '-' ? '%' : ''}</span>
                        {row['Mem Source'] && row['Mem Source'] !== '-' && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${
                            row['Mem Source'] === 'Provided' ? 'bg-emerald-100 text-emerald-700' 
                            : row['Mem Source'] === 'Computed' ? 'bg-amber-100 text-amber-700' 
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                            {row['Mem Source']}
                          </span>
                        )}
                      </div>
                    </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-blue-600">{row['CPU Pk (%)']}%</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 whitespace-nowrap">{row['Free RAM']}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 whitespace-nowrap">{row['Total RAM']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resource Avg Per Hari */}
      {pivotTables.resourceDayAvg && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-emerald-600" />
              <h3 className="font-bold text-gray-700">Pivot Resource (Per Hari)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg CPU</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg Free RAM</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Avg Free HDD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pivotTables.resourceDayAvg.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{row.Waktu}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700">{Number(row.avg_cpu_load || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.avg_free_memory)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-bold text-gray-700 whitespace-nowrap">{formatBytesAuto(row.avg_free_hdd)}</td>
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

export default PivotResourceTable;
