import React from 'react';
import PropTypes from 'prop-types';
import { clsx } from 'clsx';

const StatusBadge = ({ status, className }) => {
  const normalizedStatus = status?.toLowerCase() || 'default';

  const styles = {
    online: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    running: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    
    offline: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    error: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    failed: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    disabled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    
    maintenance: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    
    info: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    default: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  };

  const labels = {
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Maintenance',
    active: 'Active',
    disabled: 'Disabled',
  };

  const selectedStyle = styles[normalizedStatus] || styles.default;
  const label = labels[normalizedStatus] || status;

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
        selectedStyle,
        className
      )}
    >
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default StatusBadge;
