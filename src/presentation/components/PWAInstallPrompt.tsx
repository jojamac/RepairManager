import React, { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div
      className="glass-card fade-in"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1.5rem',
        zIndex: 9990,
        maxWidth: '340px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--color-primary)',
        boxShadow: 'var(--shadow-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Smartphone size={22} />
        </div>
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Instalar Aplicación EnTuCel</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Acceso directo rápido para técnicos en el taller.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
          onClick={() => setShowPrompt(false)}
        >
          Ahora no
        </button>
        <button
          className="btn btn-primary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.35rem' }}
          onClick={handleInstallClick}
        >
          <Download size={14} /> Instalar App
        </button>
      </div>
    </div>
  );
};
