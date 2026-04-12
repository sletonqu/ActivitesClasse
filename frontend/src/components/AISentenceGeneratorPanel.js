import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

const DEFAULT_PROVIDER_OPTIONS = [
  { id: "openai", label: "ChatGPT / OpenAI", configured: false, model: "gpt-4.1-mini" },
  { id: "gemini", label: "Gemini", configured: false, model: "gemini-2.0-flash" },
  { id: "mistral", label: "MistralAI", configured: false, model: "mistral-small-latest" },
];

const SCHOOL_LEVEL_OPTIONS = ["CE1", "CE2"];
const FILL_IN_THE_BLANKS_ACTIVITY_FILE = "src/activities/FillInTheBlanksActivity.js";
const BLANK_NATURE_PRIORITY = [
  "verbe",
  "nom commun",
  "nom",
  "adjectif qualificatif",
  "adjectif",
  "determinant",
  "pronom",
];

function normalizeNatureKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPunctuationEntry(item) {
  const word = String(item?.word || "").trim();
  const nature = normalizeNatureKey(item?.nature);

  return !word || nature === "ponctuation" || !/[A-Za-zÀ-ÿ0-9]/.test(word);
}

function buildFallbackSentenceConfig(result) {
  if (!result?.sentence || !Array.isArray(result.words) || result.words.length === 0) {
    return null;
  }

  const eligibleWords = result.words.filter((item) => !isPunctuationEntry(item));
  if (eligibleWords.length === 0) {
    return null;
  }

  const targetBlankCount = Math.min(4, Math.max(1, Math.round(eligibleWords.length / 3)));
  const rankedCandidates = eligibleWords
    .map((item, index) => {
      const natureKey = normalizeNatureKey(item?.nature);
      const priorityIndex = BLANK_NATURE_PRIORITY.findIndex((entry) => natureKey.includes(entry));

      return {
        ...item,
        __key: String(item?.position ?? index + 1),
        __priority: priorityIndex === -1 ? BLANK_NATURE_PRIORITY.length : priorityIndex,
        __length: String(item?.word || "").trim().length,
      };
    })
    .sort(
      (first, second) =>
        first.__priority - second.__priority ||
        second.__length - first.__length ||
        Number(first.position || 0) - Number(second.position || 0)
    );

  const selectedKeys = new Set(
    rankedCandidates.slice(0, targetBlankCount).map((item) => item.__key)
  );

  const tokens = result.words
    .map((item, index) => {
      const word = String(item?.word || "").trim();
      if (!word) {
        return null;
      }

      if (isPunctuationEntry(item)) {
        return {
          type: "punctuation",
          value: word,
        };
      }

      const tokenKey = String(item?.position ?? index + 1);
      if (selectedKeys.has(tokenKey)) {
        return {
          type: "blank",
          answer: word,
          placeholder: "Mot à glisser",
          nature: String(item?.nature || "").trim(),
          category: String(item?.category || "").trim(),
        };
      }

      return {
        type: "text",
        value: word,
      };
    })
    .filter(Boolean);

  return {
    id: `phrase-${result?.id || 1}`,
    prompt: "Complète la phrase avec les bons mots.",
    wordBank: result.words
      .filter((item, index) => selectedKeys.has(String(item?.position ?? index + 1)))
      .filter((item) => !isPunctuationEntry(item))
      .map((item) => String(item?.word || "").trim())
      .filter(Boolean),
    tokens,
  };
}

function buildFillInTheBlanksTemplate(result, fallbackLevel, fallbackTheme) {
  const generatedSentences = Array.isArray(result?.sentences) ? result.sentences : [];
  const firstSentence = generatedSentences[0] || null;
  const fallbackSentence = buildFallbackSentenceConfig(firstSentence);
  const cleanTheme = String(firstSentence?.theme || fallbackTheme || "phrase simple").trim() || "phrase simple";
  const cleanLevel = String(firstSentence?.level || fallbackLevel || "CE1").trim() || "CE1";

  if (!firstSentence) {
    return null;
  }

  return {
    title: `Phrase à trous - ${cleanTheme}`,
    description: `Complète une phrase issue de la base sur le thème « ${cleanTheme} » avec les mots manquants.`,
    status: "Active",
    jsFile: FILL_IN_THE_BLANKS_ACTIVITY_FILE,
    content: {
      title: `Complète la phrase : ${cleanTheme}`,
      instruction: "Lis la phrase puis glisse ou clique les mots manquants dans les trous.",
      showWordBank: true,
      sourceLevel: cleanLevel,
      sourceTheme: cleanTheme,
      useGeneratedSentencePool: true,
      sentences: fallbackSentence ? [fallbackSentence] : [],
    },
  };
}

const AISentenceGeneratorPanel = ({ onSentenceGenerated = null, onUseAsActivityTemplate = null }) => {
  const [providers, setProviders] = useState(DEFAULT_PROVIDER_OPTIONS);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingGeneration, setLoadingGeneration] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [schoolLevel, setSchoolLevel] = useState("CE1");
  const [theme, setTheme] = useState("animaux");
  const [maxWords, setMaxWords] = useState(6);
  const [phraseCount, setPhraseCount] = useState(3);
  const [customInstruction, setCustomInstruction] = useState("");
  const [generatedResult, setGeneratedResult] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);

  const configuredProviders = useMemo(
    () => providers.filter((item) => item.configured),
    [providers]
  );

  const generatedSentences = useMemo(
    () => (Array.isArray(generatedResult?.sentences) ? generatedResult.sentences : []),
    [generatedResult]
  );

  const generatedJsonText = useMemo(
    () => (generatedResult ? JSON.stringify(generatedResult, null, 2) : ""),
    [generatedResult]
  );

  const firstGeneratedSentence = generatedSentences[0] || null;

  const fillInTheBlanksTemplate = useMemo(
    () => buildFillInTheBlanksTemplate(generatedResult, schoolLevel, theme),
    [generatedResult, schoolLevel, theme]
  );

  useEffect(() => {
    const loadProviders = async () => {
      setLoadingProviders(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/ai/providers`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur lors du chargement des fournisseurs IA");
        }

        const nextProviders = Array.isArray(data.providers) && data.providers.length > 0
          ? data.providers
          : DEFAULT_PROVIDER_OPTIONS;

        setProviders(nextProviders);
      } catch (err) {
        setProviders(DEFAULT_PROVIDER_OPTIONS);
        setError(err.message || "Erreur inconnue");
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, []);

  useEffect(() => {
    if (configuredProviders.length === 0) {
      return;
    }

    const selectedProviderStillAvailable = configuredProviders.some((item) => item.id === provider);
    if (!selectedProviderStillAvailable) {
      setProvider(configuredProviders[0].id);
    }
  }, [configuredProviders, provider]);

  const handleGenerateSentence = async () => {
    setLoadingGeneration(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/ai/generate-sentence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          level: schoolLevel,
          theme,
          maxWords,
          phraseCount,
          customInstruction,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération de la phrase");
      }

      const nextResult = data.result || null;
      const nextTemplate = buildFillInTheBlanksTemplate(nextResult, schoolLevel, theme);

      setGeneratedResult(nextResult);
      setMessage(
        `${nextResult?.importedCount ?? 0} phrase(s) générée(s) et enregistrée(s) dans la base.`
      );

      if (typeof onSentenceGenerated === "function") {
        onSentenceGenerated(nextResult, nextTemplate);
      }
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingGeneration(false);
    }
  };

  const handleCopyJson = async () => {
    if (!generatedJsonText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedJsonText);
      setMessage("Le JSON a bien été copié.");
    } catch {
      setError("Impossible de copier le JSON automatiquement.");
    }
  };

  const handleCopySentence = async () => {
    if (generatedSentences.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedSentences.map((item) => item.sentence).join("\n"));
      setMessage("Les phrases ont bien été copiées.");
    } catch {
      setError("Impossible de copier la phrase automatiquement.");
    }
  };

  const handleUseAsActivityTemplate = () => {
    if (!fillInTheBlanksTemplate) {
      return;
    }

    if (typeof onUseAsActivityTemplate === "function") {
      onUseAsActivityTemplate(fillInTheBlanksTemplate);
      setMessage("La base de l'activité phrase à trous a été envoyée vers le formulaire des activités avec un chargement depuis la base de phrases.");
      return;
    }

    setError("Aucun formulaire d'activité n'est disponible pour recevoir cette configuration.");
  };

  return (
    <div
      id="ai-sentence-generator-section"
      className="mt-6 rounded-xl border border-violet-200 bg-violet-50/60 p-4"
    >
      <div id="ai-sentence-generator-header" className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 id="ai-sentence-generator-title" className="text-lg font-bold text-slate-800">
            Générateur de phrases par IA
          </h4>
          <p id="ai-sentence-generator-description" className="text-sm text-slate-600 max-w-3xl">
            Génère une phrase simple pour un élève de CE1 / CE2 et récupère un JSON avec chaque mot,
            sa nature et sa catégorie grammaticale. Le réglage vise une réponse courte pour limiter la consommation IA.
          </p>
        </div>

        <div id="ai-sentence-generator-format-badge" className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-violet-700">
          Format : <span className="font-mono">sentences[]</span> + <span className="font-mono">words[]</span>
        </div>
      </div>

      <div id="ai-sentence-generator-provider-state" className="mt-3 flex flex-wrap gap-2 text-xs">
        {providers.map((item) => (
          <span
            key={item.id}
            className={`rounded-full px-2.5 py-1 border ${
              item.configured
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            {item.label} : {item.configured ? "clé détectée" : "clé absente"}
          </span>
        ))}
      </div>

      <div id="ai-sentence-generator-form" className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <div id="ai-sentence-generator-provider-field">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Fournisseur IA</label>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            disabled={loadingProviders || configuredProviders.length === 0}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
          >
            {providers.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.configured}>
                {item.label} {item.model ? `(${item.model})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div id="ai-sentence-generator-level-field">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Niveau</label>
          <select
            value={schoolLevel}
            onChange={(event) => setSchoolLevel(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            {SCHOOL_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div id="ai-sentence-generator-theme-field">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Thème</label>
          <input
            type="text"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="animaux, école, nature..."
          />
        </div>

        <div id="ai-sentence-generator-max-words-field">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre de mots</label>
          <input
            type="number"
            min="3"
            max="10"
            value={maxWords}
            onChange={(event) => setMaxWords(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div id="ai-sentence-generator-phrase-count-field">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre de phrases</label>
          <input
            type="number"
            min="1"
            max="12"
            value={phraseCount}
            onChange={(event) => setPhraseCount(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      </div>

      <div id="ai-sentence-generator-instruction-field" className="mt-4">
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Consigne complémentaire (facultatif)
        </label>
        <textarea
          value={customInstruction}
          onChange={(event) => setCustomInstruction(event.target.value)}
          className="h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Ex : utiliser un verbe au présent et un adjectif simple."
        />
      </div>

      <div id="ai-sentence-generator-actions" className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerateSentence}
          disabled={loadingGeneration || loadingProviders || configuredProviders.length === 0}
          className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {loadingGeneration ? "Génération en cours..." : "Générer les phrases"}
        </button>

        {generatedResult && (
          <>
            <button
              type="button"
              onClick={handleCopySentence}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Copier les phrases
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Copier le JSON
            </button>
            {fillInTheBlanksTemplate && (
              <button
                type="button"
                onClick={handleUseAsActivityTemplate}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Utiliser dans Gestion des activités
              </button>
            )}
          </>
        )}
      </div>

      <p id="ai-sentence-generator-help" className="mt-3 text-xs text-slate-500">
        Clés attendues côté backend : <span className="font-mono">OPENAI_API_KEY</span>, <span className="font-mono">GEMINI_API_KEY</span> ou <span className="font-mono">MISTRAL_API_KEY</span>.
      </p>

      {configuredProviders.length === 0 && !loadingProviders && (
        <div
          id="ai-sentence-generator-warning"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          Aucun fournisseur IA n'est configuré pour le moment. Ajoutez au moins une clé API dans le backend pour activer la génération.
        </div>
      )}

      {showMessage && message && (
        <div
          id="ai-sentence-generator-message"
          className={`mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
            fadeMessage ? "opacity-0" : "opacity-100"
          }`}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          id="ai-sentence-generator-error"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {generatedResult && (
        <div id="ai-sentence-generator-result" className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div id="ai-sentence-generator-sentence-preview" className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Phrases générées</div>
              <div className="space-y-2 text-sm text-slate-800">
                {generatedSentences.map((sentence, index) => (
                  <div key={sentence.id || `${index}-${sentence.sentence}`} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                    <span className="mr-2 font-semibold text-violet-700">#{index + 1}</span>
                    {sentence.sentence}
                    <span className="ml-2 text-xs text-slate-500">(compteur : {sentence.compteur ?? 0})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div><span className="font-semibold">Demandées :</span> {generatedResult.requestedCount ?? generatedSentences.length}</div>
              <div><span className="font-semibold">Générées :</span> {generatedResult.generatedCount ?? generatedSentences.length}</div>
              <div><span className="font-semibold">Importées en base :</span> {generatedResult.importedCount ?? generatedSentences.length}</div>
              <div><span className="font-semibold">Niveau :</span> {firstGeneratedSentence?.level || schoolLevel}</div>
              <div><span className="font-semibold">Thème :</span> {firstGeneratedSentence?.theme || theme}</div>
            </div>
          </div>

          {firstGeneratedSentence && (
            <div id="ai-sentence-generator-words-list" className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {Array.isArray(firstGeneratedSentence.words) && firstGeneratedSentence.words.map((item) => (
                <div
                  key={`${item.position}-${item.word}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="font-semibold text-slate-800">
                    {item.position}. {item.word}
                  </div>
                  <div className="text-slate-600">Nature : {item.nature}</div>
                  <div className="text-slate-600">Catégorie : {item.category}</div>
                </div>
              ))}
            </div>
          )}

          <div id="ai-sentence-generator-json-field">
            <label className="mb-1 block text-sm font-semibold text-slate-700">JSON généré</label>
            <textarea
              readOnly
              value={generatedJsonText}
              className="h-72 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AISentenceGeneratorPanel;
