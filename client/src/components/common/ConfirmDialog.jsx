import React from 'react';
import Modal from './Modal';
import { AlertCircle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-md disabled:opacity-50 ${
            isDestructive
              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
