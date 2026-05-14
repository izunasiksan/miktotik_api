import React, { useState } from 'react';
import { getInterfaces, updateInterface } from '../../services/api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { Activity, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import InterfaceMonitorModal from './InterfaceMonitorModal.jsx';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((Number(bytes) / Math.pow(k, i) || 0).toFixed(dm))} ${sizes[i]}`;
};

const InterfaceList = ({ boardId }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10); // Start small for fast load
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterface, setSelectedInterface] = useState(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['interfaces', boardId, page, limit, filterType, searchTerm],
    queryFn: () => getInterfaces(boardId, page * limit, limit, searchTerm, filterType),
    keepPreviousData: true,
  });

  const interfaces = data?.data || [];
  const totalInterfaces = data?.total || 0;
  const totalPages = Math.ceil(totalInterfaces / limit);

  const toggleMutation = useMutation({
    mutationFn: ({ iface, newStatus }) => 
      updateInterface(boardId, iface.interface_name, { action: newStatus ? 'enable' : 'disable' }),
    onSuccess: (_, { iface, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['interfaces', boardId] });
      toast.success(`Interface ${iface.interface_name} ${newStatus ? 'Enabled' : 'Disabled'}`);
    },
    onError: (err) => toast.error(`Failed to update interface: ${err.message}`)
  });

  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Connection Error: </strong>
            <span className="block sm:inline">{error?.response?.data?.detail || error.message || 'Failed to connect to router.'}</span>
            <p className="mt-2 text-sm">Please check the board credentials and ensure the router is online.</p>
            <button 
                onClick={() => refetch()}
                className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-1 px-3 rounded inline-flex items-center"
            >
                <RefreshCw className="w-4 h-4 mr-1" /> Try Again
            </button>
        </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-500" />
          Interface Management
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search interface..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
              className="border border-gray-300 rounded-lg text-sm py-2 pl-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="ether">Ethernet</option>
              <option value="vlan">VLAN</option>
              <option value="bridge">Bridge</option>
              <option value="pppoe">PPPoE</option>
            </select>
            <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="ml-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Refresh Data"
            >
                <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total RX</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total TX</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {interfaces.map((iface) => (
              <tr 
                key={iface.interface_name} 
                className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedInterface(iface)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{iface.interface_name}</div>
                    {iface.comment && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {iface.comment}
                        </span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">({iface.interface_type})</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-mono">{formatBytes(iface.rx_byte)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-mono">{formatBytes(iface.tx_byte)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      !iface.disabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {!iface.disabled ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center items-center space-x-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedInterface(iface); }}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                        title="Live Monitor"
                    >
                        <Activity className="w-5 h-5 mr-1" />
                        Monitor
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ iface, newStatus: iface.disabled }); }}
                        disabled={toggleMutation.isPending}
                        className={`${!iface.disabled ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} disabled:opacity-50`}
                    >
                        {!iface.disabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {interfaces.length === 0 && (
                <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                        No interfaces found matching your criteria.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{page * limit + 1}</span> to <span className="font-medium">{Math.min((page + 1) * limit, totalInterfaces)}</span> of <span className="font-medium">{totalInterfaces}</span> results
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={limit}
              onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(0); // Reset to first page on limit change
              }}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:max-w-xs sm:text-sm sm:leading-6"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                Page {page + 1} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {selectedInterface && (
        <InterfaceMonitorModal
          key={selectedInterface.interface_name}
          isOpen={!!selectedInterface}
          onClose={() => setSelectedInterface(null)}
          boardId={boardId}
          interfaceName={selectedInterface.interface_name}
        />
      )}
    </div>
  );
};

export default InterfaceList;
