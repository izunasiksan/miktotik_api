import React from 'react';
import { Zap, Info, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAnalysisStore } from '../../../../store/analysisStore';

/**
 * CorrelationMatrix (Stage 3) - V2.1
 * Menampilkan hubungan statistik (Pearson Correlation) antar variabel metrik.
 * Mengikuti prinsip HIGH-RES ALIGNMENT & DEEP TRACEABILITY.
 */
const CorrelationMatrix = () => {
  const { analysisData } = useAnalysisStore();
  
  if (!analysisData || !analysisData.stage3) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-96 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="p-3 bg-slate-50 rounded-full">
          <Zap className="w-8 h-8 text-slate-200" />
        </div>
        <p className="italic text-sm">Data Korelasi (Stage 3) tidak tersedia</p>
      </div>
    );
  }

  const { matrix, metrics, metadata = {} } = analysisData.stage3;

  const getCorrelationColor = (val) => {
    if (val === null || val === undefined) return 'bg-slate-50 text-slate-300 border-slate-100';
    const absVal = Math.abs(val);
    if (absVal >= 0.7) return val > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100';
    if (absVal >= 0.4) return val > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-slate-50 text-slate-500 border-slate-200';
  };

  const getCorrelationLabel = (val, n) => {
    if (n !== undefined && n < 5) return 'Data Minim';
    if (val === null || val === undefined) return 'N/A';
    const absVal = Math.abs(val);
    if (absVal >= 0.7) return 'Kuat';
    if (absVal >= 0.4) return 'Sedang';
    if (absVal > 0) return 'Lemah';
    return 'Nol';
  };

  const formatMetricName = (name) => {
    return name
      .replace('board_', '')
      .replace('_stats', '')
      .replace('_usage', '')
      .replace(/_/g, ' ')
      .toUpperCase();
  };

  // Metadata Traceability (V2.1)
  const accuracyPct = metadata.accuracy_pct ?? 100;
  const isHighAccuracy = accuracyPct >= 95;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Korelasi Metrik (Stage 3)</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Pearson Coefficient (r)
              </span>
              <span className="text-slate-300">|</span>
              <span className={`text-[10px] flex items-center gap-1 ${isHighAccuracy ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}`}>
                <ShieldCheck className={`w-3 h-3 ${isHighAccuracy ? 'text-emerald-500' : 'text-amber-500'}`} /> 
                Akurasi: {accuracyPct}%
              </span>
            </div>
          </div>
        </div>
        <div className="group relative">
          <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-indigo-600 transition-colors" />
          <div className="absolute right-0 top-8 w-72 p-4 bg-slate-900 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 leading-relaxed shadow-2xl border border-slate-800">
            <p className="font-bold text-indigo-400 mb-2 uppercase tracking-wider">Pearson Correlation (r)</p>
            <p className="mb-3 text-slate-300">Mengukur hubungan linier antar metrik menggunakan <strong>Raw Data Alignment</strong> (High-Res Sync).</p>
            <div className="space-y-1.5 border-t border-slate-800 pt-2">
              <div className="flex justify-between"><span>0.7 - 1.0</span> <span className="text-emerald-400 font-bold">Kuat (Sesuai)</span></div>
              <div className="flex justify-between"><span>0.4 - 0.7</span> <span className="text-indigo-400 font-bold">Sedang</span></div>
              <div className="flex justify-between"><span>0.0 - 0.4</span> <span className="text-slate-400 font-bold">Lemah / Tidak Ada</span></div>
              <div className="flex justify-between text-rose-400 font-medium mt-1 italic"><span>Nilai Negatif (-)</span> <span>Hubungan Terbalik</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="p-6 flex-1 overflow-auto">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 p-2 text-left bg-white/95 backdrop-blur-sm">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">METRICS</span>
                </th>
                {metrics.map(m => (
                  <th key={m} className="p-2 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight vertical-text transform -rotate-180 h-24 flex items-center justify-center" style={{ writingMode: 'vertical-lr' }}>
                      {formatMetricName(m)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((rowMetric) => (
                <tr key={rowMetric} className="group">
                  <td className="sticky left-0 z-10 p-2 font-bold text-slate-700 bg-white/95 backdrop-blur-sm border-r border-slate-100 group-hover:text-indigo-600 transition-colors">
                    <div className="text-[10px] whitespace-nowrap uppercase tracking-tight">
                      {formatMetricName(rowMetric)}
                    </div>
                  </td>
                  {metrics.map((colMetric) => {
                    const cellData = matrix[rowMetric]?.[colMetric];
                    const val = typeof cellData === 'object' ? cellData.r : cellData;
                    const n = typeof cellData === 'object' ? cellData.n : undefined;
                    const isInvalid = n !== undefined && n < 5;
                    const isStatic = val === null && n >= 5;

                    return (
                      <td 
                        key={colMetric} 
                        className={`p-1.5 text-center border rounded-lg font-mono transition-all duration-300 hover:scale-[1.15] hover:z-30 relative cursor-pointer
                          ${getCorrelationColor(val)} hover:shadow-lg group/cell shadow-sm`}
                        title={n ? `${formatMetricName(rowMetric)} vs ${formatMetricName(colMetric)}\nCorrelation (r): ${val?.toFixed(3) || 'N/A'}\nSample Size (n): ${n}` : ''}
                      >
                        <div className="flex flex-col items-center justify-center min-h-[45px]">
                          {isInvalid ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-400 mb-0.5 animate-pulse" />
                              <span className="text-[8px] font-black uppercase tracking-tighter leading-none text-rose-500">Insuff Data</span>
                            </>
                          ) : isStatic ? (
                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none italic tracking-tighter">Static</span>
                          ) : (
                            <>
                              <span className={`text-xs font-black tracking-tighter ${Math.abs(val) >= 0.7 ? 'scale-110' : ''} transition-transform`}>
                                {val !== null ? val.toFixed(2) : '-'}
                              </span>
                              <span className="text-[7px] uppercase font-black opacity-60 leading-none mt-1 tracking-widest">
                                {getCorrelationLabel(val, n)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer / Insights */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 group cursor-help">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 group-hover:scale-125 transition-transform"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase">Kuat (&gt;0.7)</span>
             </div>
             <div className="flex items-center gap-1.5 group cursor-help">
               <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200 group-hover:scale-125 transition-transform"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase">Sedang (0.4-0.7)</span>
             </div>
             <div className="flex items-center gap-1.5 group cursor-help">
               <div className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-200 group-hover:scale-125 transition-transform"></div>
               <span className="text-[10px] font-bold text-slate-500 uppercase">Invers (-)</span>
             </div>
          </div>
          
          <div className="text-[10px] text-slate-400 italic flex items-center gap-1.5 font-medium">
            <Info className="w-3 h-3 text-indigo-400" />
            V2.1 High-Resolution Data Sync Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationMatrix;