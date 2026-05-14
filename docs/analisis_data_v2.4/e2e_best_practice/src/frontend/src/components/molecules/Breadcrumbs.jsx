import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbNameMap = {
    boards: 'Devices',
    reports: 'Reports',
    users: 'User Management',
    'audit-logs': 'Audit Logs',
    settings: 'Settings',
    automation: 'Automation',
    ztp: 'ZTP Queue',
    developer: 'Developer Console'
  };

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-gray-700 flex items-center">
        <Home className="w-4 h-4 mr-1" />
        Home
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const name = breadcrumbNameMap[value] || value; // Fallback to path segment if not mapped (e.g., IDs)

        // If it's an ID (long string or number), maybe truncate or just show "Details"
        // Simple heuristic: if it looks like an ID, show "Details"
        const displayName = (value.length > 20 || !isNaN(value)) ? 'Details' : (name.charAt(0).toUpperCase() + name.slice(1));

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            {last ? (
              <span className="font-medium text-gray-900" aria-current="page">
                {displayName}
              </span>
            ) : (
              <Link to={to} className="hover:text-gray-700">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
