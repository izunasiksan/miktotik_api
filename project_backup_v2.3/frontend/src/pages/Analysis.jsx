import React, { useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { normalizeRawData, fillGaps } from './analysis/analysis_utils.jsx';

import AnalysisAnomali from './analysis/analysis_anomali.jsx';
import AnalysisKapasitas from './analysis/analysis_kapasitas.jsx';
import AnalysisKorelasi from './analysis/analysis_korelasi.jsx';
import AnalysisInsight from './analysis/analysis_insight.jsx';
import AnalysisTrend from './analysis/analysis_trend.jsx';
import AnalysisKebiasaan from './analysis/analysis_kebiasaan.jsx';
import AnalysisAudit from './analysis/analysis_audit.jsx';

import { useAnalysisController } from './analysis/hooks/useAnalysisController.js';
import AnalysisLayout from './analysis/components/AnalysisLayout.jsx';
import AnalysisTable from './analysis/components/AnalysisTable.jsx';

const Analysis = () => {
  const controller = useAnalysisController();
  const {
    activeTab, boards, selectedBoard, setSelectedBoard, isCompact, setIsCompact,
    isBoardsLoading, isBoardsError, isKpiError, isHeavyError, isSummaryError, isInterfaceError,
    usageUnit, setUsageUnit, innerActiveTab, setInnerActiveTab, nameFilter, setNameFilter,
    reportData: rawReportData, filteredReportData: rawFilteredReportData,
    clientsTableMode, setClientsTableMode,
    clientsChartStacked, setClientsChartStacked, latestClientCounts, nameOptions,
    clientsChartData, interfacesTableMode, setInterfacesTableMode, pppoeTableMode,
    setPppoeTableMode, hotspotTableMode, setHotspotTableMode, period, setPeriod,
    limit, setLimit, pivotAgg, setPivotAgg, startDate, setStartDate, endDate, setEndDate,
    comparePrev, setComparePrev, granularity, setGranularity, autoApply, setAutoApply, aggMethod, setAggMethod,
    heavyAnalysis, isHeavyLoading, analysisSummary,
    isSummaryLoading, interfaceAnalysis, isInterfaceLoading, corrValue, pppoeAnalysis,
    hotspotAnalysis, clientsAnalysis, bucketSource, setBucketSource, serverBuckets,
    resourceAnomalies, isKpiLoading, isPppoeLoading, isHotspotLoading, isClientsLoading,
    applyFilters, resetFilters, hasPendingChanges, isLocked, setIsLocked, normalizationConfig, setNormalizationConfig,
    isTimeLocked, setIsTimeLocked, currentPhase, setCurrentPhase, handleLockConfig, handleTimeLock, handleResetConfig,
    interfaceTopData, pppoeTopData, hotspotTopData, trafficSeries, capacityStats, anomaliesList
  } = controller;

  // 1. Stage 2: Normalization (Unit Conversion)
  const normalizedData = useMemo(() => {
    if (!rawReportData) return [];
    if (!isLocked) return rawReportData;
    return normalizeRawData(rawReportData, normalizationConfig);
  }, [rawReportData, isLocked, normalizationConfig]);

  const normalizedFilteredData = useMemo(() => {
    if (!rawFilteredReportData) return [];
    if (!isLocked) return rawFilteredReportData;
    return normalizeRawData(rawFilteredReportData, normalizationConfig);
  }, [rawFilteredReportData, isLocked, normalizationConfig]);

  // 2. Stage 4: Gap Filling & Time Standardization
  const finalAnalysisData = useMemo(() => {
    if (!normalizedData || normalizedData.length === 0) return [];
    if (!isTimeLocked || !startDate || !endDate) return normalizedData;
    
    try {
      return fillGaps(normalizedData, startDate, endDate, granularity);
    } catch {
      // Fallback if gap-filling fails
      return normalizedData;
    }
  }, [normalizedData, isTimeLocked, startDate, endDate, granularity]);

  const finalFilteredData = useMemo(() => {
    if (!normalizedFilteredData || normalizedFilteredData.length === 0) return [];
    if (!isTimeLocked || !startDate || !endDate) return normalizedFilteredData;
    
    try {
      return fillGaps(normalizedFilteredData, startDate, endDate, granularity);
    } catch {
      return normalizedFilteredData;
    }
  }, [normalizedFilteredData, isTimeLocked, startDate, endDate, granularity]);

  

  const isAnyLoading = isKpiLoading || isHeavyLoading || isSummaryLoading || isInterfaceLoading || isPppoeLoading || isHotspotLoading || isClientsLoading;

  const cardPadding = isCompact ? 'p-3' : 'p-4';
  const chartHeight = isCompact ? 'h-56' : 'h-64';
  const gridGap = isCompact ? 'gap-4' : 'gap-6';

  // Effect to show error toast
  useEffect(() => {
    if (isBoardsError) toast.error("Gagal memuat daftar perangkat");
    if (isKpiError) toast.error("Gagal memuat data analisis");
    if (isHeavyError) toast.error("Gagal memuat data analisis mendalam");
    if (isSummaryError) toast.error("Gagal memuat ringkasan harian");
    if (isInterfaceError) toast.error("Gagal memuat analisis interface");
  }, [isBoardsError, isKpiError, isHeavyError, isSummaryError, isInterfaceError]);

  const openPivotDialog = (type) => {
    toast(`Fitur pivot untuk ${type} akan segera hadir`, { icon: '🚧' });
  };

  return (
    <AnalysisLayout
      activeTab={activeTab}
      boards={boards}
      selectedBoard={selectedBoard}
      setSelectedBoard={setSelectedBoard}
      isCompact={isCompact}
      setIsCompact={setIsCompact}
      isBoardsLoading={isBoardsLoading}
      isLocked={isLocked}
      isTimeLocked={isTimeLocked}
    >
      {(isKpiError || isHeavyError || isSummaryError || isInterfaceError) && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold">
            Terjadi kesalahan saat memuat data analisis. Coba ulangi atau sesuaikan filter.
          </div>
        </div>
      )}
      {/* Global Loading Progress Bar */}
      {isAnyLoading && selectedBoard && (
        <div className="fixed top-16 left-0 w-full h-1 z-50 overflow-hidden bg-blue-50">
          <div className="h-full bg-blue-600 animate-progress origin-left"></div>
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {(activeTab === 'normalization' || activeTab === 'audit') && (
           <AnalysisAudit 
             activeTab={activeTab}
             reportData={finalAnalysisData} 
             isKpiLoading={isKpiLoading}
             cardPadding={cardPadding} 
             gridGap={gridGap}
             usageUnit={usageUnit}
             setUsageUnit={setUsageUnit}
             period={period}
             setPeriod={setPeriod}
             limit={limit}
             setLimit={setLimit}
             startDate={startDate}
             setStartDate={setStartDate}
             endDate={endDate}
             setEndDate={setEndDate}
             comparePrev={comparePrev}
             setComparePrev={setComparePrev}
             granularity={granularity}
             setGranularity={setGranularity}
             heavyAnalysis={heavyAnalysis}
             analysisSummary={analysisSummary}
             anomaliesList={anomaliesList}
             resourceAnomalies={resourceAnomalies}
             corrValue={corrValue}
             isHeavyLoading={isHeavyLoading}
             isSummaryLoading={isSummaryLoading}
             applyFilters={applyFilters}
             resetFilters={resetFilters}
             autoApply={autoApply}
             setAutoApply={setAutoApply}
             hasPendingChanges={hasPendingChanges}
             isLocked={isLocked}
             setIsLocked={setIsLocked}
             isTimeLocked={isTimeLocked}
             setIsTimeLocked={setIsTimeLocked}
             currentPhase={currentPhase}
             setCurrentPhase={setCurrentPhase}
             handleLockConfig={handleLockConfig}
             handleTimeLock={handleTimeLock}
             handleResetConfig={handleResetConfig}
             normalizationConfig={normalizationConfig}
             setNormalizationConfig={setNormalizationConfig}
           />
         )}
        {activeTab === 'insight' && (
          <AnalysisInsight
            activeTab={innerActiveTab}
            setActiveTab={setInnerActiveTab}
            cardPadding={cardPadding}
            chartHeight={chartHeight}
            gridGap={gridGap}
            isCompact={isCompact}
            usageUnit={usageUnit}
            setUsageUnit={setUsageUnit}
            reportRows={finalAnalysisData}
            heavyAnalysis={heavyAnalysis}
            isHeavyLoading={isHeavyLoading}
            analysisSummary={analysisSummary}
            isSummaryLoading={isSummaryLoading}
            interfaceAnalysis={interfaceAnalysis}
            isInterfaceLoading={isInterfaceLoading}
            corrValue={corrValue}
            period={period}
            setPeriod={setPeriod}
            limit={limit}
            setLimit={setLimit}
            pivotAgg={pivotAgg}
            setPivotAgg={setPivotAgg}
            aggMethod={aggMethod}
            setAggMethod={setAggMethod}
            bucketSource={bucketSource}
            setBucketSource={setBucketSource}
            serverBuckets={serverBuckets}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            comparePrev={comparePrev}
            setComparePrev={setComparePrev}
            granularity={granularity}
            setGranularity={setGranularity}
            isKpiLoading={isKpiLoading}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            autoApply={autoApply}
            setAutoApply={setAutoApply}
            hasPendingChanges={hasPendingChanges}
          />
        )}
        {activeTab === 'trend' && (
          <AnalysisTrend
            boardId={selectedBoard}
            activeTab={innerActiveTab}
            setActiveTab={setInnerActiveTab}
            cardPadding={cardPadding}
            chartHeight={chartHeight}
            gridGap={gridGap}
            isCompact={isCompact}
            usageUnit={usageUnit}
            setUsageUnit={setUsageUnit}
            nameFilter={nameFilter}
            setNameFilter={setNameFilter}
            nameOptions={nameOptions}
            reportData={finalAnalysisData}
            filteredReportData={finalFilteredData}
            interfaceTopData={interfaceTopData}
            pppoeTopData={pppoeTopData}
            hotspotTopData={hotspotTopData}
            interfaceAnalysis={interfaceAnalysis}
            pppoeAnalysis={pppoeAnalysis}
            hotspotAnalysis={hotspotAnalysis}
            clientsAnalysis={clientsAnalysis}
            clientsTableMode={clientsTableMode}
            setClientsTableMode={setClientsTableMode}
            clientsPivotAgg={pivotAgg}
            clientsChartStacked={clientsChartStacked}
            setClientsChartStacked={setClientsChartStacked}
            latestClientCounts={latestClientCounts}
            clientsChartData={clientsChartData}
            interfacesTableMode={interfacesTableMode}
            setInterfacesTableMode={setInterfacesTableMode}
            interfacesPivotAgg={pivotAgg}
            pppoeTableMode={pppoeTableMode}
            setPppoeTableMode={setPppoeTableMode}
            pppoePivotAgg={pivotAgg}
            hotspotTableMode={hotspotTableMode}
            setHotspotTableMode={setHotspotTableMode}
            hotspotPivotAgg={pivotAgg}
            openPivotDialog={openPivotDialog}
            period={period}
            setPeriod={setPeriod}
            limit={limit}
            setLimit={setLimit}
            pivotAgg={pivotAgg}
            setPivotAgg={setPivotAgg}
            aggMethod={aggMethod}
            setAggMethod={setAggMethod}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            comparePrev={comparePrev}
            setComparePrev={setComparePrev}
            granularity={granularity}
            bucketSource={bucketSource}
            setBucketSource={setBucketSource}
            serverBuckets={serverBuckets}
            setGranularity={setGranularity}
            reportRows={finalAnalysisData}
            heavyAnalysis={heavyAnalysis}
            analysisSummary={analysisSummary}
            isKpiLoading={isKpiLoading}
            isHeavyLoading={isHeavyLoading}
            isSummaryLoading={isSummaryLoading}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            autoApply={autoApply}
            setAutoApply={setAutoApply}
            hasPendingChanges={hasPendingChanges}
          />
        )}
        {activeTab === 'kebiasaan' && (
          <AnalysisKebiasaan
            cardPadding={cardPadding}
            chartHeight={chartHeight}
            gridGap={gridGap}
            reportData={finalAnalysisData}
            usageUnit={usageUnit}
            setUsageUnit={setUsageUnit}
            period={period}
            setPeriod={setPeriod}
            limit={limit}
            setLimit={setLimit}
            aggMethod={aggMethod}
            setAggMethod={setAggMethod}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            comparePrev={comparePrev}
            setComparePrev={setComparePrev}
            granularity={granularity}
            setGranularity={setGranularity}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            autoApply={autoApply}
            setAutoApply={setAutoApply}
            hasPendingChanges={hasPendingChanges}
          />
        )}
        {activeTab === 'anomali' && (
          <AnalysisAnomali 
            period={period} 
            setPeriod={setPeriod}
            limit={limit}
            setLimit={setLimit}
            aggMethod={aggMethod}
            setAggMethod={setAggMethod}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            comparePrev={comparePrev}
            setComparePrev={setComparePrev}
            granularity={granularity}
            setGranularity={setGranularity}
            cardPadding={cardPadding} 
            trafficSeries={trafficSeries} 
            anomaliesList={anomaliesList} 
            resourceAnomalies={resourceAnomalies}
            usageUnit={usageUnit}
            isKpiLoading={isKpiLoading}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            autoApply={autoApply}
            setAutoApply={setAutoApply}
            hasPendingChanges={hasPendingChanges}
          />
        )}
        {activeTab === 'kapasitas' && (
           <AnalysisKapasitas 
             period={period} 
             setPeriod={setPeriod}
             limit={limit}
             setLimit={setLimit}
             aggMethod={aggMethod}
             setAggMethod={setAggMethod}
             startDate={startDate}
             setStartDate={setStartDate}
             endDate={endDate}
             setEndDate={setEndDate}
             comparePrev={comparePrev}
             setComparePrev={setComparePrev}
             granularity={granularity}
             setGranularity={setGranularity}
             cardPadding={cardPadding} 
             capacityStats={capacityStats} 
             trafficSeries={trafficSeries}
             usageUnit={usageUnit}
             isKpiLoading={isKpiLoading}
             applyFilters={applyFilters}
             resetFilters={resetFilters}
             autoApply={autoApply}
             setAutoApply={setAutoApply}
             hasPendingChanges={hasPendingChanges}
           />
        )}
        {activeTab === 'korelasi' && (
          <AnalysisKorelasi 
            period={period} 
            setPeriod={setPeriod}
            limit={limit}
            setLimit={setLimit}
            aggMethod={aggMethod}
            setAggMethod={setAggMethod}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            comparePrev={comparePrev}
            setComparePrev={setComparePrev}
            granularity={granularity}
            setGranularity={setGranularity}
            cardPadding={cardPadding} 
            corrValue={corrValue} 
            reportData={finalAnalysisData}
            usageUnit={usageUnit}
            isKpiLoading={isKpiLoading}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            autoApply={autoApply}
            setAutoApply={setAutoApply}
            hasPendingChanges={hasPendingChanges}
          />
        )}
      </div>
    </AnalysisLayout>
  );
};

export default Analysis;
