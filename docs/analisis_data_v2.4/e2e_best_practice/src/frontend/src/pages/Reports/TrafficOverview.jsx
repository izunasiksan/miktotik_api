import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import SizedContainer from './SizedContainer.jsx';

const SortIcon = ({ field, trafficSort }) => {
  if (trafficSort.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
  return trafficSort.order === 'desc'
    ? <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />
    : <ChevronUp className="w-3 h-3 ml-1 text-blue-600" />;
};

const TrafficOverview = ({ 
  reportData, filteredReportData, chartHeight, cardPadding, trafficSort, handleTrafficSort 
}) => {
  const sortedTrafficData = React.useMemo(() => {
    if (!filteredReportData) return [];
    return [...filteredReportData].sort((a, b) => {
      const field = trafficSort.field;
      const order = trafficSort.order === 'desc' ? -1 : 1;
      
      if (field === 'logTime') {
        return (new Date(a.logTime) - new Date(b.logTime)) * order;
      }
      
      const valA = Number(a[field] || 0);
      const valB = Number(b[field] || 0);
      return (valA - valB) * order;
    });
  }, [filteredReportData, trafficSort]);

  return (
    <div className="space-y-6">
      <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Traffic Overview (mbps)</h3>
        <SizedContainer heightClass={chartHeight}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
            <AreaChart data={reportData}>
              <defs>
                <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="displayDate" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="downloadMbps" name="Download (mbps)" stroke="#6366f1" fillOpacity={1} fill="url(#colorDl)" strokeWidth={2} />
              <Area type="monotone" dataKey="uploadMbps" name="Upload (mbps)" stroke="#22c55e" fillOpacity={1} fill="url(#colorUl)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </SizedContainer>
      </div>

      <div className={`bg-white ${cardPadding} rounded-lg shadow overflow-hidden`}>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Traffic Overview (MB)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleTrafficSort('logTime')}
                >
                  <div className="flex items-center">Waktu <SortIcon field="logTime" trafficSort={trafficSort} /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interface</th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleTrafficSort('downloadMbps')}
                >
                  <div className="flex items-center">Download (mbps) <SortIcon field="downloadMbps" trafficSort={trafficSort} /></div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleTrafficSort('uploadMbps')}
                >
                  <div className="flex items-center">Upload (mbps) <SortIcon field="uploadMbps" trafficSort={trafficSort} /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col">
                    <span>Download (MB)</span>
                    <span className="text-[10px] lowercase font-normal text-gray-400">per 1 menit</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex flex-col">
                    <span>Upload (MB)</span>
                    <span className="text-[10px] lowercase font-normal text-gray-400">per 1 menit</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTrafficData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.displayDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{row.interfaceName || 'All Interfaces'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{Number(row.downloadMbps || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{Number(row.uploadMbps || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">{(Number(row.downloadMbps || 0) * 60 / 8).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">{(Number(row.uploadMbps || 0) * 60 / 8).toFixed(2)}</td>
                </tr>
              ))}
              {sortedTrafficData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No traffic data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrafficOverview;
