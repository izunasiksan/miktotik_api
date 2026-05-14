import React from 'react';
import { clsx } from 'clsx';

const StatCard = ({ title, value, icon, color = 'bg-indigo-500', trend, trendValue, className }) => (
  <div className={clsx("relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md", className)}>
    <dt>
      <div className={clsx("absolute rounded-xl p-3 shadow-sm", color)}>
        {icon ? React.createElement(icon, { className: "h-6 w-6 text-white", "aria-hidden": true }) : null}
      </div>
      <p className="ml-16 truncate text-sm font-medium text-slate-500">{title}</p>
    </dt>
    <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      
      {trend && (
        <p className={clsx(
          "ml-2 flex items-baseline text-sm font-semibold",
          trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
        )}>
          {trend === 'up' ? '↑' : '↓'}
          <span className="sr-only"> {trend === 'up' ? 'Increased' : 'Decreased'} by </span>
          {trendValue}
        </p>
      )}
    </dd>
  </div>
);

export default StatCard;
