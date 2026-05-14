import React, { useState } from 'react';
import { useContextLockStore, useAnalysisStore } from '../../../../store/analysisStore';
import { postNormalizationPreview } from '../../../../services/api';
import { RefreshCw, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Molecule: NormalizationStage
 * Menangani Stage 0: Normalization Preview & Data Quality Validation.
 * Bermigrasi ke Atomic Design.
 */
const NormalizationStage = () => {
  const { selectedBoardId, selectedInterfaceName, timeRange, granularity, isLocked } = useContextLockStore();
  const { setNormalizationStatus, setNormalizationData, setNormalizationUsers, setError, error: globalError } = useAnalysisStore();
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
      setError(null); // Reset global error state
      // UPDATE 2.4.1: Reset data preview lama sebelum fetch baru
      setNormalizationData(null); 
      setNormalizationUsers(null); 
      
      // V2.3: Use full ISO 8601 string, backend now handles it. Support camelCase.
      const payload = {
        boardId: selectedBoardId,
        interfaceName: selectedInterfaceName, // V2.4.1: Send interface filter
        startTime: timeRange.start,
        endTime: timeRange.end,
        granularity: ['auto','year','month','day','hour'].includes(granularity) ? granularity : 'hour',
        agg: 'avg',
        bucketSource: 'server',
        usageUnit: 'Mbps',
        fillGaps: true
      };
      const data = await postNormalizationPreview(payload);
      
      // V2.3: Standardized metadata structure from backend (Support camelCase)
      const meta = data?.metadata || {};
      const accuracy = typeof data?.accuracy_pct === 'number' 
        ? data.accuracy_pct 
        : (typeof meta?.accuracy_pct === 'number' ? meta.accuracy_pct : 0);

      setNormalizationStatus({
        accuracyPct: accuracy,
        status: 'SUCCESS',
        missingGaps: meta?.gap_count || 0,
      });

      setNormalizationData(data); // UPDATE 2.4.1: Simpan data mentah untuk ditampilkan di tabel
      
      // V2.4.1 Added: Simpan data users (hotspot/pppoe) jika tersedia
      if (data?.users) {
        setNormalizationUsers(data.users);
      }

      setPreviewMeta({
        validCount: meta?.validCount ?? meta?.valid_count ?? 0,
        droppedCount: meta?.droppedCount ?? meta?.dropped_count ?? 0,
        gapCount: meta?.gapCount ?? meta?.gap_count ?? 0,
        gapCountTotal: meta?.gapCountTotal ?? meta?.gap_count_total ?? (meta?.gap_count ?? 0),
        gapCountUnique: meta?.gapCountUnique ?? meta?.gap_count_unique ?? (meta?.gap_count ?? 0),
        sampleSize: meta?.sampleSize ?? meta?.sample_size ?? (Array.isArray(data?.traffic) ? data.traffic.length : 0),
        accuracyPct: accuracy,
        gapAnalysis: meta?.gapAnalysis ?? meta?.gap_analysis ?? null,
      });
      toast.success('Preview normalisasi berhasil');
    } catch (error) {
      console.error('[NormalizationStage Error]', error);
      const msg = error.response?.data?.detail || 'Gagal melakukan preview normalisasi';
      setError(msg); // Keep global error for the retry UI
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

  const b = badge(previewMeta?.accuracyPct ?? null);

  return (
    <div className="space-y-4">
      {/* Global Error Display */}
      {globalError && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-800">Error Stage 0</h4>
            <p className="text-xs text-rose-600 mt-1">{globalError}</p>
          </div>
          <button 
            onClick={() => { setError(null); runPreview(); }}
            className="text-rose-400 hover:text-rose-600 transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all ${isLocked ? 'opacity-70' : 'hover:shadow-md group'} ${globalError ? 'border-rose-100 opacity-50 pointer-events-none' : ''}`}>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Accuracy Score</p>
              <div className="flex items-center gap-2">
                <b.Icon className={`w-4 h-4 ${b.cls.split(' ')[1]}`} />
                <span className={`text-sm font-black ${b.cls.split(' ')[1]}`}>
                  {previewMeta.accuracyPct ?? 0}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sample Size</p>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-black text-slate-700">
                  {previewMeta.sampleSize ?? 0}
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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gaps (Total / Unique)</p>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-black text-slate-700">
                  {previewMeta.gapCountTotal ?? 0} / {previewMeta.gapCountUnique ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* V2.4.2: Gap Analysis Insights */}
        {previewMeta?.gapAnalysis && !loading && (
          <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-amber-100 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Gap Analysis Insights</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['traffic', 'resource', 'users'].map((category) => {
                // Handle nested structure from backend (traffic -> rx/tx, resource -> cpu/mem, users -> hs/pp)
                const catData = previewMeta.gapAnalysis[category];
                if (!catData) return null;

                // Flatten metrics for easy display
                const metrics = category === 'traffic' ? ['rx', 'tx'] : 
                               category === 'resource' ? ['cpu', 'mem'] : 
                               ['hs', 'pp'];

                return (
                  <div key={category} className="space-y-2">
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-[0.1em] border-b border-amber-200/50 pb-1">{category}</p>
                    {metrics.map(m => {
                      const ana = catData[m];
                      if (!ana) return null;
                      return (
                        <div key={m} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-amber-800 uppercase">{m}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ana.imputation_possible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {ana.imputation_possible ? 'IMPUTABLE' : 'UNANCHORED'}
                            </span>
                          </div>
                          <div className="flex gap-2 text-[9px] text-amber-600 font-medium">
                            <span>Gaps: <b>{ana.gap_count}</b></span>
                            <span>Max: <b>{ana.max_gap_length}</b></span>
                            <span>Avg: <b>{ana.avg_gap_length?.toFixed(1)}</b></span>
                          </div>
                          {!ana.has_anchor_before && !ana.has_anchor_after && ana.gap_count > 0 && (
                            <p className="text-[8px] text-rose-500 font-bold italic leading-tight">
                              * No anchors found. Linear interpolation will fallback to zero.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NormalizationStage;
