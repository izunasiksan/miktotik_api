import React from 'react';

const Input = ({ label, id, error, className = '', inputClassName = '', ...props }) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg shadow-sm 
          focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors
          ${error 
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' 
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200 hover:border-slate-400'
          }
          disabled:opacity-50 disabled:bg-slate-50 ${inputClassName}
        `}
        {...props}
      />
      {error && (
        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
