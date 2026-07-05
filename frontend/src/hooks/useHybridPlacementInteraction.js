import { useCallback, useMemo, useState } from "react";

function getItemId(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  if (item.runtimeId) {
    return String(item.runtimeId);
  }

  if (item.id !== undefined && item.id !== null) {
    return String(item.id);
  }

  return "";
}

export default function useHybridPlacementInteraction({ disabled = false } = {}) {
  const [draggedItemId, setDraggedItemId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  const clearInteraction = useCallback(() => {
    setDraggedItemId("");
    setSelectedItemId("");
  }, []);

  const startDrag = useCallback((itemId) => {
    if (disabled) {
      return;
    }

    const normalizedId = String(itemId || "");
    setDraggedItemId(normalizedId);
    setSelectedItemId(normalizedId);
  }, [disabled]);

  const endDrag = useCallback(() => {
    setDraggedItemId("");
  }, []);

  const toggleSelection = useCallback((itemId) => {
    if (disabled) {
      return;
    }

    const normalizedId = String(itemId || "");
    setSelectedItemId((previousValue) => {
      const nextValue = previousValue === normalizedId ? "" : normalizedId;
      setDraggedItemId(nextValue);
      return nextValue;
    });
  }, [disabled]);

  const selectByItem = useCallback((item) => {
    const itemId = getItemId(item);
    if (!itemId) {
      return;
    }

    toggleSelection(itemId);
  }, [toggleSelection]);

  const activeItemId = draggedItemId || selectedItemId;

  const isItemSelected = useCallback((itemId) => {
    return selectedItemId === String(itemId || "");
  }, [selectedItemId]);

  const isItemActive = useCallback((itemId) => {
    return activeItemId === String(itemId || "");
  }, [activeItemId]);

  return useMemo(() => ({
    draggedItemId,
    selectedItemId,
    activeItemId,
    startDrag,
    endDrag,
    toggleSelection,
    selectByItem,
    clearInteraction,
    isItemSelected,
    isItemActive,
  }), [
    activeItemId,
    clearInteraction,
    draggedItemId,
    endDrag,
    isItemActive,
    isItemSelected,
    selectByItem,
    selectedItemId,
    startDrag,
    toggleSelection,
  ]);
}
