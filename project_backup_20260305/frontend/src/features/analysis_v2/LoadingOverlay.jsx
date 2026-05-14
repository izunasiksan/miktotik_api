import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading overlay for analysis components to provide a clear indicator 
 * that data is being fetched or processed.
 */
const LoadingOverlay = ({ 
  isLoading, 
  message = "Memuat data...", 
  variant = "absolute", // 'absolute' for card-level, 'fixed' for page-level
  blur = true 
}) => {
  if (!isLoading) return null;

  const baseClasses = variant === 'absolute' 
    ? "absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl" 
    : "fixed inset-0 z-[100] flex flex-col items-center justify-center";

  const backgroundClasses = blur 
    ? "bg-white/60 backdrop-blur-[2px]" 
    : "bg-white/80";

  return (
    <div className={`${baseClasses} ${backgroundClasses} animate-in fade-in duration-300`}>
      <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-xl border border-gray-100 scale-90 md:scale-100">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-blue-100 animate-pulse" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-gray-800 uppercase tracking-wider">{message}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Mohon tunggu sebentar</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
