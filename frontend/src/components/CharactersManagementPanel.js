import React, { useMemo, useState } from "react";
import CharacterSprite from "./CharacterSprite";

const CHARACTER_OPTIONS = [
  { key: "nom", label: "Nom", src: "/images/Nom.png" },
  { key: "verbe", label: "Verbe", src: "/images/Verbe.png" },
  { key: "adjectif", label: "Adjectif", src: "/images/Adjectif.png" },
  { key: "pronom", label: "Pronom personnel", src: "/images/PronomPersonnel.png" },
  { key: "determinant", label: "Déterminant", src: "/images/Déterminant.png" },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const CharactersManagementPanel = ({ hideTitle = false }) => {
  const [selectedCharacterKey, setSelectedCharacterKey] = useState(CHARACTER_OPTIONS[0].key);
  const [position, setPosition] = useState(0);
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(3);
  const [size, setSize] = useState(88);
  const [spriteId, setSpriteId] = useState("admin-character-preview-sprite");
  const [spriteAlt, setSpriteAlt] = useState("Personnage grammatical");
  const [spriteClassName, setSpriteClassName] = useState("shadow-md rounded-lg");
  const [customSrc, setCustomSrc] = useState("");

  const selectedCharacter = useMemo(
    () => CHARACTER_OPTIONS.find((option) => option.key === selectedCharacterKey) || CHARACTER_OPTIONS[0],
    [selectedCharacterKey]
  );

  const safeColumns = clamp(Math.floor(Number(columns) || 1), 1, 12);
  const safeRows = clamp(Math.floor(Number(rows) || 1), 1, 12);
  const frameCount = safeColumns * safeRows;
  const safePosition = clamp(Math.floor(Number(position) || 0), 0, Math.max(frameCount - 1, 0));
  const safeSize = clamp(Math.floor(Number(size) || 88), 24, 320);
  const resolvedSrc = customSrc.trim() || selectedCharacter.src;

  const previewCode = `<CharacterSprite\n  id=\"${spriteId || "character-sprite"}\"\n  src=\"${resolvedSrc}\"\n  position={${safePosition}}\n  columns={${safeColumns}}\n  rows={${safeRows}}\n  size={${safeSize}}\n  alt=\"${spriteAlt || "Personnage grammatical"}\"\n  className=\"${spriteClassName}\"\n/>`;

  return (
    <section id="characters-management-section" className="w-full rounded-xl bg-white p-6 shadow mb-6">
      <div id="characters-management-header" className="mb-4 flex flex-col gap-2">
        {!hideTitle && (
          <h3 id="characters-management-title" className="text-xl font-bold text-slate-800">
            Gestion des personnages
          </h3>
        )}
        <p id="characters-management-description" className="text-sm text-slate-600">
          Visualise un personnage par nom et par position, puis ajuste les paramètres du composant CharacterSprite.
        </p>
      </div>

      <div id="characters-management-layout" className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div id="characters-management-controls" className="grid gap-4 sm:grid-cols-2">
          <div id="characters-management-character-field" className="sm:col-span-2">
            <label htmlFor="characters-management-character-select" className="mb-1 block text-sm font-semibold text-slate-700">
              Nom du personnage
            </label>
            <select
              id="characters-management-character-select"
              value={selectedCharacterKey}
              onChange={(event) => setSelectedCharacterKey(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {CHARACTER_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div id="characters-management-position-field" className="sm:col-span-2">
            <label htmlFor="characters-management-position-input" className="mb-1 block text-sm font-semibold text-slate-700">
              Position de la pose
            </label>
            <input
              id="characters-management-position-input"
              type="range"
              min={0}
              max={Math.max(frameCount - 1, 0)}
              value={safePosition}
              onChange={(event) => setPosition(Number(event.target.value))}
              className="w-full"
            />
            <div className="mt-1 text-xs text-slate-600">Position actuelle : {safePosition}</div>
          </div>

          <div id="characters-management-columns-field">
            <label htmlFor="characters-management-columns-input" className="mb-1 block text-sm font-semibold text-slate-700">
              Colonnes
            </label>
            <input
              id="characters-management-columns-input"
              type="number"
              min={1}
              max={12}
              value={safeColumns}
              onChange={(event) => setColumns(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div id="characters-management-rows-field">
            <label htmlFor="characters-management-rows-input" className="mb-1 block text-sm font-semibold text-slate-700">
              Lignes
            </label>
            <input
              id="characters-management-rows-input"
              type="number"
              min={1}
              max={12}
              value={safeRows}
              onChange={(event) => setRows(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div id="characters-management-size-field">
            <label htmlFor="characters-management-size-input" className="mb-1 block text-sm font-semibold text-slate-700">
              Taille (px)
            </label>
            <input
              id="characters-management-size-input"
              type="number"
              min={24}
              max={320}
              value={safeSize}
              onChange={(event) => setSize(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div id="characters-management-id-field">
            <label htmlFor="characters-management-id-input" className="mb-1 block text-sm font-semibold text-slate-700">
              id du composant
            </label>
            <input
              id="characters-management-id-input"
              type="text"
              value={spriteId}
              onChange={(event) => setSpriteId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div id="characters-management-alt-field" className="sm:col-span-2">
            <label htmlFor="characters-management-alt-input" className="mb-1 block text-sm font-semibold text-slate-700">
              Texte alternatif (alt)
            </label>
            <input
              id="characters-management-alt-input"
              type="text"
              value={spriteAlt}
              onChange={(event) => setSpriteAlt(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div id="characters-management-classname-field" className="sm:col-span-2">
            <label htmlFor="characters-management-classname-input" className="mb-1 block text-sm font-semibold text-slate-700">
              className CSS
            </label>
            <input
              id="characters-management-classname-input"
              type="text"
              value={spriteClassName}
              onChange={(event) => setSpriteClassName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div id="characters-management-custom-src-field" className="sm:col-span-2">
            <label htmlFor="characters-management-custom-src-input" className="mb-1 block text-sm font-semibold text-slate-700">
              URL image personnalisée (optionnel)
            </label>
            <input
              id="characters-management-custom-src-input"
              type="text"
              placeholder="/images/MonPersonnage.png"
              value={customSrc}
              onChange={(event) => setCustomSrc(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        <div id="characters-management-preview-panel" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 id="characters-management-preview-title" className="mb-3 text-base font-bold text-slate-800">
            Aperçu
          </h4>

          <div id="characters-management-preview-canvas" className="mb-4 flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <CharacterSprite
              id={spriteId || "character-sprite"}
              src={resolvedSrc}
              position={safePosition}
              columns={safeColumns}
              rows={safeRows}
              size={safeSize}
              alt={spriteAlt || "Personnage grammatical"}
              className={spriteClassName}
            />
          </div>

          <div id="characters-management-preview-infos" className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <div>Image utilisée : {resolvedSrc}</div>
            <div>Position : {safePosition}</div>
            <div>Grille : {safeColumns} x {safeRows}</div>
          </div>

          <div id="characters-management-preview-code-field">
            <label htmlFor="characters-management-preview-code" className="mb-1 block text-sm font-semibold text-slate-700">
              Exemple JSX
            </label>
            <textarea
              id="characters-management-preview-code"
              readOnly
              value={previewCode}
              className="h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CharactersManagementPanel;
