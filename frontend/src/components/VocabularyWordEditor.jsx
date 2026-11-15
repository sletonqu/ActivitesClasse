import React, { useState } from "react";
import { DeleteIcon } from "./ActionIcons";
import { API_URL } from "../config/api";
import VocabularyImagePreview from "./VocabularyImagePreview";

const NATURE_OPTIONS = [
  "nom commun",
  "verbe",
  "adjectif qualificatif",
  "adverbe",
  "nom propre",
];

function computeClozeFromFull(sentence, targetWord) {
  const cleanSentence = String(sentence || "").trim();
  const cleanWord = String(targetWord || "").trim();
  if (!cleanSentence) return "";
  if (cleanSentence.includes("_____")) return cleanSentence;
  if (!cleanWord) return cleanSentence;

  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactRegex = new RegExp(`(^|[^\\p{L}])(${escaped})(?=[^\\p{L}]|$)`, "iu");
  if (exactRegex.test(cleanSentence)) {
    return cleanSentence.replace(exactRegex, "$1_____");
  }
  return `${cleanSentence} (_____)`;
}

const VocabularyWordEditor = ({
  index = 0,
  wordData,
  level = "CE1",
  theme = "",
  provider = "gemini",
  onChange,
  onDelete,
}) => {
  const [regeneratingTarget, setRegeneratingTarget] = useState("");
  const [regenError, setRegenError] = useState("");

  const distractorsArray = Array.isArray(wordData?.distractors)
    ? wordData.distractors
    : [];
  const distractor1 = distractorsArray[0] || "";
  const distractor2 = distractorsArray[1] || "";

  const updateField = (patch) => {
    if (onChange) {
      onChange({
        ...wordData,
        ...patch,
      });
    }
  };

  const handleRegenerate = async (targetField = "all") => {
    const cleanWord = String(wordData?.word || "").trim();
    if (!cleanWord) {
      setRegenError("Saisissez d'abord le mot avant de le regénérer.");
      return;
    }

    setRegeneratingTarget(targetField);
    setRegenError("");

    try {
      const resp = await fetch(`${API_URL}/ai/vocabulary/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: [cleanWord],
          level,
          theme,
          provider,
          targetField: targetField === "all" ? "" : targetField,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Erreur lors de la régénération IA.");
      }

      const generated = Array.isArray(data.items) ? data.items[0] : null;
      if (!generated) {
        throw new Error("Aucune proposition reçue de l'IA.");
      }

      if (targetField === "definition") {
        updateField({
          definition: generated.definition || wordData.definition,
          nature: generated.nature || wordData.nature,
        });
      } else if (targetField === "sentence1") {
        updateField({
          sentence1_full: generated.sentence1_full || wordData.sentence1_full,
          sentence1_cloze: generated.sentence1_cloze || wordData.sentence1_cloze,
          sentence1_id: generated.sentence1_id || wordData.sentence1_id,
        });
      } else if (targetField === "sentence2") {
        updateField({
          sentence2_full: generated.sentence2_full || wordData.sentence2_full,
          sentence2_cloze: generated.sentence2_cloze || wordData.sentence2_cloze,
          sentence2_id: generated.sentence2_id || wordData.sentence2_id,
        });
      } else if (targetField === "distractors") {
        updateField({
          distractors: Array.isArray(generated.distractors)
            ? generated.distractors
            : wordData.distractors,
        });
      } else {
        updateField({
          nature: generated.nature || wordData.nature,
          definition: generated.definition || wordData.definition,
          sentence1_full: generated.sentence1_full || wordData.sentence1_full,
          sentence1_cloze: generated.sentence1_cloze || wordData.sentence1_cloze,
          sentence1_id: generated.sentence1_id || wordData.sentence1_id,
          sentence2_full: generated.sentence2_full || wordData.sentence2_full,
          sentence2_cloze: generated.sentence2_cloze || wordData.sentence2_cloze,
          sentence2_id: generated.sentence2_id || wordData.sentence2_id,
          distractors: Array.isArray(generated.distractors)
            ? generated.distractors
            : wordData.distractors,
          image_prompt: generated.imagePrompt || generated.image_prompt || wordData.image_prompt,
          imagePrompt: generated.imagePrompt || generated.image_prompt || wordData.imagePrompt,
        });
      }
    } catch (err) {
      setRegenError(err.message || "Erreur lors de la régénération.");
    } finally {
      setRegeneratingTarget("");
    }
  };

  return (
    <div
      id={`vocabulary-word-editor-${index}`}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-extrabold text-indigo-800">
            {index + 1}
          </span>
          <span className="text-sm font-extrabold text-slate-800">
            Mot : « {wordData?.word || "Nouveau mot"} »
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id={`vocabulary-word-regen-all-${index}`}
            type="button"
            onClick={() => handleRegenerate("all")}
            disabled={Boolean(regeneratingTarget)}
            className="rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-60"
          >
            {regeneratingTarget === "all" ? "Régénération..." : "🔄 Regénérer tout ce mot"}
          </button>
          {onDelete && (
            <button
              id={`vocabulary-word-delete-${index}`}
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700"
            >
              <DeleteIcon className="h-3.5 w-3.5" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      {regenError && (
        <div
          id={`vocabulary-word-regen-error-${index}`}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700"
        >
          {regenError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            htmlFor={`vocabulary-word-input-${index}`}
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Mot à apprendre
          </label>
          <input
            id={`vocabulary-word-input-${index}`}
            type="text"
            value={wordData?.word || ""}
            onChange={(e) => updateField({ word: e.target.value })}
            placeholder="Ex : rusé"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label
            htmlFor={`vocabulary-word-nature-${index}`}
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Nature grammaticale
          </label>
          <select
            id={`vocabulary-word-nature-${index}`}
            value={wordData?.nature || "nom commun"}
            onChange={(e) => updateField({ nature: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          >
            {NATURE_OPTIONS.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Définition */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor={`vocabulary-word-definition-${index}`}
            className="text-xs font-semibold text-slate-700"
          >
            Définition (adaptée CE1/CE2)
          </label>
          <button
            id={`vocabulary-word-regen-definition-${index}`}
            type="button"
            onClick={() => handleRegenerate("definition")}
            disabled={Boolean(regeneratingTarget)}
            className="text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
          >
            {regeneratingTarget === "definition" ? "Régénération..." : "🔄 Regénérer la définition"}
          </button>
        </div>
        <input
          id={`vocabulary-word-definition-${index}`}
          type="text"
          value={wordData?.definition || ""}
          onChange={(e) => updateField({ definition: e.target.value })}
          placeholder="Ex : Qui utilise des astuces malines pour réussir."
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Phrase 1 */}
      <div className="grid gap-2 sm:grid-cols-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor={`vocabulary-word-sentence1-full-${index}`}
              className="text-xs font-semibold text-slate-700"
            >
              Phrase 1 complète (stockée dans la base de phrases)
            </label>
            <button
              id={`vocabulary-word-regen-sentence1-${index}`}
              type="button"
              onClick={() => handleRegenerate("sentence1")}
              disabled={Boolean(regeneratingTarget)}
              className="text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
            >
              {regeneratingTarget === "sentence1" ? "..." : "🔄 Regénérer"}
            </button>
          </div>
          <input
            id={`vocabulary-word-sentence1-full-${index}`}
            type="text"
            value={wordData?.sentence1_full || ""}
            onChange={(e) => {
              const nextFull = e.target.value;
              updateField({
                sentence1_full: nextFull,
                sentence1_cloze: computeClozeFromFull(nextFull, wordData?.word),
              });
            }}
            placeholder="Ex : Le renard est un animal très rusé."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label
            htmlFor={`vocabulary-word-sentence1-cloze-${index}`}
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Phrase 1 à trou (affichée à l'élève avec _____)
          </label>
          <input
            id={`vocabulary-word-sentence1-cloze-${index}`}
            type="text"
            value={wordData?.sentence1_cloze || ""}
            onChange={(e) => updateField({ sentence1_cloze: e.target.value })}
            placeholder="Ex : Le renard est un animal très _____."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Phrase 2 */}
      <div className="grid gap-2 sm:grid-cols-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor={`vocabulary-word-sentence2-full-${index}`}
              className="text-xs font-semibold text-slate-700"
            >
              Phrase 2 complète (stockée dans la base de phrases)
            </label>
            <button
              id={`vocabulary-word-regen-sentence2-${index}`}
              type="button"
              onClick={() => handleRegenerate("sentence2")}
              disabled={Boolean(regeneratingTarget)}
              className="text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
            >
              {regeneratingTarget === "sentence2" ? "..." : "🔄 Regénérer"}
            </button>
          </div>
          <input
            id={`vocabulary-word-sentence2-full-${index}`}
            type="text"
            value={wordData?.sentence2_full || ""}
            onChange={(e) => {
              const nextFull = e.target.value;
              updateField({
                sentence2_full: nextFull,
                sentence2_cloze: computeClozeFromFull(nextFull, wordData?.word),
              });
            }}
            placeholder="Ex : Ce joueur rusé a trouvé la cachette."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label
            htmlFor={`vocabulary-word-sentence2-cloze-${index}`}
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Phrase 2 à trou (affichée à l'élève avec _____)
          </label>
          <input
            id={`vocabulary-word-sentence2-cloze-${index}`}
            type="text"
            value={wordData?.sentence2_cloze || ""}
            onChange={(e) => updateField({ sentence2_cloze: e.target.value })}
            placeholder="Ex : Ce joueur _____ a trouvé la cachette."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Mots intrus (distracteurs) */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            🎲 2 mots intrus (même nature grammaticale et même thème)
          </span>
          <button
            id={`vocabulary-word-regen-distractors-${index}`}
            type="button"
            onClick={() => handleRegenerate("distractors")}
            disabled={Boolean(regeneratingTarget)}
            className="text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
          >
            {regeneratingTarget === "distractors" ? "..." : "🔄 Regénérer les intrus"}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            id={`vocabulary-word-distractor1-${index}`}
            type="text"
            value={distractor1}
            onChange={(e) => updateField({ distractors: [e.target.value, distractor2] })}
            placeholder="Intrus 1 (ex : courageux)"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
          <input
            id={`vocabulary-word-distractor2-${index}`}
            type="text"
            value={distractor2}
            onChange={(e) => updateField({ distractors: [distractor1, e.target.value] })}
            placeholder="Intrus 2 (ex : timide)"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Illustration IA ou Import */}
      <VocabularyImagePreview
        wordIndex={index}
        wordId={wordData?.id || null}
        word={wordData?.word || ""}
        imageUrl={wordData?.image_url || wordData?.imageUrl || ""}
        imagePrompt={wordData?.image_prompt || wordData?.imagePrompt || ""}
        provider={provider}
        onChangeImagePrompt={(nextPrompt) =>
          updateField({ image_prompt: nextPrompt, imagePrompt: nextPrompt })
        }
        onChangeImageUrl={(nextUrl) =>
          updateField({ image_url: nextUrl, imageUrl: nextUrl })
        }
      />
    </div>
  );
};

export default VocabularyWordEditor;
