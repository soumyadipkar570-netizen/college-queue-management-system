import React, { useState } from 'react';
import Modal from './Modal';
import { UserX } from 'lucide-react';

const PRESET_REASONS = [
  'Student Not Present / No Show',
  'Missing Required Documents',
  'Student Left Waiting Area',
  'Incorrect Service Selected',
  'Network / Transaction Delay',
  'Other Reason'
];

const SkipReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  tokenNumber,
  isLoading = false
}) => {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState('');

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Other Reason' && customNote.trim()
      ? customNote.trim()
      : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Skip Token: ${tokenNumber || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
          <UserX className="w-5 h-5 shrink-0 text-rose-600" />
          <span>
            Skipping will remove this token from the active counter queue. The reason will be recorded in audit history and notified to the student.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Select Reason for Skip
          </label>
          <div className="space-y-2">
            {PRESET_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center px-3.5 py-2.5 rounded-xl border text-sm cursor-pointer transition ${
                  selectedReason === reason
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="skipReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 text-rose-600 border-slate-300 focus:ring-rose-500"
                />
                <span className="ml-3">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        {selectedReason === 'Other Reason' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Custom Reason Details
            </label>
            <textarea
              rows="3"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Explain why the student was skipped..."
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/20"
          >
            {isLoading ? 'Skipping...' : 'Confirm Skip'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SkipReasonModal;
