import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api.js';
import useAuth from '../context/useAuth.js';
import { toast } from 'react-hot-toast';
import { User, Shield, Check, X, Edit2, Trash2, Plus } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

const Users = () => {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUserEdit, setCurrentUserEdit] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'teknisi',
        is_active: true
    });

    // Fetch Users
    const { data: users = [], isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    });

    React.useEffect(() => {
        if (isError) {
            toast.error("Gagal memuat data pengguna");
        }
    }, [isError]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Pengguna berhasil dibuat");
            closeModal();
        },
        onError: () => toast.error("Gagal membuat pengguna")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Pengguna berhasil diperbarui");
            closeModal();
        },
        onError: () => toast.error("Gagal memperbarui pengguna")
    });

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("Pengguna berhasil dihapus");
        },
        onError: () => toast.error("Gagal menghapus pengguna")
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (currentUserEdit) {
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;
            updateMutation.mutate({ id: currentUserEdit.user_id, data: updateData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
            deleteMutation.mutate(id);
        }
    };

    const openEdit = (user) => {
        setCurrentUserEdit(user);
        setFormData({
            username: user.username,
            password: '',
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentUserEdit(null);
        setFormData({
            username: '',
            password: '',
            full_name: '',
            role: 'teknisi',
            is_active: true
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="w-8 h-8 text-blue-600" />
                        Manajemen Pengguna
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola akses dan peran pengguna sistem</p>
                </div>
                <button
                    onClick={() => { closeModal(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Pengguna
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.full_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                        <Shield className="w-3 h-3" />
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => openEdit(user)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors p-1 rounded hover:bg-indigo-50"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {currentUser?.user_id !== user.user_id && (
                                        <button
                                            onClick={() => handleDelete(user.user_id)}
                                            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                    Tidak ada data pengguna found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeModal}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            {currentUserEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}
                                        </h3>
                                        <div className="mt-4">
                                            <form onSubmit={handleSubmit} id="user-form">
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        value={formData.username}
                                                        onChange={handleInputChange}
                                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        required
                                                        disabled={!!currentUserEdit}
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                                        Password {currentUserEdit && <span className="text-xs font-normal text-gray-500">(Kosongkan jika tidak ingin mengubah)</span>}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        name="password"
                                                        value={formData.password}
                                                        onChange={handleInputChange}
                                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        required={!currentUserEdit}
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2">Nama Lengkap</label>
                                                    <input
                                                        type="text"
                                                        name="full_name"
                                                        value={formData.full_name}
                                                        onChange={handleInputChange}
                                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                                                    <select
                                                        name="role"
                                                        value={formData.role}
                                                        onChange={handleInputChange}
                                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                    >
                                                        <option value="teknisi">Teknisi</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                                <div className="mb-6">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            name="is_active"
                                                            checked={formData.is_active}
                                                            onChange={handleInputChange}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-900">Aktif</span>
                                                    </label>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="submit"
                                    form="user-form"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;