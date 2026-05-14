import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getZTPQueue, approveZTPDevice, rejectZTPDevice, getMasterSites, getMasterModels } from '../services/api.js';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';
import { Router, Check, X, Server } from 'lucide-react';
import { format } from 'date-fns';

const ZTPQueue = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selection, setSelection] = useState({ siteId: 1, modelId: 1 });

  const { data: queue = [], isLoading, isError } = useQuery({
    queryKey: ['ztp-queue'],
    queryFn: async () => {
      const data = await getZTPQueue();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 15000, // Poll every 15s
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['master-sites'],
    queryFn: getMasterSites
  });

  const { data: models = [] } = useQuery({
    queryKey: ['master-models'],
    queryFn: getMasterModels
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load ZTP queue');
    }
  }, [isError]);

  const approveMutation = useMutation({
    mutationFn: ({ ztpId, siteId, modelId }) => approveZTPDevice(ztpId, { siteId, modelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztp-queue'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success(`Device approved and registered!`);
      setIsModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Approval failed")
  });

  const rejectMutation = useMutation({
    mutationFn: (ztpId) => rejectZTPDevice(ztpId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztp-queue'] });
      toast.success("Device rejected");
    },
    onError: () => toast.error("Rejection failed")
  });

  const handleApproveClick = (device) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const confirmApproval = () => {
    if (!selectedDevice) return;
    approveMutation.mutate({ 
      ztpId: selectedDevice.ztpId, 
      siteId: selection.siteId, 
      modelId: selection.modelId 
    });
  };

  const handleReject = (id) => {
    if(!window.confirm("Are you sure you want to reject this device? It will be marked as rejected and removed from the queue.")) return;
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
                    onClick={() => handleApproveClick(device)}
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

      {/* Approval Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Adopt New Device</h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign <strong>{selectedDevice?.macAddress}</strong> to a site and model.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="target-site-select" className="block text-sm font-medium text-gray-700 mb-1">Target Site</label>
                <select 
                  id="target-site-select"
                  name="target-site-select"
                  className="w-full border rounded-md p-2"
                  value={selection.siteId}
                  onChange={(e) => setSelection({...selection, siteId: parseInt(e.target.value)})}
                >
                  {sites.map(s => (
                    <option key={s.siteId} value={s.siteId}>{s.siteName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="board-model-select" className="block text-sm font-medium text-gray-700 mb-1">Board Model</label>
                <select 
                  id="board-model-select"
                  name="board-model-select"
                  className="w-full border rounded-md p-2"
                  value={selection.modelId}
                  onChange={(e) => setSelection({...selection, modelId: parseInt(e.target.value)})}
                >
                  {models.map(m => (
                    <option key={m.modelId} value={m.modelId}>{m.modelName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={confirmApproval}
                disabled={approveMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Processing...' : 'Confirm Adopt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZTPQueue;
