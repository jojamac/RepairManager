import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  onClick?: () => void;
  actionText?: string;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClick?: () => void;
  actionText?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, options?: ToastOptions) => void;
  success: (message: string, title?: string, options?: ToastOptions) => void;
  error: (message: string, title?: string, options?: ToastOptions) => void;
  warning: (message: string, title?: string, options?: ToastOptions) => void;
  info: (message: string, title?: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, ...options }]);
    const duration = options?.duration ?? 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string, options?: ToastOptions) => showToast(message, 'success', title, options), [showToast]);
  const error = useCallback((message: string, title?: string, options?: ToastOptions) => showToast(message, 'error', title, options), [showToast]);
  const warning = useCallback((message: string, title?: string, options?: ToastOptions) => showToast(message, 'warning', title, options), [showToast]);
  const info = useCallback((message: string, title?: string, options?: ToastOptions) => showToast(message, 'info', title, options), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '380px',
          width: '100%',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="fade-in"
            onClick={() => {
              if (toast.onClick) {
                toast.onClick();
                removeToast(toast.id);
              }
            }}
            style={{
              pointerEvents: 'auto',
              cursor: toast.onClick ? 'pointer' : 'default',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--border-radius-md, 8px)',
              backgroundColor:
                toast.type === 'success'
                  ? 'var(--color-success, #10b981)'
                  : toast.type === 'error'
                  ? 'var(--color-danger, #ef4444)'
                  : toast.type === 'warning'
                  ? 'var(--color-warning, #f59e0b)'
                  : 'var(--color-info, #06b6d4)',
              color: '#ffffff',
              boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.25))',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.75rem',
              transition: 'transform 0.15s ease, filter 0.15s ease',
            }}
          >
            <div style={{ flex: 1 }}>
              {toast.title && <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{toast.title}</div>}
              <div style={{ fontSize: '0.8125rem', lineHeight: '1.4' }}>{toast.message}</div>
              {toast.actionText && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'underline', opacity: 0.95 }}>
                  {toast.actionText}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
                opacity: 0.8,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
};
