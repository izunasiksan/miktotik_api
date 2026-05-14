import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * Atom: DataQualityBadge
 * Menampilkan badge status kualitas data (accuracyPct).
 */
const DataQualityBadge = ({ accuracyPct }) => {
  let label = 'Data Akurat';
  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (accuracyPct < 80) {
    label = 'Data Terbatas';
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (accuracyPct < 100) {
    label = 'Sebagian Terisi';
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm ${colorClass}`}>
      <span>{label}</span>
      <span className="opacity-60">|</span>
      <span>{accuracyPct}% Accuracy</span>
    </div>
  );
};

export default DataQualityBadge;
