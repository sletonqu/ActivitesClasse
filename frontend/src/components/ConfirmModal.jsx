import React from "react";
import { createPortal } from "react-dom";

const ConfirmModal = ({
  isOpen,
  title = "Confirmation",
  message = "Êtes-vous sûr de vouloir continuer ?",
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  confirmStyle = "primary", // "primary" or "danger"
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      id="confirm-modal-backdrop"
      className="fixed inset-0 z-1000 flex items-center justify-center bg-slate-950/70 px-4 py-4 backdrop-blur-xs"
    >
      <div
        id="confirm-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 py-6">
          <p id="confirm-modal-message" className="text-slate-600">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button
            id="confirm-modal-cancel-button"
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            id="confirm-modal-confirm-button"
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              confirmStyle === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default ConfirmModal;
