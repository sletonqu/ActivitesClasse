import React, { useEffect, useState } from "react";

export const JSON_EDITOR_MODAL_DEFAULT_WIDTH = 900;
export const JSON_EDITOR_MODAL_DEFAULT_HEIGHT = 700;

const getResponsiveModalHeight = (value, requestedHeight) => {
  const minimumHeight = Math.max(requestedHeight, JSON_EDITOR_MODAL_DEFAULT_HEIGHT);
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : minimumHeight;
  const maxAllowedHeight = Math.max(minimumHeight, viewportHeight - 48);
  const lineCount = Math.max(1, (value || "").split(/\r?\n/).length);
  const contentDrivenHeight = Math.max(minimumHeight, Math.min(maxAllowedHeight, lineCount * 24 + 160));

  return Math.min(contentDrivenHeight, maxAllowedHeight);
};

const JsonEditorModal = ({
  isOpen,
  initialValue = "{}",
  title = "Éditer le JSON",
  onClose,
  onSave,
  width = JSON_EDITOR_MODAL_DEFAULT_WIDTH,
  height = JSON_EDITOR_MODAL_DEFAULT_HEIGHT,
}) => {
  const [draftValue, setDraftValue] = useState(initialValue || "{}");
  const [errorMessage, setErrorMessage] = useState("");
  const modalHeight = getResponsiveModalHeight(draftValue, height);

  useEffect(() => {
    if (isOpen) {
      setDraftValue(initialValue || "{}");
      setErrorMessage("");
    }
  }, [isOpen, initialValue]);

  if (!isOpen) {
    return null;
  }

  const handleWheelScroll = (event) => {
    const target = event.currentTarget;
    const delta = event.deltaY || event.wheelDelta / 4;
    target.scrollTop += delta;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSave = () => {
    const normalizedValue = draftValue.trim() || "{}";

    try {
      JSON.parse(normalizedValue);
      onSave?.(normalizedValue);
      onClose?.();
    } catch (error) {
      setErrorMessage(`JSON invalide : ${error.message}`);
    }
  };

  return (
    <div id="json-editor-modal-backdrop" className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 px-4 py-4">
      <div
        id="json-editor-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ width: `${width}px`, height: `${modalHeight}px`, maxHeight: `${modalHeight}px` }}
      >
        <div id="json-editor-modal-header" className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div id="json-editor-modal-title-block">
            <h3 id="json-editor-modal-title" className="text-lg font-semibold text-slate-800">{title}</h3>
            <p id="json-editor-modal-subtitle" className="text-sm text-slate-500">Modifiez le contenu JSON puis enregistrez.</p>
          </div>
          <div id="json-editor-modal-header-actions" className="flex items-center gap-2">
            <button
              id="json-editor-modal-cancel-button"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              id="json-editor-modal-save-button"
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Enregistrer
            </button>
          </div>
        </div>

        <div id="json-editor-modal-body" className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <div id="json-editor-modal-editor-wrapper" className="flex-1 min-h-0 rounded-xl border border-slate-300 bg-slate-950">
            <textarea
              id="json-editor-modal-textarea"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onWheel={handleWheelScroll}
              onMouseEnter={(event) => event.currentTarget.focus()}
              spellCheck={false}
              className="h-full min-h-[220px] w-full resize-none overflow-auto bg-transparent p-3 font-mono text-sm text-slate-100 outline-none"
            />
          </div>
        </div>

        {errorMessage && (
          <div id="json-editor-modal-error" className="mx-4 mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

      </div>
    </div>
  );
};

export default JsonEditorModal;
