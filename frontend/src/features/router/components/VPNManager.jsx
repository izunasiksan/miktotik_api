import React, { useState } from 'react';
import { getVPNProfiles, createVPNProfile, deleteVPNProfile } from '../../../services/api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../../components/atoms/LoadingSpinner.jsx';
import { Shield, Plus, Trash2 } from 'lucide-react';

const VPNManager = ({ boardId }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vpn_type: 'L2TP/IPSEC',
    vpn_username: '',
    vpn_password: '',
    vpn_api: '',
  });

  const { data: profiles = [], isLoading, isError } = useQuery({
    queryKey: ['vpn-profiles', boardId],
    queryFn: () => getVPNProfiles(boardId).then(data => Array.isArray(data) ? data : []),
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load VPN profiles');
    }
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: (data) => createVPNProfile(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpn-profiles', boardId] });
      toast.success('VPN Profile created');
      setShowModal(false);
      setFormData({
        vpn_type: 'L2TP/IPSEC',
        vpn_username: '',
        vpn_password: '',
        vpn_api: '',
      });
    },
    onError: () => toast.error('Failed to create VPN profile')
  });

  const deleteMutation = useMutation({
    mutationFn: (vpnId) => deleteVPNProfile(boardId, vpnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpn-profiles', boardId] });
      toast.success("VPN Profile deleted");
    },
    onError: () => toast.error("Failed to delete VPN profile")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (vpnId) => {
    if(!window.confirm("Are you sure?")) return;
    deleteMutation.mutate(vpnId);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-600" />
            VPN Management
        </h3>
        <button 
            onClick={() => setShowModal(true)}
            className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
            <Plus className="w-5 h-5 mr-1" />
            Add VPN
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {profiles.map((vpn) => (
              <tr key={vpn.vpn_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {vpn.vpn_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vpn.vpn_username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    vpn.is_connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {vpn.is_connected ? 'Connected' : 'Disconnected'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleDelete(vpn.vpn_id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-md text-red-600 hover:text-red-900 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
                <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No VPN profiles found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Create VPN Profile</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.vpn_type}
                            onChange={(e) => setFormData({...formData, vpn_type: e.target.value})}
                        >
                            <option value="L2TP/IPSEC">L2TP/IPSEC</option>
                            <option value="OVPN">OpenVPN</option>
                            <option value="PPTP">PPTP</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input 
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.vpn_username}
                            onChange={(e) => setFormData({...formData, vpn_username: e.target.value})}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input 
                            type="password"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.vpn_password}
                            onChange={(e) => setFormData({...formData, vpn_password: e.target.value})}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default VPNManager;
