import React from 'react';

export const TableLimitSelector = ({ limit, current, onChange, onSelect }) => {
  const activeLimit = limit || current;
  const handleChange = onChange || onSelect;

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
      {[10, 20, 50, 100, 'all'].map((val) => (
        <button
          key={val}
          onClick={() => handleChange && handleChange(val)}
          className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition-all ${
            activeLimit === val 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {val}
        </button>
      ))}
    </div>
  );
};

export const SizedContainer = ({ heightClass = 'h-64', children }) => (
  <div className={`${heightClass} relative w-full`}>{children}</div>
);

