import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/api.js';
import useAuth from '../context/useAuth.js';
import { format } from 'date-fns';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';
import { toast } from 'react-hot-toast';

const AuditLogs = () => {
  const { user } = useAuth();
  const [filterAction, setFilterAction] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const { data: logs = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', filterAction, startTime, endTime],
    queryFn: () => getAuditLogs(0, 100, null, filterAction || null, startTime || null, endTime || null),
    enabled: !!user && user.role === 'admin',
  });

  React.useEffect(() => {
    if (isError) {
      console.error(error);
      toast.error('Failed to fetch audit logs');
    }
  }, [isError, error]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>You do not have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📜 Audit Logs</h1>
        <button 
          onClick={() => refetch()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 bg-white p-4 rounded shadow flex flex-wrap gap-4 items-end">
         <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">Action</label>
            <select 
               className="border p-2 rounded text-sm h-10"
               value={filterAction}
               onChange={(e) => setFilterAction(e.target.value)}
            >
               <option value="">All Actions</option>
               <option value="LOGIN">LOGIN</option>
               <option value="CREATE_BOARD">CREATE_BOARD</option>
               <option value="UPDATE_BOARD">UPDATE_BOARD</option>
               <option value="DELETE_BOARD">DELETE_BOARD</option>
               <option value="CREATE_VPN">CREATE_VPN</option>
               <option value="UPDATE_VPN">UPDATE_VPN</option>
               <option value="DELETE_VPN">DELETE_VPN</option>
            </select>
         </div>

         <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">Start Time (ISO)</label>
            <input 
               type="datetime-local" 
               className="border p-2 rounded text-sm h-10"
               value={startTime}
               onChange={(e) => setStartTime(e.target.value)}
            />
         </div>

         <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">End Time (ISO)</label>
            <input 
               type="datetime-local" 
               className="border p-2 rounded text-sm h-10"
               value={endTime}
               onChange={(e) => setEndTime(e.target.value)}
            />
         </div>

         <button 
            onClick={() => {
               setStartTime('');
               setEndTime('');
               setFilterAction('');
            }}
            className="text-gray-500 hover:text-gray-700 text-sm h-10 flex items-center"
         >
            Clear Filters
         </button>
      </div>

      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Failed to fetch audit logs: {error?.message}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                    <tr key={log.logId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span title={log.userId} className="cursor-help border-b border-dotted">
                            {log.userId ? log.userId.substring(0, 8) + '...' : 'System/Anon'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                            log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                            log.action.includes('UPDATE') ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                            {log.action}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {log.targetResource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {log.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                        {log.details ? (
                            <details>
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View JSON</summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-w-xs max-h-40">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </details>
                        ) : '-'}
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
