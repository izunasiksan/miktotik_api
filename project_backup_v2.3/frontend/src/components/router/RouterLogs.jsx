import React from 'react';
import { getBoardEvents } from '../../services/api.js';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const RouterLogs = ({ boardId }) => {
  const { data: logs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['router-logs', boardId],
    queryFn: () => getBoardEvents(boardId),
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load router logs');
    }
  }, [isError]);

  if (isLoading) return <LoadingSpinner />;

  const getIcon = (level) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-500" />
            System Logs
        </h3>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:text-blue-800">Refresh</button>
      </div>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {logs.map((log, logIdx) => (
            <li key={log.event_id}>
              <div className="relative pb-8">
                {logIdx !== logs.length - 1 ? (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                      {getIcon(log.event_level)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{log.event_name}</span>: {log.event_detail}
                      </p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      <time dateTime={log.log_time}>{format(new Date(log.log_time), 'MMM d, HH:mm:ss')}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-gray-500 py-4">No logs available.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default RouterLogs;
