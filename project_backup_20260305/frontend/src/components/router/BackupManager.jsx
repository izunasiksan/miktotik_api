import React from 'react';
import { getBackups, createBackup, restoreBackup } from '../../services/api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { Archive, Plus } from 'lucide-react';
import { format } from 'date-fns';

const BackupManager = ({ boardId }) => {
  const queryClient = useQueryClient();

  const { data: backups = [], isLoading, isError } = useQuery({
    queryKey: ['backups', boardId],
    queryFn: () => getBackups(boardId),
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load backups');
    }
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: (fileName) => createBackup(boardId, fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups', boardId] });
      toast.success('Backup created successfully');
    },
    onError: () => toast.error('Failed to create backup')
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: () => {
      toast.success("Restore command sent to router!");
    },
    onError: () => toast.error("Failed to initiate restore.")
  });

  const handleCreateBackup = () => {
    const fileName = `backup-${new Date().toISOString().slice(0,10)}.rsc`;
    createMutation.mutate(fileName);
  };

  const handleRestore = (backupId) => {
    if(!window.confirm("Are you sure you want to restore this backup? Current configuration will be overwritten!")) return;
    restoreMutation.mutate(backupId);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Archive className="w-5 h-5 mr-2 text-purple-500" />
            Backup & Restore
        </h3>
        <button 
            onClick={handleCreateBackup} 
            disabled={createMutation.isPending}
            className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
            {createMutation.isPending ? <LoadingSpinner size="sm" /> : <Plus className="w-5 h-5 mr-1" />}
            Backup Now
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {backups.map((backup) => (
              <tr key={backup.backup_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(backup.log_date), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {backup.file_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    backup.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {backup.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleRestore(backup.backup_id)} 
                    disabled={restoreMutation.isPending}
                    className="text-orange-600 hover:text-orange-900 mr-4 flex items-center inline-flex disabled:opacity-50"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
                <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No backups found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BackupManager;
