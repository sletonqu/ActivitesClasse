import React, { useRef, useState } from "react";
import { IAGenerated } from "./ActionIcons";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

export function resolveVocabularyImageUrl(imageUrl) {
  const clean = String(imageUrl || "").trim();
  if (!clean) return "";
  if (clean.startsWith("data:") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  const normalizedPath = clean.replace(/^\/+/, "").replace(/^api\/+/, "");
  const apiBase = String(API_URL || "/api").replace(/\/+$/, "");
  return `${apiBase}/${normalizedPath}`;
}

export function buildGeminiImagePromptText(word = "", imagePrompt = "") {
  const basePrompt = String(imagePrompt || "").trim() || `Illustration pour le mot « ${word || "vocabulaire"} »`;
  return `Génère une illustration pour enfants d'école primaire (style livre jeunesse coloré, doux, expressif, sans aucun texte ni mot écrit dans l'image) : ${basePrompt}`;
}

export function buildGeminiWebUrl(word = "", imagePrompt = "") {
  const promptText = buildGeminiImagePromptText(word, imagePrompt);
  const url = new URL("https://gemini.google.com/app");
  url.searchParams.set("prompt", promptText);
  url.searchParams.set("q", promptText);
  return url.toString();
}

const VocabularyImagePreview = ({
  wordIndex = 0,
  wordId = null,
  word = "",
  imageUrl = "",
  imagePrompt = "",
  provider = "openai",
  onChangeImagePrompt,
  onChangeImageUrl,
}) => {
  const fileInputRef = useRef(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imageError, setImageError] = useState("");
  const [helperMessage, setHelperMessage] = useState("");

  const { show: showHelperMessage, fade: fadeHelperMessage } = useAutoDismissMessage(
    helperMessage,
    setHelperMessage
  );

  const resolvedSrc = resolveVocabularyImageUrl(imageUrl);

  const handleGenerateAiImage = async () => {
    setGeneratingImage(true);
    setImageError("");
    try {
      const resp = await fetch(`${API_URL}/ai/vocabulary/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: wordId || undefined,
          word,
          prompt: imagePrompt,
          provider,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la génération de l'image.");
      }
      if (onChangeImageUrl) {
        onChangeImageUrl(data.imageUrl || "");
      }
    } catch (err) {
      setImageError(err.message || "Impossible de générer l'image.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const uploadFileAsBase64 = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP, SVG).");
      return;
    }

    setUploadingImage(true);
    setImageError("");

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
        reader.readAsDataURL(file);
      });

      const endpoint = wordId
        ? `${API_URL}/vocabulary/words/${wordId}/image-upload`
        : `${API_URL}/vocabulary/image-upload`;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: dataUrl,
          previousImageUrl: imageUrl || "",
          imagePrompt,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de l'import de l'image.");
      }

      if (onChangeImageUrl) {
        onChangeImageUrl(data.imageUrl || "");
      }
    } catch (err) {
      setImageError(err.message || "Erreur lors de l'import du fichier.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      void uploadFileAsBase64(file);
    }
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void uploadFileAsBase64(file);
      return;
    }

    // Support du glisser-déposer direct d'une image depuis la fenêtre popup Gemini
    const htmlData = event.dataTransfer?.getData("text/html") || "";
    const uriData = event.dataTransfer?.getData("text/uri-list") || "";
    const imgMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i);
    const droppedUrl = imgMatch?.[1] || uriData.trim();

    if (droppedUrl) {
      if (droppedUrl.startsWith("data:image/")) {
        try {
          const res = await fetch(droppedUrl);
          const blob = await res.blob();
          await uploadFileAsBase64(new File([blob], "dropped-image.png", { type: blob.type || "image/png" }));
          return;
        } catch {
          // fallback ci-dessous
        }
      }
      try {
        const res = await fetch(droppedUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.type.startsWith("image/")) {
            await uploadFileAsBase64(new File([blob], "dropped-image.png", { type: blob.type }));
            return;
          }
        }
      } catch {
        setImageError(
          "Le navigateur bloque le glisser-déposer direct depuis cet onglet externe : faites clic droit « Copier l'image » dans Gemini puis cliquez sur « 📋 Coller l'image »."
        );
      }
    }
  };

  const handlePasteEvent = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          event.preventDefault();
          void uploadFileAsBase64(blob);
          return;
        }
      }
    }
  };

  const handlePasteFromClipboardButton = async () => {
    setImageError("");
    try {
      if (!navigator?.clipboard?.read) {
        throw new Error(
          "Cliquez dans la zone en pointillés puis appuyez sur Ctrl+V pour coller l'image."
        );
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          const file = new File([blob], `gemini-image.${ext}`, { type: imageType });
          await uploadFileAsBase64(file);
          setHelperMessage("Image collée depuis le presse-papiers !");
          return;
        }
      }
      throw new Error("Aucune image trouvée dans le presse-papiers (copiez d'abord l'image dans Gemini).");
    } catch (err) {
      setImageError(
        err.message ||
        "Impossible de lire le presse-papiers. Cliquez sur la zone en pointillés et faites Ctrl+V."
      );
    }
  };

  const handleOpenGeminiWithPrompt = async () => {
    const fullPrompt = buildGeminiImagePromptText(word, imagePrompt);
    const geminiUrl = buildGeminiWebUrl(word, imagePrompt);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullPrompt);
        setHelperMessage(
          "Prompt copié ! Faites Ctrl+V dans la fenêtre Gemini, puis glissez l'image générée ici."
        );
      }
    } catch {
      // ignore clipboard error
    }

    const width = 680;
    const height = 760;
    const screenW = typeof window !== "undefined" ? window.screen?.availWidth || 1280 : 1280;
    const screenH = typeof window !== "undefined" ? window.screen?.availHeight || 800 : 800;
    const left = Math.max(0, screenW - width - 20);
    const top = Math.max(0, Math.round((screenH - height) / 2));

    const popupFeatures = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const popupWindow = window.open(geminiUrl, "GeminiVocabularyGenerator", popupFeatures);
    if (popupWindow && typeof popupWindow.focus === "function") {
      popupWindow.focus();
    }
  };

  return (
    <div
      id={`vocabulary-image-preview-${wordIndex}`}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
          🖼️ Illustration du mot « {word || "..."} »
        </span>
        {imageUrl && (
          <button
            id={`vocabulary-image-remove-${wordIndex}`}
            type="button"
            onClick={() => onChangeImageUrl && onChangeImageUrl("")}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
          >
            Retirer l'image
          </button>
        )}
      </div>

      <div>
        <label
          htmlFor={`vocabulary-image-prompt-${wordIndex}`}
          className="mb-1 block text-xs font-semibold text-slate-700"
        >
          Description de l'image (prompt IA)
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={`vocabulary-image-prompt-${wordIndex}`}
            type="text"
            value={imagePrompt || ""}
            onChange={(e) => onChangeImagePrompt && onChangeImagePrompt(e.target.value)}
            placeholder="Ex : Un renard souriant à l'air malicieux, illustration enfantine..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
          <button
            id={`vocabulary-image-generate-button-${wordIndex}`}
            type="button"
            onClick={handleGenerateAiImage}
            disabled={generatingImage || uploadingImage}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <IAGenerated className="h-3.5 w-3.5" />
            {generatingImage ? "Génération..." : imageUrl ? "Regénérer par IA" : "Générer par IA"}
          </button>
          <button
            id={`vocabulary-image-open-gemini-button-${wordIndex}`}
            type="button"
            onClick={handleOpenGeminiWithPrompt}
            title="Copie automatiquement le prompt dans le presse-papiers et ouvre gemini.google.com"
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
          >
            🌟 Ouvrir Gemini (+ copie prompt) ↗
          </button>
        </div>
      </div>

      {showHelperMessage && helperMessage && (
        <div
          id={`vocabulary-image-helper-msg-${wordIndex}`}
          className={`rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition-opacity duration-500 ${fadeHelperMessage ? "opacity-0" : "opacity-100"
            }`}
        >
          {helperMessage}
        </div>
      )}

      <div
        id={`vocabulary-image-dropzone-${wordIndex}`}
        tabIndex={0}
        onPaste={handlePasteEvent}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border-2 border-dashed p-3 transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-400 ${isDraggingOver
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-300 bg-white"
          }`}
      >
        {resolvedSrc ? (
          <div className="flex items-center gap-3">
            <img
              id={`vocabulary-image-img-${wordIndex}`}
              src={resolvedSrc}
              alt={word || "Illustration"}
              className="h-20 w-28 rounded-lg border border-slate-200 object-cover bg-slate-100"
            />
            <div className="text-xs text-emerald-700 font-semibold">
              ✅ Image prête pour l'étape Découverte & Définition
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            Aucune image : génère-la par IA, glisse un fichier (Drag & Drop) ou colle une image copiée (Ctrl+V).
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id={`vocabulary-image-file-input-${wordIndex}`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            id={`vocabulary-image-paste-button-${wordIndex}`}
            type="button"
            onClick={handlePasteFromClipboardButton}
            disabled={uploadingImage || generatingImage}
            title="Coller directement une image copiée depuis Gemini (ou clic + Ctrl+V)"
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
          >
            📋 Coller l'image
          </button>
          <button
            id={`vocabulary-image-browse-button-${wordIndex}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage || generatingImage}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            {uploadingImage ? "Import..." : "📂 Importer"}
          </button>
        </div>
      </div>

      {imageError && (
        <div
          id={`vocabulary-image-error-${wordIndex}`}
          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700"
        >
          {imageError}
        </div>
      )}
    </div>
  );
};

export default VocabularyImagePreview;
