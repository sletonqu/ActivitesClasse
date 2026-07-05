import { useCallback, useMemo, useState } from "react";

function isSameSlotKey(firstKey, secondKey) {
  return String(firstKey) === String(secondKey);
}

function isSameItemById(firstItem, secondItem) {
  if (!firstItem || !secondItem) {
    return false;
  }

  return String(firstItem.id || "") === String(secondItem.id || "");
}

export default function useSlotPoolPlacement({
  initialPoolItems = [],
  initialAssignments = {},
  disabled = false,
} = {}) {
  const [poolItems, setPoolItems] = useState(initialPoolItems);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [draggedPlacement, setDraggedPlacement] = useState(null);
  const [selectedPlacement, setSelectedPlacement] = useState(null);

  const clearInteraction = useCallback(() => {
    setDraggedPlacement(null);
    setSelectedPlacement(null);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedPlacement(null);
  }, []);

  const resetPlacement = useCallback((nextPoolItems = [], nextAssignments = {}) => {
    setPoolItems(nextPoolItems);
    setAssignments(nextAssignments);
    setDraggedPlacement(null);
    setSelectedPlacement(null);
  }, []);

  const startDragFromPool = useCallback((item) => {
    if (disabled || !item) {
      return;
    }

    const placement = { item, source: "pool" };
    setDraggedPlacement(placement);
    setSelectedPlacement(placement);
  }, [disabled]);

  const startDragFromSlot = useCallback((slotKey) => {
    if (disabled) {
      return;
    }

    const item = assignments[slotKey];
    if (item === undefined) {
      return;
    }

    const placement = { item, source: "slot", slotKey };
    setDraggedPlacement(placement);
    setSelectedPlacement(placement);
  }, [assignments, disabled]);

  const toggleSelectFromPool = useCallback((item) => {
    if (disabled || !item) {
      return;
    }

    setDraggedPlacement(null);
    setSelectedPlacement((previousPlacement) => {
      if (
        previousPlacement &&
        previousPlacement.source === "pool" &&
        isSameItemById(previousPlacement.item, item)
      ) {
        return null;
      }

      return { item, source: "pool" };
    });
  }, [disabled]);

  const toggleSelectFromSlot = useCallback((slotKey) => {
    if (disabled) {
      return;
    }

    const item = assignments[slotKey];
    if (item === undefined) {
      return;
    }

    setDraggedPlacement(null);
    setSelectedPlacement((previousPlacement) => {
      if (
        previousPlacement &&
        previousPlacement.source === "slot" &&
        isSameSlotKey(previousPlacement.slotKey, slotKey)
      ) {
        return null;
      }

      return { item, source: "slot", slotKey };
    });
  }, [assignments, disabled]);

  const activePlacement = draggedPlacement || selectedPlacement;

  const dropToSlot = useCallback((slotKey) => {
    if (disabled || !activePlacement) {
      return false;
    }

    const { item, source, slotKey: sourceSlotKey } = activePlacement;
    if (source === "slot" && isSameSlotKey(sourceSlotKey, slotKey)) {
      clearInteraction();
      return false;
    }

    const nextAssignments = { ...assignments };
    const nextPoolItems = poolItems.slice();
    const previousTargetItem = nextAssignments[slotKey];

    if (source === "pool") {
      const poolItemIndex = nextPoolItems.findIndex((candidate) => isSameItemById(candidate, item));
      if (poolItemIndex !== -1) {
        nextPoolItems.splice(poolItemIndex, 1);
      }
    } else if (source === "slot") {
      delete nextAssignments[sourceSlotKey];
    }

    nextAssignments[slotKey] = item;

    if (previousTargetItem !== undefined) {
      if (source === "slot") {
        nextAssignments[sourceSlotKey] = previousTargetItem;
      } else {
        nextPoolItems.push(previousTargetItem);
      }
    }

    setAssignments(nextAssignments);
    setPoolItems(nextPoolItems);
    clearInteraction();
    return true;
  }, [activePlacement, assignments, clearInteraction, disabled, poolItems]);

  const dropToPool = useCallback(() => {
    if (disabled || !activePlacement) {
      return false;
    }

    if (activePlacement.source !== "slot") {
      clearInteraction();
      return false;
    }

    const { item, slotKey } = activePlacement;
    const nextAssignments = { ...assignments };
    delete nextAssignments[slotKey];

    setAssignments(nextAssignments);
    setPoolItems((previousPoolItems) => [...previousPoolItems, item]);
    clearInteraction();
    return true;
  }, [activePlacement, assignments, clearInteraction, disabled]);

  const isPoolItemSelected = useCallback((item) => {
    return Boolean(
      selectedPlacement &&
      selectedPlacement.source === "pool" &&
      isSameItemById(selectedPlacement.item, item)
    );
  }, [selectedPlacement]);

  const isSlotSelected = useCallback((slotKey) => {
    return Boolean(
      selectedPlacement &&
      selectedPlacement.source === "slot" &&
      isSameSlotKey(selectedPlacement.slotKey, slotKey)
    );
  }, [selectedPlacement]);

  return useMemo(() => ({
    poolItems,
    assignments,
    draggedPlacement,
    selectedPlacement,
    activePlacement,
    setPoolItems,
    setAssignments,
    resetPlacement,
    clearInteraction,
    endDrag,
    startDragFromPool,
    startDragFromSlot,
    toggleSelectFromPool,
    toggleSelectFromSlot,
    dropToSlot,
    dropToPool,
    isPoolItemSelected,
    isSlotSelected,
  }), [
    activePlacement,
    assignments,
    clearInteraction,
    endDrag,
    draggedPlacement,
    dropToPool,
    dropToSlot,
    isPoolItemSelected,
    isSlotSelected,
    poolItems,
    resetPlacement,
    selectedPlacement,
    startDragFromPool,
    startDragFromSlot,
    toggleSelectFromPool,
    toggleSelectFromSlot,
  ]);
}
