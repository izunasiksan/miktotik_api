import React, { useState, useEffect } from 'react';
import { getVPNProfiles, createVPNProfile, deleteVPNProfile } from '../services/api.js';
import Modal from './molecules/Modal.jsx';
import toast from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';

const VPNModal = ({ isOpen, onClose, boardId, boardName }) => {
    const [vpns, setVpns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newVPN, setNewVPN] = useState({
        vpn_type: 'pptp',
        vpn_api: '',
        vpn_username: '',
        vpn_password: '',
        vpn_ssh: '',
        vpn_ftp: '',
        vpn_winbox: ''
    });

    useEffect(() => {
        if (isOpen && boardId) {
            const loadVPNs = async () => {
                if (!boardId) return;
                setLoading(true);
                try {
                    const data = await getVPNProfiles(boardId);
                    setVpns(data);
                } catch (error) {
                    console.error("Failed to fetch VPN profiles", error);
                    toast.error("Failed to fetch VPN profiles");
                } finally {
                    setLoading(false);
                }
            };
            loadVPNs();
        }
    }, [isOpen, boardId]);

    const fetchVPNs = async () => {
        if (!boardId) return;
        setLoading(true);
        try {
            const data = await getVPNProfiles(boardId);
            setVpns(data);
        } catch (error) {
            console.error("Failed to fetch VPN profiles", error);
            toast.error("Failed to fetch VPN profiles");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createVPNProfile(boardId, newVPN);
            toast.success("VPN Profile created");
            setNewVPN({
                vpn_type: 'pptp',
                vpn_api: '',
                vpn_username: '',
                vpn_password: '',
                vpn_ssh: '',
                vpn_ftp: '',
                vpn_winbox: ''
            });
            fetchVPNs();
        } catch (error) {
            console.error("Failed to create VPN profile", error);
            toast.error("Failed to create VPN profile");
        }
    };

    const handleDelete = async (vpnId) => {
        if (!window.confirm("Are you sure you want to delete this VPN profile?")) return;
        try {
            await deleteVPNProfile(boardId, vpnId);
            toast.success("VPN Profile deleted");
            fetchVPNs();
        } catch (error) {
            console.error("Failed to delete VPN profile", error);
            toast.error("Failed to delete VPN profile");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage VPN Profiles - ${boardName}`}>
            <div className="mt-4">
                {/* List Existing VPNs */}
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Existing Profiles</h3>
                    {loading ? (
                        <p>Loading...</p>
                    ) : vpns.length === 0 ? (
                        <p className="text-gray-500">No VPN profiles found.</p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {vpns.map((vpn) => (
                                <li key={vpn.vpn_id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{vpn.vpn_type.toUpperCase()} - {vpn.vpn_username}</p>
                                        <p className="text-xs text-gray-500">{vpn.vpn_api}</p>
                                    </div>
                                    <button onClick={() => handleDelete(vpn.vpn_id)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Create New VPN Form */}
                <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Profile</h3>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={newVPN.vpn_type}
                                onChange={(e) => setNewVPN({ ...newVPN, vpn_type: e.target.value })}
                            >
                                <option value="pptp">PPTP</option>
                                <option value="l2tp">L2TP</option>
                                <option value="sstp">SSTP</option>
                                <option value="ovpn">OpenVPN</option>
                                <option value="wireguard">WireGuard</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">API Address (IP:Port)</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={newVPN.vpn_api}
                                    onChange={(e) => setNewVPN({ ...newVPN, vpn_api: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={newVPN.vpn_username}
                                    onChange={(e) => setNewVPN({ ...newVPN, vpn_username: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={newVPN.vpn_password}
                                onChange={(e) => setNewVPN({ ...newVPN, vpn_password: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">SSH Port</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={newVPN.vpn_ssh}
                                    onChange={(e) => setNewVPN({ ...newVPN, vpn_ssh: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">FTP Port</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={newVPN.vpn_ftp}
                                    onChange={(e) => setNewVPN({ ...newVPN, vpn_ftp: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Winbox Port</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={newVPN.vpn_winbox}
                                    onChange={(e) => setNewVPN({ ...newVPN, vpn_winbox: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                type="submit"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:text-sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add VPN Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    );
};

export default VPNModal;
