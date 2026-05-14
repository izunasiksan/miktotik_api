import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import SizedContainer from './SizedContainer.jsx';

const DetailTab = ({ 
  reportData, filteredReportData, activeTab, nameFilter, setNameFilter, nameOptions,
  tableMode, setTableMode, pivotAgg, openPivotDialog, 
  chartStacked, setChartStacked, chartHeight, cardPadding
}) => {
  const isSummary = activeTab === 'summary';
  if (isSummary) return null;

  const renderFilterControls = () => (
    <div className={`bg-white ${cardPadding} rounded-lg shadow mb-6`}>
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="detail-name-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Name</label>
          <div className="relative">
            <input
              id="detail-name-filter"
              name="detail-name-filter"
              type="text"
              list="name-options"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full border border-gray-300 rounded-md pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="name-options">
              {nameOptions.map(opt => <option key={opt} value={opt} />)}
            </datalist>
            {nameFilter && (
              <button 
                onClick={() => setNameFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-gray-100 rounded-md p-1 flex">
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${tableMode === 'pivot' ? 'bg-white shadow text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setTableMode('pivot')}
            >
              Pivot View
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${tableMode === 'raw' ? 'bg-white shadow text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setTableMode('raw')}
            >
              Raw Data
            </button>
          </div>
          
          {tableMode === 'pivot' && (
            <button
              onClick={() => openPivotDialog(activeTab)}
              className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              Agg: {pivotAgg.toUpperCase()}
            </button>
          )}

          {activeTab === 'clients' && (
            <button
              onClick={() => setChartStacked(!chartStacked)}
              className={`px-4 py-2 border rounded-md transition-colors text-sm font-medium ${chartStacked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {chartStacked ? 'Stacked' : 'Grouped'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const getChartData = () => {
    if (activeTab === 'clients') {
        const byDate = new Map();
        (reportData || []).forEach(row => {
            const d = new Date(row.logTime || row.logDate);
            if (isNaN(d.getTime())) return;
            const key = d.toLocaleDateString();
            const rec = byDate.get(key) || { date: key, totalPppoe: 0, totalHotspot: 0, cnt: 0 };
            const p = Number(row.totalPppoe || 0);
            const h = Number(row.totalHotspot || 0);
            
            if (pivotAgg === 'max') {
                rec.totalPppoe = Math.max(rec.totalPppoe, p);
                rec.totalHotspot = Math.max(rec.totalHotspot, h);
            } else {
                rec.totalPppoe += p;
                rec.totalHotspot += h;
            }
            rec.cnt += 1;
            byDate.set(key, rec);
        });
        
        let arr = Array.from(byDate.values());
        if (pivotAgg === 'avg') {
            arr = arr.map(v => ({
                ...v,
                totalPppoe: v.totalPppoe / v.cnt,
                totalHotspot: v.totalHotspot / v.cnt
            }));
        }
        return arr;
    }

    const dlKey = activeTab === 'interfaces'
      ? 'totalRxBytes'
      : activeTab === 'hotspot'
        ? 'dailyDownload'
        : 'downloadBytes';
    const ulKey = activeTab === 'interfaces'
      ? 'totalTxBytes'
      : activeTab === 'hotspot'
        ? 'dailyUpload'
        : 'uploadBytes';
    
    const byDate = new Map();
    (reportData || []).forEach(row => {
      const d = new Date(row.logDate || row.logTime);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString();
      const rec = byDate.get(key) || { date: key, download: 0, upload: 0, cnt: 0 };
      const dl = Number(row[dlKey] || 0) / (1024 * 1024);
      const ul = Number(row[ulKey] || 0) / (1024 * 1024);
      
      if (pivotAgg === 'max') {
        rec.download = Math.max(rec.download, dl);
        rec.upload = Math.max(rec.upload, ul);
      } else {
        rec.download += dl;
        rec.upload += ul;
      }
      rec.cnt += 1;
      byDate.set(key, rec);
    });

    let arr = Array.from(byDate.values());
    if (pivotAgg === 'avg') {
      arr = arr.map(v => ({ ...v, download: v.download / v.cnt, upload: v.upload / v.cnt }));
    }
    return arr;
  };

  const renderChart = () => (
    <div className={`bg-white ${cardPadding} rounded-lg shadow mb-6`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-700 capitalize">{activeTab} Usage Trend</h3>
      <SizedContainer heightClass={chartHeight}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
          {activeTab === 'clients' ? (
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalPppoe" name="PPPoE Clients" fill="#6366f1" stackId={chartStacked ? "a" : undefined} />
              <Bar dataKey="totalHotspot" name="Hotspot Clients" fill="#22c55e" stackId={chartStacked ? "a" : undefined} />
            </BarChart>
          ) : (
            <AreaChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="download" name="Download" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
              <Area type="monotone" dataKey="upload" name="Upload" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </SizedContainer>
    </div>
  );

  const renderTable = () => {
    if (tableMode === 'pivot') {
      const nameKey = activeTab === 'interfaces'
        ? 'interfaceName'
        : activeTab === 'pppoe'
          ? 'pppoeUsername'
          : 'username';
      const dlKey = activeTab === 'interfaces'
        ? 'totalRxBytes'
        : activeTab === 'hotspot'
          ? 'dailyDownload'
          : 'downloadBytes';
      const ulKey = activeTab === 'interfaces'
        ? 'totalTxBytes'
        : activeTab === 'hotspot'
          ? 'dailyUpload'
          : 'uploadBytes';
      
      const map = new Map();
      (reportData || []).forEach(row => {
        const name = row[nameKey] || 'unknown';
        const prev = map.get(name) || { name, download: 0, upload: 0, cnt: 0 };
        const dl = Number(row[dlKey] || 0);
        const ul = Number(row[ulKey] || 0);
        
        if (pivotAgg === 'max') {
          prev.download = Math.max(prev.download, dl);
          prev.upload = Math.max(prev.upload, ul);
        } else {
          prev.download += dl;
          prev.upload += ul;
        }
        prev.cnt += 1;
        map.set(name, prev);
      });
      
      let data = Array.from(map.values()).sort((a, b) => (b.download + b.upload) - (a.download + a.upload));
      if (pivotAgg === 'avg') {
        data = data.map(v => ({ ...v, download: v.download / v.cnt, upload: v.upload / v.cnt }));
      }
      
      return (
        <div className={`bg-white ${cardPadding} rounded-lg shadow overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Download (MB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Upload (MB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{(row.download / (1024 * 1024)).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{(row.upload / (1024 * 1024)).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.cnt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    
    // Raw Mode
    const dlKey = activeTab === 'interfaces'
      ? 'totalRxBytes'
      : activeTab === 'hotspot'
        ? 'dailyDownload'
        : 'downloadBytes';
    const ulKey = activeTab === 'interfaces'
      ? 'totalTxBytes'
      : activeTab === 'hotspot'
        ? 'dailyUpload'
        : 'uploadBytes';
    const nameKey = activeTab === 'interfaces'
      ? 'interfaceName'
      : activeTab === 'pppoe'
        ? 'pppoeUsername'
        : 'username';

    return (
      <div className={`bg-white ${cardPadding} rounded-lg shadow overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Download (MB)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload (MB)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReportData.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.displayDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row[nameKey]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{(Number(row[dlKey] || 0) / (1024 * 1024)).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{(Number(row[ulKey] || 0) / (1024 * 1024)).toFixed(2)}</td>
                </tr>
              ))}
              {filteredReportData.length > 100 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">... showing only first 100 rows ...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderFilterControls()}
      {renderChart()}
      {renderTable()}
    </div>
  );
};

export default DetailTab;
