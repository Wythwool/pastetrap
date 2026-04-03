import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/ui/base.css';
import { OptionsApp } from '@/options/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
