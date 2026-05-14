import React from 'react';
import { Activity } from 'lucide-react';

/**
 * Correlation Card component for resource and traffic relationship.
 */
const CorrelationCard = ({ corrValue, isLoading }) => {
  const r = typeof corrValue === 'number' ? corrValue / 100 : corrValue?.r || 0;
  const n = typeof corrValue === 'number' ? null : corrValue?.n;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-full hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-sky-100 p-2 rounded-lg">
          <Activity className="h-4 w-4 text-sky-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Korelasi Resource & Traffic</h3>
      </div>
      
      <div className="flex flex-col items-center justify-center py-6 text-center">
        {isLoading ? (
          <div className="h-24 w-full bg-gray-50 animate-pulse rounded-xl" />
        ) : (r !== 0) ? (
          <div className="animate-in zoom-in duration-500">
            <div className={`text-4xl font-black mb-2 ${Math.abs(r) > 0.7 ? 'text-rose-600' : Math.abs(r) > 0.4 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {(Number(r * 100) || 0).toFixed(1)}%
            </div>
            <div className="text-sm font-bold text-gray-700 mb-1">
              {Math.abs(r) > 0.7 ? 'Korelasi Sangat Kuat' : Math.abs(r) > 0.4 ? 'Korelasi Moderat' : 'Korelasi Lemah'}
            </div>
            <p className="text-xs text-gray-500 max-w-xs">
              {Math.abs(r) > 0.6 
                ? 'Trafik sangat mempengaruhi beban CPU. Pertimbangkan optimasi filter atau upgrade hardware.' 
                : 'Beban CPU cenderung stabil terhadap fluktuasi trafik.'}
            </p>
            <div className="mt-4 text-[10px] text-gray-400">
              Berdasarkan {n ? `${n} sampel data sinkron.` : 'Pearson correlation coefficient.'}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-xs py-4">Data korelasi belum tersedia.</div>
        )}
      </div>
    </div>
  );
};

export default CorrelationCard;
