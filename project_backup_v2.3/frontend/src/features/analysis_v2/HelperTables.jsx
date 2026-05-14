import React from 'react';
import { Cpu, Zap, RefreshCw, Users, ShieldCheck } from 'lucide-react';
import { toMbps, formatBytesAuto } from '../analysis_utils.jsx';

const HelperTables = ({ 
  resourceUsageStats, 
  trafficUsageStats, 
  interfaceUsageStats, 
  clientCountStats, 
  pppoeUsageStats, 
  hotspotUsageStats
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-4">
      {/* Resource Usage Helper Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-700">Resource Usage (Last 10)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">CPU</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resourceUsageStats.samples.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{s.date}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">{s.cpu}%</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">{s.mem}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traffic Usage Helper Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            <h3 className="font-bold text-gray-700">Traffic Usage (Last 10)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">RX/TX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trafficUsageStats.samples.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{s.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-blue-600">{formatBytesAuto(s.rx)}</span>
                      <span className="text-xs font-bold text-emerald-600">{formatBytesAuto(s.tx)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interface Usage Helper Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-700">Interface Usage (Last 10)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-gray-100">Interface / Waktu</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">Speed (Mbps)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {interfaceUsageStats.samples.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-1">
                      {s.displayTime}
                    </div>
                    <div className="text-xs font-bold text-gray-700 truncate max-w-[120px]" title={s.name}>{s.name}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-blue-600">{toMbps(s.rx).toFixed(2)} ↓</span>
                      <span className="text-xs font-bold text-emerald-600">{toMbps(s.tx).toFixed(2)} ↑</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Count Helper Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            <h3 className="font-bold text-gray-700">Client Count (Last 10)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-gray-100">Waktu</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">P / H / T</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientCountStats.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{s.displayTime}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs font-bold text-blue-600" title="PPPoE">{s.pppoe}</span>
                      <span className="text-xs font-bold text-purple-600" title="Hotspot">{s.hotspot}</span>
                      <span className="text-xs font-black text-gray-800" title="Total">{s.pppoe + s.hotspot}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PPPoE Usage Helper Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-700">PPPoE Usage (Last 10)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-gray-100">User / Waktu</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pppoeUsageStats.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-1">
                      {s.displayTime}
                    </div>
                    <div className="text-xs font-bold text-gray-700 truncate max-w-[120px]" title={s.user}>{s.user}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-blue-600">{s.count} u</span>
                      <span className="text-[9px] font-bold text-gray-400">{formatBytesAuto(s.total_bytes)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hotspot Usage Helper Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-orange-500" />
            <h3 className="font-bold text-gray-700">Hotspot Usage (Last 10)</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-gray-100">User / Waktu</th>
                <th className="px-4 py-3 border-b border-gray-100 text-right">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hotspotUsageStats.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-1">
                      {s.displayTime}
                    </div>
                    <div className="text-xs font-bold text-gray-700 truncate max-w-[120px]" title={s.user}>{s.user}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-orange-600">{s.count} u</span>
                      <span className="text-[9px] font-bold text-gray-400">{formatBytesAuto(s.total_bytes)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default HelperTables;
