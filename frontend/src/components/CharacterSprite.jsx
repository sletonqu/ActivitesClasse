import React from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const CharacterSprite = ({
  id = "character-sprite",
  src,
  position = 0,
  columns = 3,
  rows = 3,
  size = 88,
  alt = "Personnage grammatical",
  className = "",
  style = {},
}) => {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));
  const frameCount = safeColumns * safeRows;
  const safePosition = clamp(Math.floor(position), 0, frameCount - 1);

  const columnIndex = safePosition % safeColumns;
  const rowIndex = Math.floor(safePosition / safeColumns);

  const xPercent = safeColumns > 1 ? (columnIndex / (safeColumns - 1)) * 100 : 0;
  const yPercent = safeRows > 1 ? (rowIndex / (safeRows - 1)) * 100 : 0;

  return (
    <div
      id={id}
      role="img"
      aria-label={alt}
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${safeColumns * 100}% ${safeRows * 100}%`,
        backgroundPosition: `${xPercent}% ${yPercent}%`,
        ...style,
      }}
    />
  );
};

export default CharacterSprite;
