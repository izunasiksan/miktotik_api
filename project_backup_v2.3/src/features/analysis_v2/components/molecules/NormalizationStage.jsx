import React, { useState } from 'react';
import { useContextLockStore, useAnalysisStore } from '../../../../store/analysisStore';
import { postNormalizationPreview } from '../../../../services/api';
import { RefreshCw, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Molecule: NormalizationStage
 * Menangani Stage 0: Normalization Preview & Data Quality Validation.
 * Bermigrasi ke Atomic Design.
 */
const NormalizationStage = () => {
  const { selectedBoardId, timeRange, granularity, isLocked } = useContextLockStore();
  const { setNormalizationStatus } = useAnalysisStore();
  const [loading, setLoading] = useState(false);
  const [previewMeta, setPreviewMeta] = useState(null);

  const runPreview = async () => {
    if (!selectedBoardId || !timeRange.start || !timeRange.end) {
      toast.error('Pilih Board dan rentang waktu terlebih dahulu');
      return;
    }
    if (isLocked) {
      toast('Konteks sedang dikunci saat proses analisis berjalan', { icon: '🔒' });
      return;
    }
    try {
      setLoading(true);
      // V2.3: Use full ISO 8601 string, backend now handles it. Support camelCase.
      const payload = {
        boardId: selectedBoardId,
        startTime: timeRange.start,
        endTime: timeRange.end,
        granularity: ['auto','year','month','day','hour'].includes(granularity) ? granularity : 'hour',
        agg: 'avg',
        bucketSource: 'server',
        usageUnit: 'Mbps',
        fillGaps: true
      };
      const data = await postNormalizationPreview(payload);
      
      // V2.3: Standardized metadata structure from backend
      const meta = data?.metadata || {};
      const accuracy = typeof data?.accuracy_pct === 'number' 
        ? data.accuracy_pct 
        : (typeof meta?.accuracy_pct === 'number' ? meta.accuracy_pct : 0);

      setNormalizationStatus({
        accuracy_pct: accuracy,
        status: 'SUCCESS',
        missing_gaps: meta?.missing_gaps || [],
      });

      setPreviewMeta({
        validCount: meta?.validCount ?? 0,
        droppedCount: meta?.droppedCount ?? 0,
        gapCount: meta?.gapCount ?? 0,
        sampleSize: Array.isArray(data?.traffic) ? data.traffic.length : 0,
        accuracy_pct: accuracy,
      });
      toast.success('Preview normalisasi berhasil');
    } catch (error) {
      console.error(error);
      toast.error('Gagal melakukan preview normalisasi');
    } finally {
      setLoading(false);
    }
  };

  const badge = (pct) => {
    if (pct == null) return { Icon: Info, cls: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Tidak diketahui' };
    if (pct < 80) return { Icon: AlertTriangle, cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Data Terbatas' };
    if (pct < 100) return { Icon: Info, cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Sebagian Terisi' };
    return { Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Data Akurat' };
  };

  const b = badge(previewMeta?.accuracy_pct ?? null);

  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all ${isLocked ? 'opacity-70' : 'hover:shadow-md group'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
              <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Normalization Preview (Stage 0)</h3>
            {isLocked && (
              <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-black border border-amber-200 uppercase tracking-tighter">
                Context Locked
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium px-0.5">Validate raw data fidelity before analysis</p>
        </div>

        {!isLocked && (
          <button 
            onClick={runPreview}
            disabled={loading}
            className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            RUN PREVIEW
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-4 py-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              Processing Raw Data Fidelity (Stage 0)
            </span>
            <span className="font-mono">In Progress...</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
              <div className="h-full bg-indigo-500 animate-[progress_2s_ease-in-out_infinite] w-1/3 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.5)]"></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Retrieving SSOT</span>
              <span>Validating Time-Series</span>
              <span>Calculating Accuracy</span>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes progress {
              0% { transform: translateX(-100%); width: 20%; }
              50% { width: 50%; }
              100% { transform: translateX(450%); width: 20%; }
            }
          `}} />
        </div>
      )}

      {previewMeta && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Accuracy Score</p>
            <div className="flex items-center gap-2">
              <b.Icon className={`w-4 h-4 ${b.cls.split(' ')[1]}`} />
              <span className={`text-sm font-black ${b.cls.split(' ')[1]}`}>
                {previewMeta.accuracy_pct}%
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Valid Samples</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-black text-slate-700">
                {previewMeta.validCount ?? 0}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dropped (Noise)</p>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-black text-slate-700">
                {previewMeta.droppedCount ?? 0}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gaps (Filled)</p>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-black text-slate-700">
                {previewMeta.gapCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NormalizationStage;
