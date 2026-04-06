import { useEffect, useState } from "react";

const DEFAULT_FADE_DELAY_MS = 3500;
const DEFAULT_HIDE_DELAY_MS = 4000;

const useAutoDismissMessage = (
  message,
  clearMessage,
  fadeDelayMs = DEFAULT_FADE_DELAY_MS,
  hideDelayMs = DEFAULT_HIDE_DELAY_MS
) => {
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (!message) {
      setShow(false);
      setFade(false);
      return;
    }

    setShow(true);
    setFade(false);

    const fadeTimer = window.setTimeout(() => {
      setFade(true);
    }, fadeDelayMs);

    const hideTimer = window.setTimeout(() => {
      setShow(false);
      setFade(false);
      if (typeof clearMessage === "function") {
        clearMessage("");
      }
    }, hideDelayMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [message, clearMessage, fadeDelayMs, hideDelayMs]);

  return { show, fade };
};

export default useAutoDismissMessage;
