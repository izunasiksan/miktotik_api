import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAutomationJobs, createAutomationJob } from '../services/api.js';
import { toast } from 'react-hot-toast';
import LoadingSpinner from "../components/atoms/LoadingSpinner.jsx";
import { Zap, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const AutomationWizard = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    jobType: 'mass_config',
    payload: '',
    description: ''
  });

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ['automation-jobs'],
    queryFn: async () => {
      const data = await getAutomationJobs();
      return Array.isArray(data) ? data : [];
    },
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load automation jobs');
    }
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: createAutomationJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-jobs'] });
      toast.success('Job created successfully');
      setShowModal(false);
      setFormData({
        jobType: 'mass_config',
        payload: '',
        description: ''
      });
    },
    onError: () => toast.error('Failed to create job')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      // Basic JSON validation
      if (formData.payload) {
        JSON.parse(formData.payload);
      }
      
      createMutation.mutate(formData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON Payload');
      } else {
        toast.error('Failed to validate job data');
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
        case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
        case 'running': return <LoadingSpinner size="sm" />;
        default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-yellow-500" />
            Automation & Mass Config
        </h1>
        <button 
            onClick={() => setShowModal(true)}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
            <Play className="w-4 h-4 mr-2" />
            New Job
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.jobId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                  {job.jobId.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {job.jobType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="text-sm capitalize">{job.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(job.createdAt), 'MMM d, HH:mm')}
                </td>
              </tr>
            ))}
             {jobs.length === 0 && (
                <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">No automation jobs found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-[600px]">
                <h3 className="text-lg font-bold mb-4">Create Automation Job</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="automation-job-type" className="block text-sm font-medium text-gray-700">Type</label>
                        <select 
                            id="automation-job-type"
                            name="automation-job-type"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            value={formData.jobType}
                            onChange={e => setFormData({...formData, jobType: e.target.value})}
                        >
                            <option value="mass_config">Mass Configuration</option>
                            <option value="reboot_all">Mass Reboot</option>
                            <option value="firmware_update">Firmware Update</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="automation-job-desc" className="block text-sm font-medium text-gray-700">Description</label>
                        <input 
                            id="automation-job-desc"
                            name="automation-job-desc"
                            type="text" 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            required
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="automation-job-payload" className="block text-sm font-medium text-gray-700">Payload (JSON)</label>
                        <textarea 
                            id="automation-job-payload"
                            name="automation-job-payload"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border font-mono text-xs"
                            rows="6"
                            placeholder='{"commands": ["/ip address add..."]}'
                            value={formData.payload}
                            onChange={e => setFormData({...formData, payload: e.target.value})}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button 
                            type="button" 
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={createMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createMutation.isPending ? 'Executing...' : 'Execute Job'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AutomationWizard;
