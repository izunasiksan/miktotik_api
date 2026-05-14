import React from 'react';
import { 
  FileText, Activity, Users, Download, Wifi, Network, Database, ShieldCheck, AlertCircle, TrendingUp, Zap 
} from 'lucide-react';
import { useAnalysisData } from './hooks/useAnalysisData.jsx';
import { getSuggestedTimeInfo } from './analysis_utils.jsx';

// Modular Components
import HealthScoreCard from './components/HealthScoreCard.jsx';
import TodayTrafficCard from './components/TodayTrafficCard.jsx';
import TrafficKpiCard from './components/TrafficKpiCard.jsx';
import DataQualityAlert from './components/DataQualityAlert.jsx';
import GlobalControls from './components/GlobalControls.jsx';
import RcaCard from './components/RcaCard.jsx';
import ForecastingCard from './components/ForecastingCard.jsx';
import CorrelationCard from './components/CorrelationCard.jsx';
import InterfacePerformanceCard from './components/InterfacePerformanceCard.jsx';
import TopUsageCard from './components/TopUsageCard.jsx';
import HeatmapCard from './components/HeatmapCard.jsx';
import BaselineDeviationCard from './components/BaselineDeviationCard.jsx';
import TopConsumerGrowthCard from './components/TopConsumerGrowthCard.jsx';
import TrafficOverviewCard from './components/TrafficOverviewCard.jsx';
import ResourceUsageCard from './components/ResourceUsageCard.jsx';

import LoadingOverlay from './components/LoadingOverlay.jsx';

/**
 * AnalysisInsight - Main dashboard for network insights.
 * Fully integrated with backend heavy aggregation.
 * Follows the rule: Pecah component besar menjadi beberapa sub-component kecil.
 */
const AnalysisInsight = ({
  activeTab,
  setActiveTab,
  cardPadding,
  gridGap,
  isCompact,
  usageUnit,
  setUsageUnit,
  reportRows = [],
  heavyAnalysis,
  isHeavyLoading,
  analysisSummary,
  isSummaryLoading,
  interfaceAnalysis,
  isInterfaceLoading,
  corrValue,
  period,
  setPeriod,
  limit,
  setLimit,
  pivotAgg,
  setPivotAgg,
  aggMethod,
  setAggMethod,
  bucketSource,
  setBucketSource,
  serverBuckets,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  comparePrev,
  setComparePrev,
  granularity,
  setGranularity,
  isKpiLoading,
  applyFilters,
  resetFilters,
  autoApply,
  setAutoApply,
  hasPendingChanges
}) => {
  const { scopeLabel, granularityLabel } = getSuggestedTimeInfo(period, limit, startDate, endDate, granularity);

  // Use custom hook for all derivations
  const {
    totals,
    p95Bytes,
    p99Bytes,
    peakBytes,
    totalBytes,
    totalDelta,
    p95Delta,
    p99Delta,
    healthScore,
    rcaData,
    forecast,
    dataQuality,
    topGrowthUsers,
    trafficTrendData,
    resourceTrendData,
    todayTraffic
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

  const isLoading = isKpiLoading || isHeavyLoading || isSummaryLoading;

  if (!isLoading && (!reportRows || reportRows.length === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6">
          <Activity className="text-blue-500" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Data Belum Tersedia</h2>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">Tidak ditemukan data historis untuk rentang waktu saat ini. Sesuaikan filter atau tunggu proses pengumpulan data.</p>
      </div>
    );
  }
  if (!isLoading && (!reportRows || reportRows.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
        <div className="bg-gray-50 p-6 rounded-full mb-6 border border-gray-100 shadow-inner relative">
          <LoadingOverlay isLoading={isLoading} message="Mengecek ketersediaan data..." />
          <Database className="text-gray-300 h-12 w-12" />
        </div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">Data Tidak Ditemukan</h3>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Belum ada data statistik terkumpul untuk perangkat ini dalam periode {period === 'daily' ? '30 hari' : '12 bulan'} terakhir.
        </p>
        <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full mx-auto max-w-fit">
          <Zap size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Pure Historical Data (No Live API)</span>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Refresh
          </button>
          <button 
            onClick={() => setPeriod(period === 'daily' ? 'monthly' : 'daily')}
            className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-md"
          >
            Coba Periode {period === 'daily' ? 'Bulanan' : 'Harian'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Badge */}
      <div className="flex items-center justify-between mb-2">
        <div></div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
          <Zap size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Pure Historical Data (No Live API)</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
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
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`mr-2 h-4 w-4 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Quality Alert & Controls */}
          <DataQualityAlert 
            score={dataQuality.score} 
            missing={dataQuality.missing} 
            reportRowsCount={reportRows.length}
            onDetailClick={() => setActiveTab('audit')}
          />

          <GlobalControls 
            period={period} setPeriod={setPeriod}
            limit={limit} setLimit={setLimit}
            pivotAgg={pivotAgg} setPivotAgg={setPivotAgg}
            activeTab="trend" // Always show granularity in insight
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

          {/* KPI Cards Row */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${gridGap}`}>
            <HealthScoreCard score={healthScore} isLoading={isKpiLoading} />
            <TodayTrafficCard todayTraffic={todayTraffic} usageUnit={usageUnit} isLoading={isKpiLoading} />
            <TrafficKpiCard title="P95 Traffic" value={p95Bytes} delta={p95Delta} totals={totals} usageUnit={usageUnit} isLoading={isKpiLoading} />
            <TrafficKpiCard title="Peak Traffic" value={peakBytes} totals={totals} usageUnit={usageUnit} isLoading={isKpiLoading} />
            <TrafficKpiCard title="Total Traffic" value={totalBytes} delta={totalDelta} totals={totals} usageUnit={usageUnit} isLoading={isKpiLoading} />
            <TrafficKpiCard title="P99 Traffic" value={p99Bytes} delta={p99Delta} totals={totals} usageUnit={usageUnit} isLoading={isKpiLoading} />
          </div>

          {/* Core Charts Row */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
            <div className="relative min-h-[300px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Memproses tren trafik..." />
              <TrafficOverviewCard 
                id="insight-traffic-overview"
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
              <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis penggunaan resource..." />
              <ResourceUsageCard 
                id="insight-resource-usage"
                data={resourceTrendData} 
                isCompact={isCompact} 
                cardPadding={cardPadding} 
                scopeLabel={scopeLabel}
                granularityLabel={granularityLabel}
                isLoading={isKpiLoading}
              />
            </div>
          </div>

          {/* Advanced Insights Row 1 */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isHeavyLoading} message="Menjalankan Root Cause Analysis..." />
              <RcaCard rcaData={rcaData} isLoading={isHeavyLoading} />
            </div>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isHeavyLoading} message="Menghitung prediksi trafik..." />
              <ForecastingCard forecast={forecast} isLoading={isHeavyLoading} />
            </div>
          </div>

          {/* Advanced Insights Row 2 */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 ${gridGap}`}>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isHeavyLoading} message="Menganalisis korelasi data..." />
              <CorrelationCard corrValue={corrValue} isLoading={isHeavyLoading} />
            </div>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isInterfaceLoading} message="Audit performa interface..." />
              <InterfacePerformanceCard interfaceAnalysis={interfaceAnalysis} isLoading={isInterfaceLoading} />
            </div>
          </div>

          {/* Deep Analysis Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Ranking top usage..." />
              <TopUsageCard reportRows={reportRows} period={period} usageUnit={usageUnit} isLoading={isKpiLoading} />
            </div>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Membangun heatmap..." />
              <HeatmapCard totals={totals} usageUnit={usageUnit} isLoading={isKpiLoading} />
            </div>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Cek deviasi baseline..." />
              <BaselineDeviationCard totals={totals} isLoading={isKpiLoading} />
            </div>
            <div className="relative min-h-[200px]">
              <LoadingOverlay isLoading={isKpiLoading} message="Deteksi pertumbuhan user..." />
              <TopConsumerGrowthCard topGrowthUsers={topGrowthUsers} usageUnit={usageUnit} isLoading={isKpiLoading} />
            </div>
          </div>
        </div>
      )}

      {/* Fallback for other tabs - these are usually rendered by the parent but we can provide placeholders or pass through */}
      {activeTab !== 'summary' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Activity className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700">Detail {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
          <p className="text-sm text-gray-400">Gunakan filter di atas untuk menyesuaikan tampilan data.</p>
          <div className="mt-8">
             {/* Content usually injected via props like renderTrafficOverview */}
             {activeTab === 'traffic' && (
               <TrafficOverviewCard 
                 id="insight-traffic-overview-detail"
                 data={trafficTrendData} 
                 usageUnit={usageUnit} 
                 isCompact={false} 
                 cardPadding="p-6" 
               />
             )}
             {activeTab === 'resource' && (
               <ResourceUsageCard 
                 id="insight-resource-usage-detail"
                 data={resourceTrendData} 
                 isCompact={false} 
                 cardPadding="p-6" 
               />
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisInsight;
