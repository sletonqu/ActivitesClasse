import { useState, useCallback } from "react";

const useConfirm = () => {
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
  });

  const confirmAction = useCallback((title, message) => {
    return new Promise((resolve) => {
      setConfirmModalState({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return { confirmAction, confirmModalState };
};

export default useConfirm;
