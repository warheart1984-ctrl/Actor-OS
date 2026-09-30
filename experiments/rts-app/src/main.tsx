import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BusinessRtsBoard } from '@ls-rts/BusinessRtsBoard';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <BusinessRtsBoard standalone />
  </StrictMode>,
);
