import React, { useEffect, useState } from 'react';
import { useAnalysisStore } from '../../../store/analysisStore';
import { useAnalysisTaskPolling } from '../hooks/useAnalysisTaskPolling';
import DataQualityAlert from './molecules/DataQualityAlert';
import NormalizationStage from './molecules/NormalizationStage';
import NormalizationPreviewTable from './organisms/NormalizationPreviewTable'; // UPDATE 2.4.1: Import tabel preview
import ScopeFilterStage from './molecules/ScopeFilterStage';
import TrendChart from './molecules/TrendChart';
import CorrelationMatrix from './molecules/CorrelationMatrix';
import HabitPatternAnalysis from './molecules/HabitPatternAnalysis';
import AnomalyAnalysis from './molecules/AnomalyAnalysis';
import CapacityForecast from './molecules/CapacityForecast';
import InsightCard from './molecules/InsightCard';
import ErrorBoundary from '../../../components/molecules/ErrorBoundary';
import LoadingSpinner from '../../../components/atoms/LoadingSpinner'; // UPDATE 2.4.1: Import LoadingSpinner
import Tabs from '../../../components/molecules/Tabs';
import { Play } from 'lucide-react';
import toast from 'react-hot-toast';

const AnalysisV2 = () => {
  const { 
    analysisData, 
    taskStatus,
    progress,
    currentStage
  } = useAnalysisStore();
  const [activeStage, setActiveStage] = useState('stage1');

  const stageTabs = [
    { id: 'stage1', label: 'Stage 1 · Scope & Lock' },
    { id: 'stage2', label: 'Stage 2 · Trend' },
    { id: 'stage3', label: 'Stage 3 · Correlation' },
    { id: 'stage4', label: 'Stage 4 · Habit Pattern' },
    { id: 'stage5', label: 'Stage 5 · Anomaly' },
    { id: 'stage6', label: 'Stage 6 · Capacity' },
    { id: 'stage7', label: 'Stage 7 · Insights' }
  ];

  // Custom Polling Hook
  useAnalysisTaskPolling();

  const isProcessing = taskStatus === 'PENDING' || taskStatus === 'STARTED' || taskStatus === 'PROGRESS';

  const renderStageContent = (stageId) => {
    if (!analysisData) {
      if (isProcessing) {
        return (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl h-96 flex flex-col items-center justify-center text-slate-400 space-y-4 shadow-sm">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <h3 className="font-semibold text-slate-600">Menjalankan Pipeline Audit...</h3>
              <p className="text-sm max-w-xs mx-auto text-slate-400 mt-2">
                Pipeline sedang memproses Stage 2-7 secara asinkron. Jangan tutup halaman ini.
              </p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-full border border-indigo-100 animate-pulse">
                  {currentStage || 'Calculating Statistics'}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl h-96 flex flex-col items-center justify-center text-slate-400 space-y-4 shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full shadow-inner">
            <Play className="w-8 h-8 text-slate-300 fill-current" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-slate-600">Pipeline Belum Dijalankan</h3>
            <p className="text-sm max-w-xs mx-auto">Tentukan scope di Stage 1 dan jalankan pipeline untuk melihat hasil audit mendalam.</p>
          </div>
        </div>
      );
    }

    if (stageId === 'stage2') {
      return (
        <ErrorBoundary moduleName="Trend Exploration (Stage 2)">
          <div id="trend-section">
            <TrendChart />
          </div>
        </ErrorBoundary>
      );
    }
    if (stageId === 'stage3') {
      return (
        <ErrorBoundary moduleName="Correlation Matrix (Stage 3)">
          <div id="correlation-section">
            <CorrelationMatrix />
          </div>
        </ErrorBoundary>
      );
    }
    if (stageId === 'stage4') {
      return (
        <ErrorBoundary moduleName="Habit Pattern (Stage 4)">
          <div id="habit-section">
            <HabitPatternAnalysis />
          </div>
        </ErrorBoundary>
      );
    }
    if (stageId === 'stage5') {
      return (
        <ErrorBoundary moduleName="Anomaly Detection (Stage 5)">
          <div id="anomaly-section">
            <AnomalyAnalysis />
          </div>
        </ErrorBoundary>
      );
    }
    if (stageId === 'stage6') {
      return (
        <ErrorBoundary moduleName="Capacity Forecast (Stage 6)">
          <div id="forecast-section">
            <CapacityForecast />
          </div>
        </ErrorBoundary>
      );
    }
    if (stageId === 'stage7') {
      return (
        <ErrorBoundary moduleName="Strategic Insights (Stage 7)">
          <div id="insight-section">
            <InsightCard />
          </div>
        </ErrorBoundary>
      );
    }
    return null;
  };

  useEffect(() => {
    if (taskStatus === 'SUCCESS') {
      toast.dismiss('analysis-task');
    }
  }, [taskStatus]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analisis Pipeline V2.1</h1>
          <p className="text-slate-500 mt-1">Sistem audit analitik berbasis Raw Data (SSOT) & Context Locking</p>
        </div>
        
        {isProcessing && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm min-w-[240px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider animate-pulse">
                {currentStage || 'Processing Pipeline...'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stage 0: Normalization Preview */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Stage 0</span>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Normalisasi & Data Quality</h2>
        </div>
        <NormalizationStage />
        <NormalizationPreviewTable /> {/* UPDATE 2.4.1: Tampilkan tabel preview data */}
        <DataQualityAlert />
      </section>

      <section className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 px-1">
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Stages</span>
          <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Analysis Results (Stage 1-7)</h2>
        </div>

        <Tabs items={stageTabs} activeId={activeStage} onChange={setActiveStage} busy={isProcessing} ariaLabel="Analysis stages" />

        <div className="mt-4 space-y-4">
          <div
            id="panel-stage1"
            role="tabpanel"
            aria-labelledby="tab-stage1"
            className={activeStage === 'stage1' ? 'block' : 'hidden'}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Stage 1</span>
                <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Scope & Context Lock</h2>
              </div>
              <ScopeFilterStage />
            </div>
          </div>

          {['stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7'].map((stageId) => (
            <div
              key={stageId}
              id={`panel-${stageId}`}
              role="tabpanel"
              aria-labelledby={`tab-${stageId}`}
              className={activeStage === stageId ? 'block' : 'hidden'}
            >
              {renderStageContent(stageId)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AnalysisV2;
