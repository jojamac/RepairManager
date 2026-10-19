import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './presentation/App';
import { RepositoryProvider } from './data/RepositoryContext';
import { AuthProvider } from './data/AuthContext';
import { ToastProvider } from './presentation/components/Toast';
import { ConfirmDialogProvider } from './presentation/components/ConfirmDialog';
import { ErrorBoundary } from './presentation/components/ErrorBoundary';
import { ServiceOrdersProvider } from './application/context/ServiceOrdersContext';
import './presentation/theme/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RepositoryProvider>
        <AuthProvider>
          <ServiceOrdersProvider>
            <ToastProvider>
              <ConfirmDialogProvider>
                <App />
              </ConfirmDialogProvider>
            </ToastProvider>
          </ServiceOrdersProvider>
        </AuthProvider>
      </RepositoryProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
