import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/ui/base.css';
import { PopupApp } from '@/popup/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
