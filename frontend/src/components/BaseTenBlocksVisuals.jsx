import React from "react";

function buildBlockId(prefix, section, itemId) {
  return itemId === undefined || itemId === null
    ? `${prefix}-${section}`
    : `${prefix}-${section}-${itemId}`;
}

/* ───────────────────────── Pencil visuals ───────────────────────── */

function renderPencilUnits(count, rotations = [], onUnitClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/Crayons_x1.png"
      alt="Crayon"
      className="inline-block h-6 w-auto cursor-pointer object-contain sm:h-7"
      title="Clic : regrouper 10 crayons en 1 pochette"
      onClick={onUnitClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderPencilPouches(count, rotations = [], onPouchClick, onPouchDoubleClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/pochette_x10_crayons.png"
      alt="Pochette de 10 crayons"
      className="w-16 h-16 object-cover cursor-pointer"
      title="Clic : regrouper 10 pochettes en 1 carton | Double-clic : séparer en 10 crayons"
      onClick={onPouchClick}
      onDoubleClick={onPouchDoubleClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderPencilCartons(count, rotations = [], onCartonDoubleClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/cartons_x100_crayons.png"
      alt="Carton de 100 crayons"
      className="w-16 h-16 object-cover cursor-pointer"
      title="Double-clic : séparer en 10 pochettes"
      onDoubleClick={onCartonDoubleClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

/* ───────────────────────── Base 10 Blocks visuals ───────────────────────── */

function renderBaseTenUnits(count, rotations = [], onUnitClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/base10_unite.png"
      alt="Unité"
      className="inline-block h-6 w-6 cursor-pointer object-contain sm:h-7 sm:w-7"
      title="Clic : regrouper 10 unités en 1 dizaine"
      onClick={onUnitClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderBaseTenTens(count, rotations = [], onTenClick, onTenDoubleClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/base10_dizaine.png"
      alt="Dizaine"
      className="h-14 w-3.5 cursor-pointer object-contain sm:h-16 sm:w-4"
      title="Clic : regrouper 10 dizaines en 1 centaine | Double-clic : séparer en 10 unités"
      onClick={onTenClick}
      onDoubleClick={onTenDoubleClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderBaseTenHundreds(count, rotations = [], onHundredClick, onHundredDoubleClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/base10_centaine.png"
      alt="Centaine"
      className="h-14 w-14 cursor-pointer object-contain sm:h-16 sm:w-16"
      title="Clic : regrouper 10 centaines en 1 millier | Double-clic : séparer en 10 dizaines"
      onClick={onHundredClick}
      onDoubleClick={onHundredDoubleClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderBaseTenThousands(count, rotations = [], onThousandDoubleClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/base10_millier.png"
      alt="Millier"
      className="h-16 w-16 cursor-pointer object-contain sm:h-20 sm:w-20"
      title="Double-clic : séparer en 10 centaines"
      onDoubleClick={onThousandDoubleClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

/* ───────────────────────── Main Component ───────────────────────── */

const BaseTenBlocksVisuals = ({
  visualType = "pencils", // "pencils" or "blocks"
  idPrefix = "base-ten-blocks",
  itemId,
  thousands = 0,
  thousandRotations = [],
  hundreds,
  hundredRotations,
  cartons = 0,
  cartonRotations = [],
  tens,
  tenRotations,
  pouches = 0,
  pouchRotations = [],
  units = 0,
  unitRotations = [],
  onGroupUnitsToTens,
  onGroupTensToHundreds,
  onGroupHundredsToThousands,
  onUngroupTensToUnits,
  onUngroupHundredsToTens,
  onUngroupThousandsToHundreds,
  className = "mb-3 space-y-2 sm:mb-4 sm:space-y-3",
}) => {
  const isBlocks = visualType === "blocks";
  const effectiveHundreds = hundreds !== undefined ? hundreds : cartons;
  const effectiveHundredRotations = hundredRotations !== undefined ? hundredRotations : cartonRotations;
  const effectiveTens = tens !== undefined ? tens : pouches;
  const effectiveTenRotations = tenRotations !== undefined ? tenRotations : pouchRotations;

  return (
    <div id={buildBlockId(idPrefix, "visuals", itemId)} className={className}>
      {thousands > 0 && isBlocks && (
        <div id={buildBlockId(idPrefix, "thousands-row", itemId)}>
          <div id={buildBlockId(idPrefix, "thousands-list", itemId)} className="flex flex-wrap items-center gap-2">
            {renderBaseTenThousands(thousands, thousandRotations, onUngroupThousandsToHundreds)}
          </div>
        </div>
      )}

      <div id={buildBlockId(idPrefix, isBlocks ? "hundreds-row" : "cartons-row", itemId)}>
        <div id={buildBlockId(idPrefix, isBlocks ? "hundreds-list" : "cartons-list", itemId)} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {effectiveHundreds > 0
            ? isBlocks
              ? renderBaseTenHundreds(effectiveHundreds, effectiveHundredRotations, onGroupHundredsToThousands, onUngroupHundredsToTens)
              : renderPencilCartons(effectiveHundreds, effectiveHundredRotations, onUngroupHundredsToTens)
            : null}
        </div>
      </div>

      <div id={buildBlockId(idPrefix, isBlocks ? "tens-row" : "pouches-row", itemId)}>
        <div id={buildBlockId(idPrefix, isBlocks ? "tens-list" : "pouches-list", itemId)} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {effectiveTens > 0
            ? isBlocks
              ? renderBaseTenTens(effectiveTens, effectiveTenRotations, onGroupTensToHundreds, onUngroupTensToUnits)
              : renderPencilPouches(effectiveTens, effectiveTenRotations, onGroupTensToHundreds, onUngroupTensToUnits)
            : null}
        </div>
      </div>

      <div id={buildBlockId(idPrefix, "units-row", itemId)}>
        <div id={buildBlockId(idPrefix, "units-list", itemId)} className="flex min-h-[28px] flex-wrap items-center gap-1">
          {units > 0
            ? isBlocks
              ? renderBaseTenUnits(units, unitRotations, onGroupUnitsToTens)
              : renderPencilUnits(units, unitRotations, onGroupUnitsToTens)
            : null}
        </div>
      </div>
    </div>
  );
};

export default BaseTenBlocksVisuals;
