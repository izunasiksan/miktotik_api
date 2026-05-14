import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Forecasting Card component for resource and traffic trends.
 */
const ForecastingCard = ({ forecast, isLoading }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-full hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <TrendingUp className="h-4 w-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Network Forecasting (7 Hari)</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-50 animate-pulse rounded-xl" />
          <div className="h-20 bg-gray-50 animate-pulse rounded-xl" />
          <div className="col-span-2 h-16 bg-gray-50 animate-pulse rounded-xl" />
        </div>
      ) : forecast ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
            <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Estimasi CPU</div>
            <div className="text-xl font-black text-indigo-900">{(Number(forecast.cpu.nextVal) || 0).toFixed(1)}%</div>
            <div className="text-[10px] text-indigo-500 mt-1">
              {forecast.cpu.slope > 0 ? `Naik ${(Number(forecast.cpu.slope) || 0).toFixed(2)}%/hari` : `Turun ${(Number(Math.abs(forecast.cpu.slope)) || 0).toFixed(2)}%/hari`}
            </div>
          </div>
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Kapasitas Penuh</div>
            <div className="text-xl font-black text-blue-900">
              {forecast.cpu.daysTo90 > 0 && forecast.cpu.daysTo90 < 365 ? `${forecast.cpu.daysTo90} Hari` : 'Aman'}
            </div>
            <div className="text-[10px] text-blue-500 mt-1">Estimasi mencapai 90%</div>
          </div>
          <div className="col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Trend Trafik Berikutnya</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${forecast.traffic.slope > 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, Math.max(10, 50 + (forecast.traffic.slope * 10)))}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700">
                {forecast.traffic.slope > 0 ? 'Meningkat' : 'Menurun'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-gray-400 text-xs">
          Data tidak cukup untuk melakukan forecasting.
        </div>
      )}
      <p className="mt-4 text-[10px] text-gray-400 italic">
        * Estimasi menggunakan algoritma Linear Regression berdasarkan tren data historis yang tersedia.
      </p>
    </div>
  );
};

export default ForecastingCard;
