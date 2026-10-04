import React, { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

const HandwritingOCRModal = ({
  isOpen,
  activeFieldLabel,
  onRecognized,
  onClose,
  mode = "normal", // "normal" or "minimal"
  overlayType = "Blur", // "Blur" or "Normal"
  maxWidth = "max-w-xl", // Tailwind max-w class
  position = null // { top, left }
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas size (logical pixels)
      canvas.width = 600;
      canvas.height = 400;

      // Reset canvas state
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 24;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [isOpen]);

  const getPointerPos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();

    // Support both mouse and touch events
    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate position relative to canvas logical size
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setLastPos(getPointerPos(e));
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;

    const pos = getPointerPos(e);
    const ctx = canvasRef.current.getContext("2d");

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleValidate = async () => {
    if (!canvasRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;

      // OCR configuration: English digits whitelist for accuracy
      const result = await Tesseract.recognize(canvas, 'eng', {
        logger: (m) => console.log(m),
        tessedit_char_whitelist: '0123456789',
      });

      const recognizedText = result.data.text.trim().replace(/[^0-9]/g, "");
      onRecognized(recognizedText);
      clearCanvas();
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const isMinimal = mode === "minimal";
  const overlayClass = overlayType === "Blur" ? "backdrop-blur-md" : "";
  const containerStyle = position ? { position: 'fixed', top: position.top, left: position.left, transform: 'none' } : {};

  return (
    <div
      id="ocr-modal-overlay"
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 ${overlayClass}`}
    >
      <div
        id="ocr-modal-container"
        style={containerStyle}
        className={`w-full ${maxWidth} rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5 sm:p-6`}
      >
        <div id="ocr-modal-header" className={`flex items-start justify-between ${isMinimal ? "mb-2" : "mb-6"}`}>
          <div id="ocr-modal-title-area">
            {!isMinimal && (<h3 id="ocr-modal-title" className="text-xl font-black tracking-tight text-slate-800 sm:text-2xl">Écriture Manuscrite</h3>)}
            <p id="ocr-modal-subtitle" className="text-xs font-medium text-indigo-600 sm:text-sm">
              {activeFieldLabel || "Saisie de nombre"}
            </p>
          </div>

          <div id="ocr-modal-actions" className="flex items-center gap-2">
            <button
              id="ocr-clear-button-small"
              title="Effacer"
              onClick={clearCanvas}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition hover:bg-amber-200 hover:text-amber-700"
            >
              <span className="text-lg">↺</span>
            </button>
            <button
              id="ocr-validate-button-small"
              title="Valider"
              onClick={handleValidate}
              disabled={isProcessing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition hover:bg-emerald-200 hover:text-emerald-700 disabled:opacity-50"
            >
              <span className="text-lg">✓</span>
            </button>
            <button
              id="ocr-modal-close-icon"
              title="Fermer"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>
        </div>

        {!isMinimal && (
          <p className="mb-4 text-xs text-slate-600 sm:text-sm">
            Écris le nombre ci-dessous avec ton doigt ou ton stylet, puis valide.
          </p>
        )}

        <div
          id="ocr-canvas-container"
          className={`relative overflow-hidden rounded-2xl border-4 border-slate-100 bg-white shadow-inner ${isMinimal ? "" : "mb-2"}`}
        >
          <canvas
            id="ocr-drawing-canvas"
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="h-auto w-full cursor-crosshair touch-none bg-white"
            style={{ aspectRatio: '3 / 2' }}
          />

          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              {!isMinimal && (
                <>
                  <p className="mt-4 text-base font-bold text-slate-800">Analyse en cours...</p>
                  <p className="text-xs text-slate-500">Tesseract reconnaît tes chiffres</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandwritingOCRModal;
