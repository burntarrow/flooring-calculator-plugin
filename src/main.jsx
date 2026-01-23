import React from 'react'
import ReactDOM from 'react-dom/client'
import FlooringCalculator from './FlooringCalculator.jsx'
import './index.css'

// This ID MUST match the ID in your flooring-calculator-plugin.php
const rootElement = document.getElementById('flooring-calculator-plugin-root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <FlooringCalculator />
    </React.StrictMode>,
  )
}