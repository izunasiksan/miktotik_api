import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Component to display a warning if data quality is low.
 */
const DataQualityAlert = ({ score, missing, reportRowsCount, onDetailClick }) => {
  if (score >= 80 || reportRowsCount === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
      <div className="bg-amber-100 p-2 rounded-lg">
        <AlertCircle className="text-amber-600 h-5 w-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Peringatan Kualitas Data</h4>
        <p className="text-xs text-amber-700">
          Skor kualitas data saat ini {score}% ({missing} data hilang/korup). Analisis mungkin tidak sepenuhnya akurat.
        </p>
      </div>
      <button 
        onClick={onDetailClick}
        className="ml-auto text-xs font-bold text-amber-700 hover:underline"
      >
        Detail Audit →
      </button>
    </div>
  );
};

export default DataQualityAlert;
