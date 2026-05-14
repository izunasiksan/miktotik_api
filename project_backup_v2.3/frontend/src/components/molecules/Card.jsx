import React from 'react';

const Card = ({ children, title, subtitle, className = '', noPadding = false, actions }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-shadow hover:shadow-md ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default Card;
