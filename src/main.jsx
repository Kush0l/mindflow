/**
 * @fileoverview Application entry point.
 * Mounts the React virtual DOM tree inside index.html's container.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
