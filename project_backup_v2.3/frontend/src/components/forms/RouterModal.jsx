import React, { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';

const RouterModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    board_name: '',
    ip_address: '',
    mac_address: '', // Added MAC Address
    port_api: 8728,
    site_group: 'Umum',
    username_mikrotik: '',
    password_mikrotik: '',
    is_monitor: true,
  });

  useEffect(() => {
    const id = setTimeout(() => {
      if (initialData) {
        setFormData({
          board_name: initialData.board_name || '',
          ip_address: initialData.ip_address || '',
          mac_address: initialData.mac_address || '',
          port_api: initialData.port_api || 8728,
          site_group: initialData.site_group || 'Umum',
          username_mikrotik: '', // Credentials not populated for security
          password_mikrotik: '',
          is_monitor: initialData.is_monitor !== undefined ? initialData.is_monitor : true,
        });
      } else {
        setFormData({
          board_name: '',
          ip_address: '',
          mac_address: '',
          port_api: 8728,
          site_group: 'Umum',
          username_mikrotik: '',
          password_mikrotik: '',
          is_monitor: true,
        });
      }
    }, 0);
    return () => clearTimeout(id);
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Map frontend fields to backend schema
    const payload = {
        ...formData,
        username: formData.username_mikrotik,
        password: formData.password_mikrotik
    };
    onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Router' : 'Add New Router'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Router Name</label>
          <input
            type="text"
            name="board_name"
            value={formData.board_name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <input
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">MAC Address</label>
                <input
                    type="text"
                    name="mac_address"
                    value={formData.mac_address}
                    onChange={handleChange}
                    placeholder="00:00:00:00:00:00"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">API Port</label>
                <input
                    type="number"
                    name="port_api"
                    value={formData.port_api}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    required
                />
            </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Site Group</label>
          <input
            type="text"
            name="site_group"
            value={formData.site_group}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
        </div>

        <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Credentials (Optional for Update)</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mikrotik User</label>
                    <input
                        type="text"
                        name="username_mikrotik"
                        value={formData.username_mikrotik}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mikrotik Password</label>
                    <input
                        type="password"
                        name="password_mikrotik"
                        value={formData.password_mikrotik}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                </div>
            </div>
        </div>

        <div className="flex items-center">
          <input
            id="is_monitor"
            name="is_monitor"
            type="checkbox"
            checked={formData.is_monitor}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_monitor" className="ml-2 block text-sm text-gray-900">
            Enable Monitoring
          </label>
        </div>

        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <button
            type="submit"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:col-start-2 sm:text-sm"
          >
            Save
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RouterModal;
