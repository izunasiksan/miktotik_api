import React, { useEffect } from 'react';
import { useAnalysisStore } from '../../../store/analysisStore';
import { useAnalysisTaskPolling } from '../hooks/useAnalysisTaskPolling';
import DataQualityAlert from './molecules/DataQualityAlert';
import NormalizationStage from './molecules/NormalizationStage';
import ScopeFilterStage from './molecules/ScopeFilterStage';
import TrendChart from './molecules/TrendChart';
import CorrelationMatrix from './molecules/CorrelationMatrix';
import HabitPatternAnalysis from './molecules/HabitPatternAnalysis';
import AnomalyAnalysis from './molecules/AnomalyAnalysis';
import CapacityForecast from './molecules/CapacityForecast';
import InsightCard from './molecules/InsightCard';
import ErrorBoundary from '../../../components/molecules/ErrorBoundary';
import { Play } from 'lucide-react';
import toast from 'react-hot-toast';

const AnalysisV2 = () => {
  const { 
    analysisData, 
    taskStatus
  } = useAnalysisStore();

  // Custom Polling Hook
  useAnalysisTaskPolling();

  useEffect(() => {
    if (taskStatus === 'SUCCESS') {
      toast.dismiss('analysis-task');
    }
  }, [taskStatus]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analisis Pipeline V2.1</h1>
        <p className="text-slate-500 mt-1">Sistem audit analitik berbasis Raw Data (SSOT) & Context Locking</p>
      </div>

      {/* Stage 0: Normalization Preview */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Stage 0</span>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Normalisasi & Data Quality</h2>
        </div>
        <NormalizationStage />
        <DataQualityAlert />
      </section>

      {/* Stage 1: Scope & Filter (Context Lock) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Stage 1</span>
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Scope & Context Lock</h2>
        </div>
        <ScopeFilterStage />
      </section>

      {/* Pipeline Output (Stage 2-7) */}
      <section className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 px-1">
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Output</span>
          <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Analysis Results (Stage 2-7)</h2>
        </div>

        {analysisData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorBoundary>
                <div id="trend-section">
                  <TrendChart />
                </div>
              </ErrorBoundary>
              <ErrorBoundary>
                <div id="correlation-section">
                  <CorrelationMatrix />
                </div>
              </ErrorBoundary>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorBoundary>
                <div id="habit-section">
                  <HabitPatternAnalysis />
                </div>
              </ErrorBoundary>
              <ErrorBoundary>
                <div id="anomaly-section">
                  <AnomalyAnalysis />
                </div>
              </ErrorBoundary>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorBoundary>
                <div id="forecast-section">
                  <CapacityForecast />
                </div>
              </ErrorBoundary>
              <ErrorBoundary>
                <div id="insight-section">
                  <InsightCard />
                </div>
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl h-96 flex flex-col items-center justify-center text-slate-400 space-y-4 shadow-sm">
            <div className="p-4 bg-slate-50 rounded-full shadow-inner">
              <Play className="w-8 h-8 text-slate-300 fill-current" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-slate-600">Pipeline Belum Dijalankan</h3>
              <p className="text-sm max-w-xs mx-auto">Tentukan scope di Stage 1 dan jalankan pipeline untuk melihat hasil audit mendalam.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AnalysisV2;
