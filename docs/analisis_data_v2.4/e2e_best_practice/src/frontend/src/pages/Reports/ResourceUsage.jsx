import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Activity, Network, FileText } from 'lucide-react';
import SizedContainer from './SizedContainer.jsx';

const ResourceUsage = ({ reportData, chartHeight, cardPadding }) => {
  return (
    <div className="space-y-6">
      {/* CPU Usage Chart */}
      <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-700">CPU Usage (%)</h3>
        </div>
        <SizedContainer heightClass={chartHeight}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayDate" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cpuLoad" name="CPU Load (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </SizedContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage Chart */}
        <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
          <div className="flex items-center gap-2 mb-4">
            <Network className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-700">Free Memory (MB)</h3>
          </div>
          <SizedContainer heightClass={chartHeight}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
              <LineChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip 
                  formatter={(val) => [`${(Number(val) / (1024 * 1024)).toFixed(2)} MB`, "Free Memory"]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="freeMemory" 
                  name="Free Memory" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  formatter={(val) => (val / (1024 * 1024)).toFixed(2)} 
                />
              </LineChart>
            </ResponsiveContainer>
          </SizedContainer>
        </div>

        {/* HDD Usage Chart */}
        <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-700">Free HDD (MB)</h3>
          </div>
          <SizedContainer heightClass={chartHeight}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
              <LineChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" />
                <YAxis />
                <Tooltip 
                  formatter={(val) => [`${(Number(val) / (1024 * 1024)).toFixed(2)} MB`, "Free HDD"]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="freeHdd" 
                  name="Free HDD" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  formatter={(val) => (val / (1024 * 1024)).toFixed(2)} 
                />
              </LineChart>
            </ResponsiveContainer>
          </SizedContainer>
        </div>
      </div>

      {/* Resource Usage Table */}
      <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-700">Tabel Resource Usage Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU (%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Free RAM (MB)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Free HDD (MB)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...reportData].reverse().map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.displayDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{Number(row.cpuLoad || 0).toFixed(1)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{(Number(row.freeMemory || 0) / (1024 * 1024)).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600">{(Number(row.freeHdd || 0) / (1024 * 1024)).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.uptime || 'N/A'}</td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Tidak ada data untuk periode ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResourceUsage;
