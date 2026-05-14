import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import SizedContainer from './SizedContainer.jsx';

const SummaryTab = ({ 
  reportData, usageUnit, setUsageUnit, chartHeight, cardPadding, gridGap,
  interfacesSummary, pppoeSummary, hotspotSummary
}) => {
  const renderTrafficSummaryChart = () => {
    const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    const chartData = (reportData || []).map(item => ({
      ...item,
      totalDownloadBytes: Number(item.totalDownloadBytes || 0) / div,
      totalUploadBytes: Number(item.totalUploadBytes || 0) / div,
    }));

    return (
      <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Total Traffic Summary ({usageUnit})</h3>
          <div className="bg-gray-100 rounded-md p-1">
            {['MB', 'GB', 'TB'].map(unit => (
              <button
                key={unit}
                className={`px-3 py-1.5 rounded transition-all ${usageUnit === unit ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setUsageUnit(unit)}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <SizedContainer heightClass={chartHeight}>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">No traffic summary data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" />
                <YAxis tickFormatter={(value) => value.toFixed(1)} />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), usageUnit]} />
                <Legend />
                <Area type="monotone" dataKey="totalDownloadBytes" name={`Download (${usageUnit})`} stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="totalUploadBytes" name={`Upload (${usageUnit})`} stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SizedContainer>
      </div>
    );
  };

  const renderTopUsageChart = (title, data, dataKeyName, dlKey, ulKey, dlColor, ulColor) => {
    const div = usageUnit === 'TB' ? 1024 ** 4 : usageUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    const chartData = (function(){
      const map = new Map();
      (data || []).forEach(row => {
        const name = row[dataKeyName] || 'unknown';
        const prev = map.get(name) || { name, downloadValue: 0, uploadValue: 0, totalValue: 0 };
        const dl = Number(row[dlKey] || 0) / div;
        const ul = Number(row[ulKey] || 0) / div;
        prev.downloadValue += dl;
        prev.uploadValue += ul;
        prev.totalValue = prev.downloadValue + prev.uploadValue;
        map.set(name, prev);
      });
      return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
    })();

    return (
      <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{title} ({usageUnit})</h3>
          <div className="bg-gray-100 rounded-md p-1">
            {['MB', 'GB', 'TB'].map(unit => (
              <button
                key={unit}
                className={`px-3 py-1.5 rounded transition-all ${usageUnit === unit ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setUsageUnit(unit)}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <SizedContainer heightClass={chartHeight}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill={dlColor} />
              <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill={ulColor} />
            </BarChart>
          </ResponsiveContainer>
        </SizedContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${gridGap}`}>
        {renderTopUsageChart("Top Interfaces", interfacesSummary, "interfaceName", "totalRxBytes", "totalTxBytes", "#6366f1", "#22c55e")}
        {renderTopUsageChart("Top PPPoE Users", pppoeSummary, "pppoeUsername", "downloadBytes", "uploadBytes", "#a78bfa", "#f59e0b")}
        {renderTopUsageChart("Top Hotspot Users", hotspotSummary, "username", "dailyDownload", "dailyUpload", "#f472b6", "#fb923c")}
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
        {renderTrafficSummaryChart()}
        <div className={`bg-white ${cardPadding} rounded-lg shadow`}>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Average Speed Summary (mbps)</h3>
          <SizedContainer heightClass={chartHeight}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
              <AreaChart data={reportData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" />
                <YAxis tickFormatter={(value) => value.toFixed(1)} />
                <Tooltip formatter={(value) => [Number(value).toFixed(2), 'mbps']} />
                <Legend />
                <Area type="monotone" dataKey="avgDownload" name="Avg Download (mbps)" stroke="#818cf8" fill="#818cf8" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="avgUpload" name="Avg Upload (mbps)" stroke="#4ade80" fill="#4ade80" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </SizedContainer>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
