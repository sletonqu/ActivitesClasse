import React from "react";

function buildBlockId(prefix, section, itemId) {
  return itemId === undefined || itemId === null
    ? `${prefix}-${section}`
    : `${prefix}-${section}-${itemId}`;
}

function renderPencilUnits(count, rotations = [], onUnitClick) {
  return Array.from({ length: count }, (_, index) => (
    <img
      key={index}
      src="/images/Crayons_x1.png"
      alt="Crayon"
      className="h-7 w-auto object-contain inline-block cursor-pointer"
      title="Clic : regrouper 10 crayons en 1 pochette"
      onClick={onUnitClick}
      style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
    />
  ));
}

function renderPouches(count, rotations = [], onPouchClick, onPouchDoubleClick) {
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

function renderCartons(count, rotations = [], onCartonDoubleClick) {
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

const BaseTenBlocksVisuals = ({
  idPrefix = "base-ten-blocks",
  itemId,
  cartons = 0,
  cartonRotations = [],
  pouches = 0,
  pouchRotations = [],
  units = 0,
  unitRotations = [],
  onGroupUnitsToTens,
  onGroupTensToHundreds,
  onUngroupTensToUnits,
  onUngroupHundredsToTens,
  className = "mb-4 space-y-3",
}) => {
  return (
    <div id={buildBlockId(idPrefix, "visuals", itemId)} className={className}>
      <div id={buildBlockId(idPrefix, "cartons-row", itemId)}>
        <div id={buildBlockId(idPrefix, "cartons-list", itemId)} className="flex flex-wrap gap-2">
          {cartons > 0 ? renderCartons(cartons, cartonRotations, onUngroupHundredsToTens) : null}
        </div>
      </div>

      <div id={buildBlockId(idPrefix, "pouches-row", itemId)}>
        <div id={buildBlockId(idPrefix, "pouches-list", itemId)} className="flex flex-wrap gap-2">
          {renderPouches(pouches, pouchRotations, onGroupTensToHundreds, onUngroupTensToUnits)}
        </div>
      </div>

      <div id={buildBlockId(idPrefix, "units-row", itemId)}>
        <div id={buildBlockId(idPrefix, "units-list", itemId)} className="flex flex-wrap gap-1 min-h-[34px]">
          {units > 0 ? renderPencilUnits(units, unitRotations, onGroupUnitsToTens) : null}
        </div>
      </div>
    </div>
  );
};

export default BaseTenBlocksVisuals;
