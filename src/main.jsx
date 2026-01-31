import React from "react";
import { createRoot } from "react-dom/client";
import FlooringCalculator from "./FlooringCalculator.jsx";
import "./index.css";

// MUST match the ID output by flooring-calculator-plugin.php
const ROOT_ID = "flooring-calculator-root";

const mountFlooringCalculator = () => {
  if (typeof document === "undefined") {
    return;
  }

  const rootElement = document.getElementById(ROOT_ID);

  if (!rootElement) {
    return;
  }

  rootElement.dataset.mounted = "true";
  if (import.meta.env?.DEV) {
    rootElement.dataset.debug = "true";
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <FlooringCalculator />
    </React.StrictMode>
  );
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFlooringCalculator, {
      once: true,
    });
  } else {
    mountFlooringCalculator();
  }
}
