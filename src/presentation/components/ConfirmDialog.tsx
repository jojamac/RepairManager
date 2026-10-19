import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, HelpCircle } from 'lucide-react';

export type DialogType = 'success' | 'danger' | 'error' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  type?: DialogType;
}

type DialogState =
  | ({ mode: 'confirm' } & ConfirmOptions & { resolve: (val: boolean) => void })
  | ({ mode: 'alert' } & AlertOptions & { resolve: () => void });

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
  /** Alias conveniente para mostrar alertas informativas */
  alertModal: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({ mode: 'confirm', ...options, resolve });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      setDialog({ mode: 'alert', ...options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (dialog) {
      if (dialog.mode === 'confirm') {
        dialog.resolve(true);
      } else {
        dialog.resolve();
      }
      setDialog(null);
    }
  };

  const handleCancel = () => {
    if (dialog) {
      if (dialog.mode === 'confirm') {
        dialog.resolve(false);
      } else {
        dialog.resolve();
      }
      setDialog(null);
    }
  };

  const renderIcon = (type?: DialogType, mode?: 'confirm' | 'alert') => {
    const size = 26;
    switch (type) {
      case 'success':
        return (
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={size} strokeWidth={2.5} />
          </div>
        );
      case 'danger':
      case 'error':
        return (
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertOctagon size={size} strokeWidth={2.5} />
          </div>
        );
      case 'warning':
        return (
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={size} strokeWidth={2.5} />
          </div>
        );
      case 'info':
      default:
        if (mode === 'confirm') {
          return (
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={size} strokeWidth={2.5} />
            </div>
          );
        }
        return (
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={size} strokeWidth={2.5} />
          </div>
        );
    }
  };

  const getConfirmBtnColor = (type?: DialogType) => {
    switch (type) {
      case 'danger':
      case 'error':
        return { backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#ffffff' };
      case 'success':
        return { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#ffffff' };
      case 'warning':
        return { backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)', color: '#ffffff' };
      default:
        return undefined; // botón primario normal
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, showAlert, alertModal: showAlert }}>
      {children}
      {dialog && (
        <div 
          className="modal-overlay fade-in" 
          style={{ 
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(5px)'
          }}
          onClick={handleCancel}
        >
          <div
            className="glass-card scale-in"
            style={{
              maxWidth: '440px',
              width: '100%',
              backgroundColor: 'var(--bg-secondary)',
              padding: '1.75rem',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              {renderIcon(dialog.type, dialog.mode)}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {dialog.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                  {dialog.message}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: dialog.mode === 'alert' ? 'center' : 'flex-end', gap: '0.75rem', marginTop: '0.5rem', width: '100%' }}>
              {dialog.mode === 'confirm' && (
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={handleCancel}
                  style={{ padding: '0.6rem 1.15rem', fontSize: '0.88rem' }}
                >
                  {dialog.cancelText || 'Cancelar'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                style={{ 
                  padding: '0.6rem 1.35rem', 
                  fontSize: '0.88rem', 
                  fontWeight: 700,
                  ...getConfirmBtnColor(dialog.type)
                }}
                onClick={handleConfirm}
                autoFocus
              >
                {dialog.confirmText || (dialog.mode === 'alert' ? 'Entendido' : 'Aceptar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe usarse dentro de un ConfirmDialogProvider');
  }
  return context;
};

/** Alias semántico para diálogos y alertas modales */
export const useModalDialog = () => {
  return useConfirm();
};
