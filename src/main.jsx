import React from "react";
import { createRoot } from "react-dom/client";
import FlooringCalculator from "./FlooringCalculator.jsx";
import "./index.css";

// MUST match the ID output by flooring-calculator-plugin.php
const rootElement = document.getElementById("flooring-calculator-root");

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <FlooringCalculator />
    </React.StrictMode>
  );
}
