import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * Atom: DataQualityBadge
 * Menampilkan badge status kualitas data (accuracy_pct).
 */
const DataQualityBadge = ({ accuracy_pct }) => {
  let label = 'Data Akurat';
  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (accuracy_pct < 80) {
    label = 'Data Terbatas';
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (accuracy_pct < 100) {
    label = 'Sebagian Terisi';
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm ${colorClass}`}>
      <span>{label}</span>
      <span className="opacity-60">|</span>
      <span>{accuracy_pct}% Accuracy</span>
    </div>
  );
};

export default DataQualityBadge;
