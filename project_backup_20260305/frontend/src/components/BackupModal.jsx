import React, { useState, useEffect } from 'react';
import { getBackups, createBackup, restoreBackup } from '../services/api.js';
import Modal from './Modal.jsx';
import toast from 'react-hot-toast';
import { Download, Upload, RefreshCw, FileText } from 'lucide-react';

const BackupModal = ({ isOpen, onClose, boardId, boardName }) => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(null);

    useEffect(() => {
        if (isOpen && boardId) {
            const loadBackups = async () => {
                if (!boardId) return;
                setLoading(true);
                try {
                    const data = await getBackups(boardId);
                    setBackups(data);
                } catch (error) {
                    console.error("Failed to fetch backups", error);
                    toast.error("Failed to fetch backups");
                } finally {
                    setLoading(false);
                }
            };
            loadBackups();
        }
    }, [isOpen, boardId]);

    const fetchBackups = async () => {
        if (!boardId) return;
        setLoading(true);
        try {
            const data = await getBackups(boardId);
            setBackups(data);
        } catch (error) {
            console.error("Failed to fetch backups", error);
            toast.error("Failed to fetch backups");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setCreating(true);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${boardName}_${timestamp}`;
        
        try {
            await createBackup(boardId, fileName);
            toast.success("Backup created successfully");
            fetchBackups();
        } catch (error) {
            console.error("Failed to create backup", error);
            toast.error("Failed to create backup: " + (error.response?.data?.detail || error.message));
        } finally {
            setCreating(false);
        }
    };

    const handleRestore = async (backupId) => {
        if (!window.confirm("Are you sure you want to restore this backup? The router will reboot.")) return;
        
        setRestoring(backupId);
        try {
            await restoreBackup(backupId);
            toast.success("Restore initiated. Router is rebooting...");
        } catch (error) {
            console.error("Failed to restore backup", error);
            toast.error("Failed to restore backup: " + (error.response?.data?.detail || error.message));
        } finally {
            setRestoring(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Backups - ${boardName}`}>
            <div className="mt-4">
                {/* Actions */}
                <div className="mb-6 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Backup History</h3>
                    <button
                        onClick={handleCreateBackup}
                        disabled={creating}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {creating ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {creating ? 'Creating...' : 'Create New Backup'}
                    </button>
                </div>

                {/* List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md max-h-96 overflow-y-auto">
                    {loading ? (
                        <p className="text-center py-4">Loading backups...</p>
                    ) : backups.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">No backups found.</p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {backups.map((backup) => (
                                <li key={backup.backup_id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <FileText className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-blue-600 truncate">
                                                    {backup.file_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {new Date(backup.log_date).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {backup.router_model} ({backup.status})
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <button
                                                onClick={() => handleRestore(backup.backup_id)}
                                                disabled={restoring === backup.backup_id}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                            >
                                                {restoring === backup.backup_id ? (
                                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Upload className="w-3 h-3 mr-1" />
                                                )}
                                                Restore
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default BackupModal;
