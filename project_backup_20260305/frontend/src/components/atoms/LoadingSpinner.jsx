import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const LoadingSpinner = ({ size = 'md', className, fullscreen = false }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinner = (
    <Loader2 
      className={clsx(
        "animate-spin text-indigo-600",
        sizes[size],
        className
      )} 
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex justify-center p-4">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
