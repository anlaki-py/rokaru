import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RootErrorBoundary } from './components/ui/ErrorBoundaries'
import { FileConversionProvider } from './contexts/FileConversionContext'

// Get root element safely
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <RootErrorBoundary>
      <FileConversionProvider>
        <App />
      </FileConversionProvider>
    </RootErrorBoundary>
  </StrictMode>,
);