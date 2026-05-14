import React, { useEffect, useState } from 'react';
import { getBoards, deleteBoard, updateBoard, createBoard, pingBoard } from '../services/api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Shield, Download, ShieldAlert, Eye, Server, Activity, Clock, Globe, Monitor, FileText, RefreshCcw, LayoutGrid, Table as TableIcon } from 'lucide-react';
import Modal from '../components/molecules/Modal.jsx';
import VPNModal from '../components/VPNModal.jsx';
import BackupModal from '../components/BackupModal.jsx';
import RouterModal from '../components/forms/RouterModal.jsx';
import toast, { Toaster } from 'react-hot-toast';
import Card from '../components/molecules/Card.jsx';
import Button from '../components/atoms/Button.jsx';
import Input from '../components/atoms/Input.jsx';
import LoadingSpinner from '../components/atoms/LoadingSpinner.jsx';
import StatusBadge from '../components/atoms/StatusBadge.jsx';
import ConfirmModal from '../components/molecules/ConfirmModal.jsx';

const Boards = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVPNModalOpen, setIsVPNModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isRouterModalOpen, setIsRouterModalOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [viewMode, setViewMode] = useState('table');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards(),
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const deleteMutation = useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      toast.success("Board deleted successfully");
      queryClient.invalidateQueries(['boards']);
      setIsDeleteModalOpen(false);
      setBoardToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete board");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBoard(id, data),
    // Optimistic Update logic
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['boards'] });

      // Snapshot the previous value
      const previousBoards = queryClient.getQueryData(['boards']);

      // Optimistically update to the new value
      queryClient.setQueryData(['boards'], (old) => {
        if (!old) return [];
        return old.map((board) => 
          board.boardId === id ? { ...board, ...data } : board
        );
      });

      // Return a context object with the snapshotted value
      return { previousBoards };
    },
    onError: (err, _vars, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBoards) {
        queryClient.setQueryData(['boards'], context.previousBoards);
      }
      toast.error("Failed to update board status");
    },
    onSettled: () => {
      // Always refetch after error or success to keep server and client in sync
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      toast.success("Router created successfully");
      queryClient.invalidateQueries(['boards']);
      setIsRouterModalOpen(false);
      setSelectedBoard(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to create router");
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => updateBoard(id, data),
    onSuccess: () => {
      toast.success("Router updated successfully");
      queryClient.invalidateQueries(['boards']);
      setIsRouterModalOpen(false);
      setSelectedBoard(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update router");
    }
  });

  const handleDeleteClick = (board) => {
    setBoardToDelete(board);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!boardToDelete) return;
    deleteMutation.mutate(boardToDelete.boardId);
  };

  const handleToggleField = (e, board, field) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fieldLabels = {
        isMonitor: 'DB Monitor',
        isPublicReview: 'Analisis',
        isMaintenance: 'Maintenance'
    };
    
    const label = fieldLabels[field] || field;
    const newValue = !board[field];
    setPendingToggle({
      id: board.boardId,
      boardName: board.boardName,
      field,
      newValue,
      label
    });
  };

  const handleSaveRouter = (data) => {
    if (selectedBoard) {
      editMutation.mutate({ id: selectedBoard.boardId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openAddModal = () => {
      setSelectedBoard(null);
      setIsRouterModalOpen(true);
  };

  const openEditModal = (board) => {
      setSelectedBoard(board);
      setIsRouterModalOpen(true);
  };

  const handleRefresh = () => {
    toast.promise(
      queryClient.invalidateQueries(['boards']),
      {
        loading: 'Refreshing devices...',
        success: 'Devices refreshed!',
        error: 'Failed to refresh',
      },
      { id: 'refresh-toast' }
    );
  };

  const handlePing = async (boardId) => {
    try {
        toast.loading('Pinging device...', { id: 'ping-toast' });
        const res = await pingBoard(boardId);
        toast.dismiss('ping-toast');
        if (res.isOnline) {
            toast.success(`Device is online! Latency: ${res.latency}ms`);
        } else {
            toast.error('Device is offline');
        }
        queryClient.invalidateQueries(['boards']);
    } catch (error) {
        toast.dismiss('ping-toast');
        toast.error('Ping check failed');
        console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <p className="text-red-500">Failed to load boards</p>
        <Button onClick={() => queryClient.invalidateQueries(['boards'])}>Retry</Button>
      </div>
    );
  }

  const filteredBoards = boards.filter(board => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch = !q ||
                         board.boardName.toLowerCase().includes(q) ||
                         board.ipAddress.toLowerCase().includes(q) ||
                         (board.mikrotikIdentity && board.mikrotikIdentity.toLowerCase().includes(q));
    
    const matchesStatus = (statusFilter === 'all' && board.isPublicReview !== false) || 
                         (statusFilter === 'online' && board.isOnline && !board.isMaintenance) ||
                         (statusFilter === 'offline' && !board.isOnline && !board.isMaintenance) ||
                         (statusFilter === 'maintenance' && !!board.isMaintenance);
                         
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Device"
        description={<>Are you sure you want to delete <b>{boardToDelete?.boardName}</b>? This action cannot be undone.</>}
        variant="danger"
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      {/* Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => {
          if (!pendingToggle) return;
          updateMutation.mutate(
            { id: pendingToggle.id, data: { [pendingToggle.field]: pendingToggle.newValue } },
            {
              onSuccess: () => {
                toast.success(`${pendingToggle.label} ${pendingToggle.newValue ? 'enabled' : 'disabled'}`);
              }
            }
          );
          setPendingToggle(null);
        }}
        title="Konfirmasi Perubahan"
        description={
          pendingToggle?.newValue
            ? <>Apakah Anda yakin ingin <b>MENGAKTIFKAN</b> {pendingToggle?.label} untuk <b>{pendingToggle?.boardName}</b>?</>
            : <>Apakah Anda yakin ingin <b>MENONAKTIFKAN</b> {pendingToggle?.label} untuk <b>{pendingToggle?.boardName}</b>?</>
        }
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
        isLoading={updateMutation.isPending}
      />

      {/* Other Modals (Keep as is for now, assuming they use the new Modal component internally or update them later) */}
      <VPNModal 
        isOpen={isVPNModalOpen} 
        onClose={() => setIsVPNModalOpen(false)} 
        boardId={selectedBoard?.boardId}
        boardName={selectedBoard?.boardName}
      />

      <BackupModal 
        isOpen={isBackupModalOpen} 
        onClose={() => setIsBackupModalOpen(false)} 
        boardId={selectedBoard?.boardId}
        boardName={selectedBoard?.boardName}
      />

      <RouterModal
        isOpen={isRouterModalOpen}
        onClose={() => setIsRouterModalOpen(false)}
        onSave={handleSaveRouter}
        initialData={selectedBoard}
      />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Device Management</h1>
           <p className="text-slate-500 text-sm mt-1.5 flex items-center gap-2">
             <Server className="w-4 h-4 text-indigo-500" />
             Manage your Mikrotik routers and switches with ease.
           </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:min-w-[300px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                </div>
                <Input 
                    type="text" 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    placeholder="Search by name or IP..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="hidden sm:flex p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'all', label: 'All', color: 'text-slate-600', activeBg: 'bg-white' },
                { id: 'online', label: 'Online', color: 'text-emerald-600', activeBg: 'bg-emerald-50' },
                { id: 'maintenance', label: 'Maint.', color: 'text-orange-600', activeBg: 'bg-orange-50' },
                { id: 'offline', label: 'Offline', color: 'text-rose-600', activeBg: 'bg-rose-50' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    statusFilter === tab.id 
                      ? `${tab.activeBg} ${tab.color} shadow-sm ring-1 ring-inset ring-slate-200` 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-1.5 rounded-md ${viewMode === 'table' ? 'bg-white text-slate-700 shadow ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-slate-700 shadow ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="secondary" 
                    onClick={handleRefresh} 
                    className="h-11 w-11 p-0 flex items-center justify-center border-slate-200 hover:bg-slate-50 transition-all"
                    title="Refresh Data"
                >
                    <RefreshCcw className="w-5 h-5 text-slate-600" />
                </Button>
                <Button onClick={openAddModal} className="h-11 px-6 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Device
                </Button>
            </div>
        </div>
      </div>
      {isFetching && <div className="h-0.5 bg-indigo-500 animate-pulse rounded-full" />}

      {viewMode === 'table' ? (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="sm:hidden p-3 border-b border-slate-100">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[12px] font-semibold text-slate-600 uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Device
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-x border-slate-100">
                  Management Control
                </th>
                <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Quick Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredBoards.length === 0 ? (
                    <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                           <div className="flex flex-col items-center">
                             <Server className="w-12 h-12 text-slate-300 mb-3" />
                             <p>No devices found.</p>
                           </div>
                        </td>
                    </tr>
              ) : (
                  filteredBoards.map((board) => (
                    <tr 
                      key={board.boardId} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/boards/${board.boardId}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                             <Server className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{board.boardName}</div>
                            <div className="text-sm text-slate-500">{board.mikrotikIdentity || '-'}</div>
                            <div className="mt-1 text-xs text-slate-600 font-mono">
                              {board.ipAddress} <span className="text-slate-400">•</span> Port {board.portApi}
                            </div>
                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                {board.siteGroup}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                               {board.isOnline && (
                                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" title="Online" />
                               )}
                               {!board.isOnline && (
                                  <span className="flex h-2 w-2 rounded-full bg-slate-300 ring-4 ring-slate-100" title="Offline" />
                               )}
                               <button 
                                  onClick={(e) => { e.stopPropagation(); handlePing(board.boardId); }}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-100 hover:border-indigo-100"
                                  title="Quick Ping Test"
                               >
                                  <Activity className="w-4 h-4" />
                               </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium ml-0.5">
                               <Clock className="w-3 h-3" />
                               <span>{board.lastPingAt ? new Date(board.lastPingAt).toLocaleString() : 'Never'}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-slate-50/30 border-x border-slate-100/50" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={(e) => handleToggleField(e, board, 'isMonitor')}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${board.isMonitor ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${board.isMonitor ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Monitor</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={(e) => handleToggleField(e, board, 'isPublicReview')}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${board.isPublicReview ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${board.isPublicReview ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Analisis</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={(e) => handleToggleField(e, board, 'isMaintenance')}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${board.isMaintenance ? 'bg-orange-500' : 'bg-slate-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${board.isMaintenance ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Maint.</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(board); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                title="Edit Settings"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedBoard(board); setIsVPNModalOpen(true); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="VPN Profiles"
                            >
                                <Shield className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedBoard(board); setIsBackupModalOpen(true); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                title="Backup Manager"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1" />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(board); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="Delete Device"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
           <p className="text-xs text-slate-500">
              Showing {filteredBoards.length} devices
           </p>
        </div>
      </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBoards.map((board) => (
          <div key={board.boardId} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 group hover:border-indigo-200 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{board.boardName}</div>
                <div className="text-xs text-slate-500">{board.mikrotikIdentity || '-'}</div>
              </div>
              <span className={`h-2 w-2 rounded-full ${board.isOnline ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 ring-4 ring-slate-100'}`} />
            </div>
            <div className="text-xs text-slate-600">
              <div className="font-mono">{board.ipAddress}</div>
              <div className="text-slate-500">Port: {board.portApi}</div>
              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{board.siteGroup}</span>
            </div>
            <div className="flex items-center justify-center gap-4 py-2 bg-slate-50/50 border rounded-lg">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => handleToggleField(e, board, 'isMonitor')}
                  className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${board.isMonitor ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${board.isMonitor ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Monitor</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => handleToggleField(e, board, 'isPublicReview')}
                  className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${board.isPublicReview ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${board.isPublicReview ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Analisis</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => handleToggleField(e, board, 'isMaintenance')}
                  className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${board.isMaintenance ? 'bg-orange-500' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${board.isMaintenance ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Maint.</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePing(board.boardId); }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-100 hover:border-indigo-100"
                  title="Quick Ping Test"
                >
                  <Activity className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{board.lastPingAt ? new Date(board.lastPingAt).toLocaleString() : 'Never'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  type="button"
                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit Device"
                  onClick={(e) => { e.stopPropagation(); openEditModal(board); }}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="VPN Profiles"
                  onClick={(e) => { e.stopPropagation(); setSelectedBoard(board); setIsVPNModalOpen(true); }}
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Backup Manager"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBoard(board);
                    setIsBackupModalOpen(true);
                  }}
                >
                  <Download className="w-4 h-4" />
                </button>
                <Link 
                  to={`/boards/${board.boardId}`}
                  className="p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  title="View Details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default Boards;
