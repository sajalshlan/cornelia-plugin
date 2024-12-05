import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './components/Root';

/* global document, Office, module, require */

Office.onReady(() => {
  const container = document.getElementById('container');
  const root = createRoot(container);
  root.render(<Root />);
});
