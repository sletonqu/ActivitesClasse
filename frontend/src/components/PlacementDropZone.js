import React from "react";

const PlacementDropZone = ({
  id,
  className = "",
  onDrop,
  onClick,
  children,
}) => {
  return (
    <div
      id={id}
      className={className}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default PlacementDropZone;
