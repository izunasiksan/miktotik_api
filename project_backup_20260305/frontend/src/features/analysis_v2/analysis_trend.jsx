import React from 'react';
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { FileText, Activity, Users, Download, Wifi, Network, RefreshCw, Zap as ZapIcon } from 'lucide-react';
import { TableLimitSelector, SizedContainer } from './components/SharedWidgets.jsx';
import { 
  sliceData, 
  standardizeTableData, 
  toMbps, 
  formatBytesAuto, 
  getSuggestedTimeInfo,
  bytesToUnit
} from './analysis_utils.jsx';
import AnalysisTable from './components/AnalysisTable.jsx';

import GlobalControls from './components/GlobalControls.jsx';

import { useAnalysisData } from './hooks/useAnalysisData.jsx';
import TrafficOverviewCard from './components/TrafficOverviewCard.jsx';
import ResourceUsageCard from './components/ResourceUsageCard.jsx';

import LoadingOverlay from './components/LoadingOverlay.jsx';

import { normalizationPreviewV2 } from '../../analytics_v2/services/api_v2.js';

const AnalysisTrend = ({
  boardId,
  activeTab,
  setActiveTab,
  cardPadding,
  chartHeight,
  gridGap,
  isCompact,
  usageUnit,
  setUsageUnit,
  nameFilter,
  setNameFilter,
  nameOptions,
  reportData,
  filteredReportData,
  interfaceTopData,
  pppoeTopData,
  hotspotTopData,
  interfaceAnalysis,
  pppoeAnalysis,
  hotspotAnalysis,
  clientsAnalysis,
  clientsTableMode,
  setClientsTableMode,
  clientsChartStacked,
  setClientsChartStacked,
  latestClientCounts,
  clientsChartData,
  interfacesTableMode,
  setInterfacesTableMode,
  pppoeTableMode,
  setPppoeTableMode,
  hotspotTableMode,
  setHotspotTableMode,
  period,
  setPeriod,
  limit,
  setLimit,
  pivotAgg,
  setPivotAgg,
  aggMethod,
  setAggMethod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  comparePrev,
  setComparePrev,
  granularity,
  setGranularity,
  bucketSource,
  setBucketSource,
  serverBuckets,
  reportRows,
  heavyAnalysis,
  analysisSummary,
  isKpiLoading,
  isHeavyLoading,
  isSummaryLoading,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges
}) => {
  const {
    trafficTrendData,
    resourceTrendData
  } = useAnalysisData({
    reportRows,
    heavyAnalysis,
    analysisSummary,
    isKpiLoading,
    isHeavyLoading,
    comparePrev,
    usageUnit,
    period,
    aggMethod,
    serverBuckets,
    useServerBuckets: bucketSource === 'server'
  });

  const { scopeLabel, granularityLabel } = getSuggestedTimeInfo(period, limit, startDate, endDate, granularity);

  const [tableLimits, setTableLimits] = React.useState({
    clients: 10,
    interfaces: 10,
    pppoe: 10,
    hotspot: 10
  });

  const handleLimitChange = (table, limit) => {
    setTableLimits(prev => ({ ...prev, [table]: limit }));
  };

  const __USE_SIZEDCONTAINER = SizedContainer;

  const isLoading = isKpiLoading || isHeavyLoading || isSummaryLoading;

  const [normPreviewOpen, setNormPreviewOpen] = React.useState(false);
  const [normLoading, setNormLoading] = React.useState(false);
  const [normData, setNormData] = React.useState(null);
  const [normError, setNormError] = React.useState(null);

  const requestNormalizationPreview = async () => {
    if (!boardId) return;
    setNormLoading(true);
    setNormError(null);
    try {
      const mapAgg = { AVG: 'avg', MAX: 'max', SUM: 'sum', MIN: 'min' };
      const agg = mapAgg[String(aggMethod || 'AVG').toUpperCase()] || 'avg';
      const payload = {
        board_id: boardId,
        start_date: startDate || null,
        end_date: endDate || null,
        days: Number(limit) || 30,
        granularity: granularity || 'auto',
        agg,
        bucketSource: bucketSource || 'server',
        usageUnit: usageUnit || 'Mbps',
        fillGaps: true
      };
      const data = await normalizationPreviewV2(payload);
      setNormData(data);
      setNormPreviewOpen(true);
    } catch (e) {
      setNormError(String(e?.response?.data?.detail || e?.message || e));
      setNormPreviewOpen(true);
    } finally {
      setNormLoading(false);
    }
  };

  const trafficChartData = React.useMemo(() => {
    if (!normData || !Array.isArray(normData.traffic)) return [];
    return normData.traffic.map(r => ({
      date: r.displayDate || r.timestamp,
      rx: Number(r.rx || 0),
      tx: Number(r.tx || 0),
      total: Number(r.total || 0),
      isGap: !!r.isGap
    }));
  }, [normData]);

  const trafficGapData = React.useMemo(() => {
    return trafficChartData.filter(d => d.isGap).map(d => ({ date: d.date, value: d.total }));
  }, [trafficChartData]);

  const resourceChartData = React.useMemo(() => {
    if (!normData || !Array.isArray(normData.resource)) return [];
    return normData.resource.map(r => ({
      date: r.displayDate || r.timestamp,
      cpu: Number(r.cpu_percent_standard || 0),
      isGap: !!r.isGap
    }));
  }, [normData]);

  const resourceGapData = React.useMemo(() => {
    return resourceChartData.filter(d => d.isGap).map(d => ({ date: d.date, value: d.cpu }));
  }, [resourceChartData]);

  const TrafficTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0]?.payload || {};
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow text-[11px]">
        <div className="font-bold text-gray-700">{d.date}</div>
        <div className="text-gray-600">Total: {(Number(d.total) || 0).toFixed(2)} {usageUnit || 'Mbps'}</div>
        <div className="text-gray-600">RX: {(Number(d.rx) || 0).toFixed(2)} {usageUnit || 'Mbps'}</div>
        <div className="text-gray-600">TX: {(Number(d.tx) || 0).toFixed(2)} {usageUnit || 'Mbps'}</div>
        <div className="text-gray-500">Gap: {d.isGap ? 'Ya' : 'Tidak'}</div>
      </div>
    );
  };

  const ResourceTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0]?.payload || {};
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow text-[11px]">
        <div className="font-bold text-gray-700">{d.date}</div>
        <div className="text-gray-600">CPU: {(Number(d.cpu) || 0).toFixed(0)}%</div>
        <div className="text-gray-500">Gap: {d.isGap ? 'Ya' : 'Tidak'}</div>
      </div>
    );
  };

  if (!isLoading && (!reportData || reportData.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center relative">
        <LoadingOverlay isLoading={isLoading} message="Mengecek data historis..." />
        <Activity className="text-gray-300 h-12 w-12 mb-4" />
        <h3 className="text-lg font-bold text-gray-700">Tidak Ada Data Historis</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
          Belum ditemukan rekaman data untuk perangkat ini di database. Pastikan background worker telah mengumpulkan data.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', label: 'Summary', icon: FileText },
            { id: 'traffic', label: 'Traffic Overview', icon: Activity },
            { id: 'resource', label: 'Resource Usage', icon: Download },
            { id: 'interfaces', label: 'Interfaces', icon: Network },
            { id: 'clients', label: 'Client Counts', icon: Users },
            { id: 'pppoe', label: 'PPPoE Usage', icon: Users },
            { id: 'hotspot', label: 'Hotspot Usage', icon: Wifi },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <GlobalControls 
        period={period} setPeriod={setPeriod}
        limit={limit} setLimit={setLimit}
        pivotAgg={pivotAgg} setPivotAgg={setPivotAgg}
        activeTab={activeTab}
        aggMethod={aggMethod} setAggMethod={setAggMethod}
        bucketSource={bucketSource} setBucketSource={setBucketSource}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        comparePrev={comparePrev} setComparePrev={setComparePrev}
        usageUnit={usageUnit} setUsageUnit={setUsageUnit}
        granularity={granularity} setGranularity={setGranularity}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        autoApply={autoApply}
        setAutoApply={setAutoApply}
        hasPendingChanges={hasPendingChanges}
      />

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Preview Normalisasi (Server)</h3>
          <button
            onClick={requestNormalizationPreview}
            disabled={!boardId || normLoading}
            className={`px-3 py-1.5 rounded-md text-xs font-bold ${normLoading ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'} transition`}
          >
            {normLoading ? 'Memuat...' : 'Tampilkan Preview'}
          </button>
        </div>
        {normPreviewOpen ? (
          normError ? (
            <div className="mt-3 text-xs p-2 rounded border border-rose-200 bg-rose-50 text-rose-700">{normError}</div>
          ) : normData ? (
            <div className="mt-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="border rounded-md p-2 h-56">
                  <div className="text-[11px] font-black text-gray-700 mb-2">Traffic</div>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                    <LineChart data={trafficChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<TrafficTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" dot={false} />
                      <Line type="monotone" dataKey="rx" name="RX" stroke="#10b981" strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="tx" name="TX" stroke="#f59e0b" strokeDasharray="5 5" dot={false} />
                      <Scatter data={trafficGapData} dataKey="value" name="GAP" fill="#ef4444" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="border rounded-md p-2 h-56">
                  <div className="text-[11px] font-black text-gray-700 mb-2">Resource (CPU)</div>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                    <LineChart data={resourceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<ResourceTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="#9333ea" dot={false} />
                      <Scatter data={resourceGapData} dataKey="value" name="GAP" fill="#ef4444" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-md p-2">
                  <div className="font-black text-gray-700 mb-2">Traffic</div>
                  <div className="text-[10px] text-gray-500 mb-1">gapCount: {normData?.meta?.traffic?.gapCount ?? 0}, valid: {normData?.meta?.traffic?.validCount ?? 0}</div>
                  <div className="max-h-56 overflow-auto border-t">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">Time</th>
                          <th className="text-right px-2 py-1">RX</th>
                          <th className="text-right px-2 py-1">TX</th>
                          <th className="text-right px-2 py-1">Total</th>
                          <th className="text-center px-2 py-1">Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(normData?.traffic || []).slice(0, 50).map((r, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">{r.displayDate || r.timestamp}</td>
                            <td className="px-2 py-1 text-right">{Number(r.rx || 0).toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{Number(r.tx || 0).toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{Number(r.total || 0).toFixed(2)} {normData?.usageUnit || 'Mbps'}</td>
                            <td className="px-2 py-1 text-center">{r.isGap ? '•' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="border rounded-md p-2">
                  <div className="font-black text-gray-700 mb-2">Resource</div>
                  <div className="text-[10px] text-gray-500 mb-1">gapCount: {normData?.meta?.resource?.gapCount ?? 0}, valid: {normData?.meta?.resource?.validCount ?? 0}</div>
                  <div className="max-h-56 overflow-auto border-t">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">Time</th>
                          <th className="text-right px-2 py-1">CPU (%)</th>
                          <th className="text-right px-2 py-1">Free Mem</th>
                          <th className="text-center px-2 py-1">Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(normData?.resource || []).slice(0, 50).map((r, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">{r.displayDate || r.timestamp}</td>
                            <td className="px-2 py-1 text-right">{Number(r.cpu_percent_standard || 0).toFixed(0)}</td>
                            <td className="px-2 py-1 text-right">{Number(r.free_memory || 0)}</td>
                            <td className="px-2 py-1 text-center">{r.isGap ? '•' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        ) : null}
      </div>


      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
            <div className="relative min-h-[300px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Memuat tren trafik..." />
              <TrafficOverviewCard 
                id="trend-traffic-overview"
                data={trafficTrendData} 
                usageUnit={usageUnit} 
                isCompact={isCompact} 
                cardPadding={cardPadding} 
                scopeLabel={scopeLabel}
                granularityLabel={granularityLabel}
                isLoading={isKpiLoading}
              />
            </div>
            <div className="relative min-h-[300px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Memuat tren resource..." />
              <ResourceUsageCard 
                id="trend-resource-usage"
                data={resourceTrendData} 
                isCompact={isCompact} 
                cardPadding={cardPadding} 
                scopeLabel={scopeLabel}
                granularityLabel={granularityLabel}
                isLoading={isKpiLoading}
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${isCompact ? 'lg:grid-cols-3 xl:grid-cols-3' : 'lg:grid-cols-2'} ${gridGap}`}>
            <div className={`bg-white ${cardPadding} rounded-lg shadow h-full relative min-h-[300px]`} id="trend-card-top-interfaces" data-testid="trend-card-top-interfaces">
              <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis top interfaces..." />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Top Interfaces by Speed (Mbps)</h3>
                <div className="bg-gray-100 rounded-md p-1">
                  <span className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top 5</span>
                </div>
              </div>
              {isKpiLoading ? (
                <div className="w-full h-64 bg-gray-50 animate-pulse rounded-xl" />
              ) : (
                <SizedContainer heightClass={chartHeight}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                    <BarChart data={interfaceTopData} data-testid="chart-top-interfaces">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="downloadValue" name="Download (Mbps)" fill="#6366f1" />
                      <Bar dataKey="uploadValue" name="Upload (Mbps)" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </SizedContainer>
              )}
            </div>

            <div className={`bg-white ${cardPadding} rounded-lg shadow h-full relative min-h-[300px]`} id="trend-card-top-pppoe" data-testid="trend-card-top-pppoe">
              <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis top PPPoE users..." />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Top PPPoE Users by Usage ({usageUnit === 'Mbps' ? 'Mbps' : usageUnit})</h3>
                <div className="bg-gray-100 rounded-md p-1">
                  <span className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top 5</span>
                </div>
              </div>
              {isKpiLoading ? (
                <div className="w-full h-64 bg-gray-50 animate-pulse rounded-xl" />
              ) : (
                <SizedContainer heightClass={chartHeight}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                    <BarChart data={pppoeTopData} data-testid="chart-top-pppoe">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="downloadValue" name={`Download (${usageUnit === 'Mbps' ? 'Mbps' : usageUnit})`} fill="#a78bfa" />
                      <Bar dataKey="uploadValue" name={`Upload (${usageUnit === 'Mbps' ? 'Mbps' : usageUnit})`} fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </SizedContainer>
              )}
            </div>

            <div className={`bg-white ${cardPadding} rounded-lg shadow h-full relative min-h-[300px]`} id="trend-card-top-hotspot" data-testid="trend-card-top-hotspot">
              <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis top Hotspot users..." />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Top Hotspot Users by Usage ({usageUnit === 'Mbps' ? 'Mbps' : usageUnit})</h3>
                <div className="bg-gray-100 rounded-md p-1">
                  <span className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top 5</span>
                </div>
              </div>
              {isKpiLoading ? (
                <div className="w-full h-64 bg-gray-50 animate-pulse rounded-xl" />
              ) : (
                <SizedContainer heightClass={chartHeight}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                    <BarChart data={hotspotTopData} data-testid="chart-top-hotspot">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="downloadValue" name={`Download (${usageUnit === 'Mbps' ? 'Mbps' : usageUnit})`} fill="#60a5fa" />
                      <Bar dataKey="uploadValue" name={`Upload (${usageUnit === 'Mbps' ? 'Mbps' : usageUnit})`} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </SizedContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'traffic' && (
        <TrafficOverviewCard 
          id="trend-traffic-overview-detail"
          data={trafficTrendData} 
          usageUnit={usageUnit} 
          isCompact={false} 
          cardPadding="p-6" 
          scopeLabel={scopeLabel}
          granularityLabel={granularityLabel}
        />
      )}
      {activeTab === 'resource' && (
        <ResourceUsageCard 
          id="trend-resource-usage-detail"
          data={resourceTrendData} 
          isCompact={false} 
          cardPadding="p-6" 
          scopeLabel={scopeLabel}
          granularityLabel={granularityLabel}
        />
      )}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className={`bg-white ${cardPadding} rounded-lg shadow`} id="trend-card-client-counts" data-testid="trend-card-client-counts">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Client Counts</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Scope: {scopeLabel} • Granularitas: {granularityLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 rounded-md p-1">
                  <button
                    className={`px-3 py-1.5 rounded ${!clientsChartStacked ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setClientsChartStacked(false)}
                  >
                    Grouped
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded ${clientsChartStacked ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setClientsChartStacked(true)}
                  >
                    Stacked
                  </button>
                </div>
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Latest PPPoE: {latestClientCounts.pppoe}
                </span>
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-700/10">
                  Latest Hotspot: {latestClientCounts.hotspot}
                </span>
              </div>
            </div>
            <SizedContainer heightClass={chartHeight}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                <BarChart data={clientsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_pppoe" name="PPPoE Clients" fill="#3b82f6" stackId={clientsChartStacked ? 'clients' : undefined} />
                  <Bar dataKey="total_hotspot" name="Hotspot Clients" fill="#f59e0b" stackId={clientsChartStacked ? 'clients' : undefined} />
                </BarChart>
              </ResponsiveContainer>
            </SizedContainer>
          </div>

          <div className={`bg-white ${cardPadding} rounded-lg shadow`} id="trend-card-client-counts-table" data-testid="trend-card-client-counts-table">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Tabel Client Counts</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Tampilkan</span>
                  <TableLimitSelector 
                    current={tableLimits.clients} 
                    onSelect={(l) => handleLimitChange('clients', l)} 
                  />
                </div>
                <div className="bg-gray-100 rounded-md p-1">
                  <button
                    className={`px-3 py-1.5 rounded ${clientsTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setClientsTableMode('pivot')}
                  >
                    Pivot
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded ${clientsTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setClientsTableMode('raw')}
                  >
                    Semua Data
                  </button>
                </div>
              </div>
            </div>

            {clientsTableMode === 'pivot' ? (
              <div className="overflow-auto rounded-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PPPoE</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotspot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(function(){
                      let rows = (clientsAnalysis || []).map(r => {
                        const pppoe = Number(
                          r.pppoe ?? r.total_pppoe ?? r.pppoe_active ?? r.pppoe_count ?? 0
                        );
                        const hotspot = Number(
                          r.hotspot ?? r.total_hotspot ?? r.hotspot_active ?? r.hotspot_count ?? 0
                        );
                        const tot = Number(
                          r.total ?? r.total_active ?? (pppoe + hotspot)
                        );
                        const rawDate = r.displayDate || r.date || r.log_date || r.log_time || '';
                        const date = rawDate ? new Date(rawDate).toLocaleDateString() : '';
                        return { date, pppoe, hotspot, tot };
                      });
                      
                      rows = sliceData(rows, tableLimits.clients);
                      
                      return rows.map((r, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.date}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.pppoe}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.hotspot}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{r.tot}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <AnalysisTable
                columns={[
                { label: 'Log Time', key: 'displayDate', render: (row) => {
                  const raw = row.displayDate || row.date || row.log_date || row.log_time || '';
                  try { return raw ? new Date(raw).toLocaleDateString() : ''; } catch { return String(raw || ''); }
                }},
                { label: 'PPPoE', key: 'total_pppoe', render: (row) => {
                  const standardized = standardizeTableData([row], 'generic')[0];
                  return Number(
                    standardized.pppoe 
                    ?? row.total_pppoe 
                    ?? row.pppoe_active 
                    ?? row.pppoe_count 
                    ?? row.pppoe 
                    ?? 0
                  );
                }},
                { label: 'Hotspot', key: 'total_hotspot', render: (row) => {
                  const standardized = standardizeTableData([row], 'generic')[0];
                  return Number(
                    standardized.hotspot 
                    ?? row.total_hotspot 
                    ?? row.hotspot_active 
                    ?? row.hotspot_count 
                    ?? row.hotspot 
                    ?? 0
                  );
                }},
                  { label: 'Total', key: 'total_active', render: (row) => {
                    const standardized = standardizeTableData([row], 'generic')[0];
                  const total = Number(
                    standardized.total_active 
                    ?? row.total_active 
                    ?? ((Number(standardized.pppoe || standardized.total_pppoe || 0) + Number(standardized.hotspot || standardized.total_hotspot || 0)))
                  );
                  return total;
                  }},
                  { label: 'stat_id', key: 'stat_id' },
                  { label: 'board_id', key: 'board_id' },
                ]}
              rows={(() => {
                const raw = (Array.isArray(clientsAnalysis) && clientsAnalysis.length) ? clientsAnalysis : reportData;
                return sliceData(raw, tableLimits.clients);
              })()}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'interfaces' && (
        <div className="space-y-6">
          <div className={`bg-white ${cardPadding} rounded-lg shadow`} id="trend-card-interfaces-top" data-testid="trend-card-interfaces-top">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Top Interfaces by Speed (Mbps)</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Tampilkan</span>
                  <TableLimitSelector 
                    current={tableLimits.interfaces} 
                    onSelect={(l) => handleLimitChange('interfaces', l)} 
                  />
                </div>
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px]"
                >
                  <option value="">Semua Interface</option>
                  {nameOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="bg-gray-100 rounded-md p-1">
                  <button
                    className={`px-3 py-1.5 rounded ${interfacesTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setInterfacesTableMode('pivot')}
                  >
                    Pivot
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded ${interfacesTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setInterfacesTableMode('raw')}
                  >
                    Semua Data
                  </button>
                </div>
              </div>
            </div>
            <SizedContainer heightClass={chartHeight}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                <BarChart data={interfaceTopData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="downloadValue" name="Download (Mbps)" fill="#6366f1" />
                  <Bar dataKey="uploadValue" name="Upload (Mbps)" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </SizedContainer>
          </div>
          {interfacesTableMode === 'pivot' ? (
            <div className="overflow-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interface</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Download (Mbps)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Upload (Mbps)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Index (Mbps)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(function(){
                    let rows = (interfaceAnalysis || []).map(row => {
                      const dl = Number(row.download_value || 0);
                      const ul = Number(row.upload_value || 0);
                      return {
                        name: row.interface || row.interface_name || 'Unknown',
                        dl,
                        ul,
                        tot: dl + ul
                      };
                    }).sort((a, b) => b.tot - a.tot);

                    rows = sliceData(rows, tableLimits.interfaces);

                    return rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.dl === 'number' ? row.dl.toFixed(2) : row.dl}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.ul === 'number' ? row.ul.toFixed(2) : row.ul}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.tot === 'number' ? row.tot.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <AnalysisTable
              columns={[
                { label: 'Date', key: 'displayDate' },
                { label: 'Interface', key: 'interface_name' },
                { label: 'Avg Download (Mbps)', key: 'download_mbps', render: (row) => {
                  return `${(Number(row.download_mbps) || 0).toFixed(2)} Mbps`;
                }},
                { label: 'Avg Upload (Mbps)', key: 'upload_mbps', render: (row) => {
                  return `${(Number(row.upload_mbps) || 0).toFixed(2)} Mbps`;
                }},
              ]}
              rows={sliceData(filteredReportData, tableLimits.interfaces)}
            />
          )}
        </div>
      )}

      {activeTab === 'pppoe' && (
        <div className="space-y-6">
          <div className={`bg-white ${cardPadding} rounded-lg shadow`} id="trend-card-pppoe-top" data-testid="trend-card-pppoe-top">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Top PPPoE Users by Usage ({usageUnit})</h3>
              <div className="flex items-center gap-2">
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px]"
                >
                  <option value="">Semua Username PPPoE</option>
                  {nameOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="bg-gray-100 rounded-md p-1">
                  <button
                    className={`px-3 py-1.5 rounded ${pppoeTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setPppoeTableMode('pivot')}
                  >
                    Pivot
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded ${pppoeTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setPppoeTableMode('raw')}
                  >
                    Semua Data
                  </button>
                </div>
                <TableLimitSelector 
                  current={tableLimits.pppoe} 
                  onSelect={(val) => handleLimitChange('pppoe', val)} 
                />
              </div>
            </div>
            <SizedContainer heightClass={chartHeight}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                <BarChart data={pppoeTopData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#a78bfa" />
                  <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </SizedContainer>
          </div>
          {pppoeTableMode === 'pivot' ? (
            <div className="overflow-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Download (${usageUnit})`}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Upload (${usageUnit})`}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total (${usageUnit})`}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(function(){
                    let rows = (pppoeAnalysis || []).map(row => {
                      const dlBytes = Number(row.download_bytes ?? row.download_value ?? row.daily_download ?? 0);
                      const ulBytes = Number(row.upload_bytes ?? row.upload_value ?? row.daily_upload ?? 0);
                      
                      // Standardized formatting
                      let dl, ul;
                      if (usageUnit === 'Mbps') {
                        dl = toMbps(dlBytes);
                        ul = toMbps(ulBytes);
                      } else if (usageUnit === 'Auto') {
                        dl = formatBytesAuto(dlBytes);
                        ul = formatBytesAuto(ulBytes);
                      } else {
                        dl = bytesToUnit(dlBytes, usageUnit);
                        ul = bytesToUnit(ulBytes, usageUnit);
                      }
                      
                      return {
                        name: row.username || row.pppoe_username || 'Unknown',
                        dl,
                        ul,
                        tot: (usageUnit === 'Mbps' || !usageUnit.includes(' ')) ? (Number(dl) || 0) + (Number(ul) || 0) : 0
                      };
                    }).sort((a, b) => b.tot - a.tot);

                    rows = sliceData(rows, tableLimits.pppoe);

                    return rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.dl === 'number' ? row.dl.toFixed(2) : row.dl}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.ul === 'number' ? row.ul.toFixed(2) : row.ul}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.tot === 'number' ? row.tot.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <AnalysisTable
              columns={[
                { label: 'Date', key: 'displayDate' },
                { label: 'Username', key: 'pppoe_username' },
                { label: `Total Download (${usageUnit})`, key: 'download_bytes', render: (row) => {
                  const standardized = standardizeTableData([row], 'traffic')[0];
                  const dlVal = standardized.rx || 0;
                  if (usageUnit === 'Mbps') return `${toMbps(dlVal).toFixed(2)} Mbps`;
                  if (usageUnit === 'Auto') return formatBytesAuto(dlVal);
                  return `${bytesToUnit(dlVal, usageUnit).toFixed(2)} ${usageUnit}`;
                }},
                { label: `Total Upload (${usageUnit})`, key: 'upload_bytes', render: (row) => {
                  const standardized = standardizeTableData([row], 'traffic')[0];
                  const ulVal = standardized.tx || 0;
                  if (usageUnit === 'Mbps') return `${toMbps(ulVal).toFixed(2)} Mbps`;
                  if (usageUnit === 'Auto') return formatBytesAuto(ulVal);
                  return `${bytesToUnit(ulVal, usageUnit).toFixed(2)} ${usageUnit}`;
                }},
              ]}
              rows={sliceData(filteredReportData, tableLimits.pppoe)}
            />
          )}
        </div>
      )}

      {activeTab === 'hotspot' && (
        <div className="space-y-6">
          <div className={`bg-white ${cardPadding} rounded-lg shadow`} id="trend-card-hotspot-top" data-testid="trend-card-hotspot-top">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Top Hotspot Users by Usage ({usageUnit})</h3>
              <div className="flex items-center gap-2">
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px]"
                >
                  <option value="">Semua Username Hotspot</option>
                  {nameOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="bg-gray-100 rounded-md p-1">
                  <button
                    className={`px-3 py-1.5 rounded ${hotspotTableMode === 'pivot' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setHotspotTableMode('pivot')}
                  >
                    Pivot
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded ${hotspotTableMode === 'raw' ? 'bg-white shadow ring-1 ring-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setHotspotTableMode('raw')}
                  >
                    Semua Data
                  </button>
                </div>
                <TableLimitSelector 
                  current={tableLimits.hotspot} 
                  onSelect={(val) => handleLimitChange('hotspot', val)} 
                />
              </div>
            </div>
            <SizedContainer heightClass={chartHeight}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
                <BarChart data={hotspotTopData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="downloadValue" name={`Download (${usageUnit})`} fill="#60a5fa" />
                  <Bar dataKey="uploadValue" name={`Upload (${usageUnit})`} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </SizedContainer>
          </div>
          {hotspotTableMode === 'pivot' ? (
            <div className="overflow-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Download (${usageUnit})`}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total Upload (${usageUnit})`}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{`Total (${usageUnit})`}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(function(){
                    let rows = (hotspotAnalysis || []).map(row => {
                      const dlBytes = Number(row.download_bytes ?? row.download_value ?? row.daily_download ?? 0);
                      const ulBytes = Number(row.upload_bytes ?? row.upload_value ?? row.daily_upload ?? 0);
                      
                      // Standardized formatting
                      let dl, ul;
                      if (usageUnit === 'Mbps') {
                        dl = toMbps(dlBytes);
                        ul = toMbps(ulBytes);
                      } else if (usageUnit === 'Auto') {
                        dl = formatBytesAuto(dlBytes);
                        ul = formatBytesAuto(ulBytes);
                      } else {
                        dl = bytesToUnit(dlBytes, usageUnit);
                        ul = bytesToUnit(ulBytes, usageUnit);
                      }
                      
                      return {
                        name: row.username || row.hotspot_username || 'Unknown',
                        dl,
                        ul,
                        tot: (usageUnit === 'Mbps' || !usageUnit.includes(' ')) ? (Number(dl) || 0) + (Number(ul) || 0) : 0
                      };
                    }).sort((a, b) => b.tot - a.tot);

                    rows = sliceData(rows, tableLimits.hotspot);

                    return rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.dl === 'number' ? row.dl.toFixed(2) : row.dl}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.ul === 'number' ? row.ul.toFixed(2) : row.ul}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {typeof row.tot === 'number' ? row.tot.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <AnalysisTable
              columns={[
                { label: 'Date', key: 'displayDate' },
                { label: 'Username', key: 'username' },
                { label: `Total Download (${usageUnit})`, key: 'daily_download', render: (row) => {
                  const standardized = standardizeTableData([row], 'traffic')[0];
                  const dlVal = standardized.rx || 0;
                  if (usageUnit === 'Mbps') return `${toMbps(dlVal).toFixed(2)} Mbps`;
                  if (usageUnit === 'Auto') return formatBytesAuto(dlVal);
                  return `${bytesToUnit(dlVal, usageUnit).toFixed(2)} ${usageUnit}`;
                }},
                { label: `Total Upload (${usageUnit})`, key: 'daily_upload', render: (row) => {
                  const standardized = standardizeTableData([row], 'traffic')[0];
                  const ulVal = standardized.tx || 0;
                  if (usageUnit === 'Mbps') return `${toMbps(ulVal).toFixed(2)} Mbps`;
                  if (usageUnit === 'Auto') return formatBytesAuto(ulVal);
                  return `${bytesToUnit(ulVal, usageUnit).toFixed(2)} ${usageUnit}`;
                }},
              ]}
              rows={sliceData(filteredReportData, tableLimits.hotspot)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisTrend;
