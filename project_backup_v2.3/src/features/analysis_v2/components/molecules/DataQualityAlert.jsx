import React from 'react';
import { useAnalysisStore } from '../../../../store/analysisStore';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import DataQualityBadge from '../atoms/DataQualityBadge';

/**
 * Molecule: DataQualityAlert
 * Menampilkan status kualitas data (accuracy_pct) hasil normalisasi Stage 0.
 * Bermigrasi ke Atomic Design.
 */
const DataQualityAlert = () => {
  const { normalizationStatus } = useAnalysisStore();

  if (!normalizationStatus) return null;

  const { accuracy_pct, missing_gaps, status } = normalizationStatus;

  // Thresholds (01_INTEGRATION_MAP.md)
  let message = 'Data Akurat';
  let Icon = CheckCircle;
  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (accuracy_pct < 80) {
    message = 'Data Terbatas - Estimasi Saja';
    Icon = AlertTriangle;
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (accuracy_pct < 100) {
    message = 'Data Sebagian Terisi';
    Icon = Info;
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-4 mb-8 shadow-sm transition-all animate-in fade-in slide-in-from-left-4 duration-500 ${colorClass}`}>
      <div className={`p-2 rounded-xl bg-white shadow-sm`}>
        <Icon className="w-5 h-5 shrink-0" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-sm uppercase tracking-tight">{message}</h4>
          <DataQualityBadge accuracy_pct={accuracy_pct} />
        </div>
        
        <p className="text-xs font-medium opacity-80 leading-relaxed">
          {accuracy_pct < 100 
            ? `Dataset mengandung ${missing_gaps?.length || 0} gap data. Menggunakan estimasi statistik untuk menjamin kontinuitas pipeline.`
            : 'Dataset lengkap dan diverifikasi (High-Fidelity). Siap untuk analisis mendalam.'}
        </p>

        {status === 'PENDING' && (
          <div className="mt-3 flex items-center gap-2 animate-pulse text-[10px] font-black uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
            Preparing dataset...
          </div>
        )}
      </div>
    </div>
  );
};

export default DataQualityAlert;
