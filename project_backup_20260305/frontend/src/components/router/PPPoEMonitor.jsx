import React, { useState } from 'react';
import { getPPPoEUsers, kickPPPoEUser } from '../../services/api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { Users, WifiOff, RefreshCw } from 'lucide-react';

const PPPoEMonitor = ({ boardId }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pppoe-users', boardId],
    queryFn: () => getPPPoEUsers(boardId),
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });

  const disconnectMutation = useMutation({
    mutationFn: (username) => kickPPPoEUser(boardId, username),
    onSuccess: (_, username) => {
      queryClient.invalidateQueries({ queryKey: ['pppoe-users', boardId] });
      toast.success(`User ${username} disconnected`);
    },
    onError: (err) => toast.error(`Failed to disconnect user: ${err.message}`)
  });

  const handleDisconnect = (username) => {
    if (!window.confirm(`Are you sure you want to disconnect ${username}?`)) return;
    disconnectMutation.mutate(username);
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.caller_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-6" role="alert">
            <strong className="font-bold">Connection Error: </strong>
            <span className="block sm:inline">{error?.response?.data?.detail || error.message || 'Failed to connect to router.'}</span>
            <p className="mt-2 text-sm">Please check the board credentials and ensure the router is online.</p>
            <button onClick={() => refetch()} className="mt-2 text-sm font-bold underline">Retry</button>
        </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Active PPPoE Sessions
        </h3>
        <div className="flex space-x-2">
            <input 
                type="text" 
                placeholder="Search user..." 
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
                onClick={() => refetch()} 
                className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
                title="Refresh"
            >
                <RefreshCw className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user['.id'] || user.name}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user['caller-id']}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.uptime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleDisconnect(user.name)}
                    disabled={disconnectMutation.isPending}
                    className="p-1.5 rounded-md text-red-600 hover:text-red-900 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Disconnect User"
                  >
                    <WifiOff className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
                <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">No active sessions found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PPPoEMonitor;
