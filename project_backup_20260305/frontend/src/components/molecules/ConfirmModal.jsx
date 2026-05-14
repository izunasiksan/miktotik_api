import React from 'react';
import PropTypes from 'prop-types';
import Modal from '../Modal.jsx';

const ConfirmModal = ({ open, title, description, confirmText, cancelText, onConfirm, onCancel, loading }) => {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title}>
      <div className="text-sm text-gray-700">{description}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Memproses...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

ConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

ConfirmModal.defaultProps = {
  confirmText: 'Ya',
  cancelText: 'Batal',
  loading: false,
};

export default ConfirmModal;

