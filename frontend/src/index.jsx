import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Prevent user zoom (pinch-to-zoom, ctrl+wheel)
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
