import React from 'react';
import { ShieldCheck, AlertTriangle, Search, CheckCircle, XCircle, Info, BarChart3, Fingerprint, RefreshCw, Lock, Clock, Database, Settings } from 'lucide-react';
import { TableLimitSelector } from './components/SharedWidgets.jsx';
import { sliceData, METRIC_REGISTRY } from './analysis_utils.jsx';
import GlobalControls from './components/GlobalControls.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import MetadataAudit from './components/MetadataAudit.jsx';
import NormalizationStage from './components/NormalizationStage.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import { useAnalysisUI } from './hooks/useAnalysisUI';
import { useDataAudit } from './hooks/useDataAudit';
import { useDescriptiveStats } from './hooks/useDescriptiveStats';
import { useInsightEngine } from './hooks/useInsightEngine';
import { Link } from 'react-router-dom';

const AnalysisAudit = (props) => {
  const {
    reportData = [],
    isKpiLoading,
    gridGap,
    period,
    setPeriod,
    limit,
    setLimit,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    comparePrev,
    setComparePrev,
    granularity,
    setGranularity,
    usageUnit,
    setUsageUnit,
    corrValue,
    anomaliesList,
    resourceAnomalies,
    applyFilters,
    resetFilters,
    autoApply,
    setAutoApply,
    hasPendingChanges,
    activeTab: layoutActiveTab,
    isLocked,
    setIsLocked,
    isTimeLocked,
    currentPhase,
    setCurrentPhase,
    handleLockConfig,
    handleResetConfig,
    normalizationConfig,
    setNormalizationConfig
  } = props;

  // 1. UI Layer
  const {
    tableLimits,
    filters,
    isRefreshing,
    handleLimitChange,
    handleTriggerAggregation,
    aggMethod,
    setAggMethod,
    handleAddMapping,
    handleRemoveMapping,
    handleUpdateMapping
  } = useAnalysisUI();

  

  // Sync phase with tab
  React.useEffect(() => {
    if (layoutActiveTab === 'normalization' && currentPhase === 'analysis') {
      setCurrentPhase('exposure');
    } else if (layoutActiveTab === 'audit' && currentPhase !== 'analysis') {
      setCurrentPhase('analysis');
    }
  }, [layoutActiveTab, currentPhase, setCurrentPhase]);

  // Use normalized data from props
  const processedData = React.useMemo(() => {
    return reportData;
  }, [reportData]);

  // Filtered data available via props if needed in future

  // 2. Data Audit Layer (Validation)
  const {
    dataQuality,
    integrityAudit,
    normalizedData,
    metricMetadata
  } = useDataAudit(processedData, { startDate, endDate, granularity, normalizationConfig });

  // Use normalized data (gap-filled) for subsequent analysis ONLY if time dimension is locked/applied
  const finalAnalysisData = React.useMemo(() => {
    return (isTimeLocked && normalizedData) ? normalizedData : processedData;
  }, [isTimeLocked, normalizedData, processedData]);

  // 3. Descriptive Stats Layer
  const {
    resourceUsageStats,
    topInterfacesFixed
  } = useDescriptiveStats(finalAnalysisData, { granularity, aggMethod, period });

  // 4. Insight Engine Layer (Decision)
  const {
    methodologyAudit,
    filteredFindings
  } = useInsightEngine({
    reportData: finalAnalysisData,
    period,
    limit,
    corrValue,
    anomaliesList,
    resourceAnomalies,
    dataQuality,
    integrityAudit,
    filters,
    metricMetadata // Pass metadata to insight engine
  });

  const filteredAnomalies = dataQuality?.anomalyRows || [];

  // Sample verification removed to reduce lint noise; can be re-enabled if used

  return (
    <div className="space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800">Audit & Filter</h2>
            <p className="text-xs text-gray-500 font-medium">
              Tahap Audit: atur scope waktu & filter analisis. Normalisasi satuan ada di tab <span className="font-bold text-gray-700">Normalisasi</span>.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleTriggerAggregation}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isRefreshing 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
            }`}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Memproses...' : 'Trigger Agregasi'}
          </button>
          {/* Readiness Badge */}
          {(() => {
            const score = methodologyAudit?.readinessScore ?? 0;
            const status = methodologyAudit?.status ?? 'N/A';
            const color = score >= 100 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : score >= 80 
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
            return (
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border ${color}`} title="Readiness Score">
                <BarChart3 size={12} />
                Readiness: {score}% <span className="uppercase">({status})</span>
              </span>
            );
          })()}
          <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block" />
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
            currentPhase === 'exposure' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
            currentPhase === 'analysis' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            Mode: {currentPhase === 'exposure' ? 'Raw Structural' : currentPhase === 'analysis' ? 'Analytical Ready' : 'Normalization'}
          </span>
          {isLocked && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded text-[10px] font-bold">
              <Lock size={10} /> UNIT LOCKED
            </span>
          )}
          {isTimeLocked && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
              <Clock size={10} /> TIME DIMENSION APPLIED
            </span>
          )}
          <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block" />
          <Link 
            to="/analysis/normalization"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
            title="Buka Normalisasi"
          >
            <Settings size={12} />
            Normalisasi
          </Link>
          <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block" />
          <Link 
            to="/analysis/audit"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border ${
              layoutActiveTab === 'audit' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
            title="Buka Audit"
          >
            <ShieldCheck size={12} />
            Audit
          </Link>
          <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden md:block" />
          
        </div>
      </div>

      {layoutActiveTab !== 'normalization' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <GlobalControls 
            period={period} setPeriod={setPeriod}
            limit={limit} setLimit={setLimit}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            comparePrev={comparePrev} setComparePrev={setComparePrev}
            usageUnit={usageUnit} setUsageUnit={setUsageUnit}
            aggMethod={aggMethod} setAggMethod={setAggMethod}
            granularity={granularity} setGranularity={setGranularity}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            autoApply={autoApply}
            setAutoApply={setAutoApply}
            hasPendingChanges={hasPendingChanges}
            activeTab="trend"
          />
        </div>
      )}

      {layoutActiveTab === 'normalization' && (
        <NormalizationStage 
          currentPhase={currentPhase}
          setCurrentPhase={setCurrentPhase}
          isLocked={isLocked}
          normalizationConfig={normalizationConfig}
          handleLockConfig={() => handleLockConfig(setIsLocked)}
          handleResetConfig={() => handleResetConfig(setIsLocked)}
          onStartAnalysis={() => setCurrentPhase('analysis')}
          integrityAudit={integrityAudit}
          metricMetadata={metricMetadata}
          availableFields={Array.from(new Set([
            ...Object.keys(METRIC_REGISTRY),
            ...Object.keys(reportData[0] || {}).filter(k => !['log_date', 'log_time', 'displayDate', 'is_gap', 'id', 'created_at'].includes(k))
          ])).sort()}
          handleAddMapping={(m) => handleAddMapping(m, setNormalizationConfig)}
          handleRemoveMapping={(id) => handleRemoveMapping(id, setNormalizationConfig)}
          handleUpdateMapping={(id, u) => handleUpdateMapping(id, u, setNormalizationConfig)}
        />
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-3 ${gridGap}`}>
        {/* 0. Real-time Summary */}
        <div className="relative min-h-[200px] lg:col-span-3">
          <LoadingOverlay isLoading={isKpiLoading} message="Menghitung ringkasan..." />
          <SummaryCards 
            resourceUsageStats={resourceUsageStats}
            topInterfacesFixed={topInterfacesFixed}
          aggMethod={aggMethod}
          />
        </div>

        {/* 1. Kualitas Data */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative min-h-[200px]">
          <LoadingOverlay isLoading={isKpiLoading} message="Audit kualitas data..." />
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-blue-500" />
              <h3 className="font-bold text-gray-700">Skor Kualitas</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                integrityAudit?.qualityScore?.status === 'Sehat' ? 'bg-emerald-100 text-emerald-700' :
                integrityAudit?.qualityScore?.status === 'Waspada' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }`}>
                {integrityAudit?.qualityScore?.score || 0}%
              </span>
              {integrityAudit?.qualityScore?.score > 80 ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-amber-500" />}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Densitas Data</span>
              <span className={`font-mono font-bold ${integrityAudit?.qualityScore?.density < 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {integrityAudit?.qualityScore?.density}%
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Zero Traffic Rate</span>
              <span className={`font-mono font-bold ${integrityAudit?.qualityScore?.zeroPct > 20 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {integrityAudit?.qualityScore?.zeroPct}%
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status Audit</span>
              <span className={`font-bold ${
                integrityAudit?.qualityScore?.status === 'Sehat' ? 'text-emerald-600' :
                integrityAudit?.qualityScore?.status === 'Waspada' ? 'text-amber-600' :
                'text-rose-600'
              }`}>
                {integrityAudit?.qualityScore?.status}
              </span>
            </div>
            <div className={`mt-4 p-3 rounded-lg text-[11px] leading-relaxed ${
              integrityAudit?.qualityScore?.status === 'Sehat' ? 'bg-emerald-50 text-emerald-700' :
              integrityAudit?.qualityScore?.status === 'Waspada' ? 'bg-amber-50 text-amber-700' :
              'bg-rose-50 text-rose-700'
            }`}>
              <Info size={14} className="inline mr-1 mb-0.5" />
              <strong>Kesimpulan:</strong> {integrityAudit?.qualityScore?.message}
            </div>
          </div>
        </div>

        {/* 2. Integritas Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative min-h-[200px]">
          <LoadingOverlay isLoading={isKpiLoading} message="Audit integritas timeline..." />
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint size={18} className="text-purple-500" />
              <h3 className="font-bold text-gray-700">Integritas Timeline</h3>
            </div>
            <div className="flex items-center gap-2">
              {finalAnalysisData.some(d => d.is_gap) && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black rounded uppercase">Gap Filled</span>
              )}
              {integrityAudit?.isConsistent ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-amber-500" />}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Sampel Asli / Normal</span>
              <span className="font-mono font-bold text-gray-700">
                {integrityAudit?.totalSamples} / {finalAnalysisData.length}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Interval Rata-rata</span>
              <span className="font-mono font-bold text-gray-700">
                {integrityAudit?.medianIntervalMinutes || 0} Menit
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Gaps Terdeteksi</span>
              <span className={`font-mono font-bold ${integrityAudit?.timeGaps > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {integrityAudit?.timeGaps}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Rentang Waktu</span>
              <span className="text-[11px] font-bold text-gray-600">{integrityAudit?.periodRange?.start} - {integrityAudit?.periodRange?.end}</span>
            </div>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg text-[11px] text-purple-700 leading-relaxed">
              <Info size={14} className="inline mr-1 mb-0.5" />
              <strong>Identifikasi Bias:</strong> {integrityAudit?.timeGaps > 0 ? `Terdapat gap waktu yang telah diisi dengan normalisasi temporal (Gap-Filling) untuk stabilitas grafik.` : 'Timeline kontinu, hasil analisis tren memiliki tingkat keterandalan tinggi.'}
            </div>
          </div>
        </div>

        {/* 3. Validasi Metodologi & Kesiapan Insight */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative min-h-[200px]">
          <LoadingOverlay isLoading={isKpiLoading} message="Validasi metodologi..." />
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-amber-500" />
              <h3 className="font-bold text-gray-700">Validasi Insight (Alur)</h3>
            </div>
            {methodologyAudit?.readinessScore >= 80 ? <CheckCircle size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-rose-500" />}
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Readiness Score</span>
              <span className={`font-black ${methodologyAudit?.readinessScore > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {methodologyAudit?.readinessScore}%
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Status Alur</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${methodologyAudit?.readinessScore >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {methodologyAudit?.status}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100 mt-2 space-y-1.5">
              {methodologyAudit?.readinessSteps.map((step, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400 font-medium">{step.label}</span>
                  {step.status ? <CheckCircle size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-gray-300" />}
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-[11px] text-amber-700 leading-relaxed">
              <Info size={14} className="inline mr-1 mb-0.5" />
              <strong>Alur Insight:</strong> {methodologyAudit?.readinessScore === 100 ? 'Data memenuhi standar 8 tahapan analisis insight.' : 'Pastikan minimal 7 hari data kontinu untuk validasi pola yang akurat.'}
            </div>
          </div>
        </div>
      </div>

      <MetadataAudit 
        metricMetadata={metricMetadata}
        reportData={reportData}
        processedData={processedData}
        normalizationConfig={normalizationConfig}
      />

      {/* Tabel Detail Temuan Audit */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative min-h-[200px]">
        <LoadingOverlay isLoading={isKpiLoading} message="Menganalisis temuan..." />
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Database size={18} className="text-gray-400" />
            Dokumentasi Temuan & Mitigasi Risiko
          </h3>
        <TableLimitSelector 
          current={tableLimits.findings} 
          onSelect={(val) => handleLimitChange('findings', val)} 
        />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Kategori Audit</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Identifikasi Masalah</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Mitigasi Risiko</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Tingkat Risiko</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFindings.length > 0 ? (
                sliceData(filteredFindings, tableLimits.findings).map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{row.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.issue}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.mitigation}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.riskColor}`}>
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 text-sm italic">
                    Tidak ada temuan yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Detail Anomali Data */}
      {dataQuality?.anomalyRows?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Detail Baris Anomali (Audit Log)
            </h3>
            <TableLimitSelector 
              current={tableLimits.anomalies} 
              onSelect={(val) => handleLimitChange('anomalies', val)} 
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Index</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Tanggal/Waktu</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Detail Masalah</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Severity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAnomalies.length > 0 ? (
                  sliceData(filteredAnomalies, tableLimits.anomalies).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">#{row.index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{row.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">{row.issues}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${row.severity === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {row.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 text-sm italic">
                      Tidak ada anomali yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisAudit;
