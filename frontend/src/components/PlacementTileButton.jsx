import React from "react";

const PlacementTileButton = ({
  id,
  type = "button",
  draggable = false,
  onDragStart,
  onDragEnd,
  onClick,
  isSelected = false,
  selectedClassName = "",
  className = "",
  style,
  children,
}) => {
  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button
      id={id}
      type={type}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={`${className} ${isSelected ? selectedClassName : ""}`.trim()}
      style={style}
    >
      {children}
    </button>
  );
};

export default PlacementTileButton;
