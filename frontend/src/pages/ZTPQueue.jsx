import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getZTPQueue, approveZTPDevice, rejectZTPDevice } from '../services/api.js';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';
import { Router, Check, X, Server } from 'lucide-react';
import { format } from 'date-fns';

const ZTPQueue = () => {
  const queryClient = useQueryClient();

  const { data: queue = [], isLoading, isError } = useQuery({
    queryKey: ['ztp-queue'],
    queryFn: async () => {
      const data = await getZTPQueue();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 15000, // Poll every 15s
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load ZTP queue');
    }
  }, [isError]);

  const approveMutation = useMutation({
    mutationFn: ({ ztpId, siteGroup }) => approveZTPDevice(ztpId, { siteGroup }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztp-queue'] });
      toast.success(`Device approved!`);
    },
    onError: () => toast.error("Approval failed")
  });

  const rejectMutation = useMutation({
    mutationFn: rejectZTPDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztp-queue'] });
      toast.success("Device rejected");
    },
    onError: () => toast.error("Rejection failed")
  });

  const handleApprove = (device) => {
    const site = prompt("Assign to Site Group:", "Umum");
    if (site === null) return;
    
    approveMutation.mutate({ ztpId: device.ztpId, siteGroup: site });
  };

  const handleReject = (id) => {
    if(!window.confirm("Reject and block this device?")) return;
    rejectMutation.mutate(id);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Server className="w-6 h-6 mr-2 text-purple-600" />
        Zero Touch Provisioning (ZTP) Queue
      </h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detected At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {queue.map((device) => (
              <tr key={device.ztpId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(device.requestedAt), 'MMM d, HH:mm:ss')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                  {device.macAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {device.ipAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {device.model || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button 
                    onClick={() => handleApprove(device)}
                    disabled={approveMutation.isPending}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center hover:bg-green-200 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 mr-1" /> Adopt
                  </button>
                  <button 
                    onClick={() => handleReject(device.ztpId)}
                    disabled={rejectMutation.isPending}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-full flex items-center hover:bg-red-200 disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-1" /> Reject
                  </button>
                </td>
              </tr>
            ))}
             {queue.length === 0 && (
                <tr>
                    <td colSpan="5" className="text-center py-10 text-gray-500">
                        <div className="flex flex-col items-center">
                            <Router className="w-12 h-12 text-gray-300 mb-2" />
                            <p>No new devices detected.</p>
                            <p className="text-xs">Connect a new router to the network to trigger ZTP.</p>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ZTPQueue;
