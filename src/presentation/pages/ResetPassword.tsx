import React, { useState } from 'react';
import { useAuth } from '../../application/hooks/useAuth';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';

interface ResetPasswordProps {
  onNavigateToLogin: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigateToLogin }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    if (!email) {
      setFormError('Por favor ingrese su correo electrónico.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 50% 50%, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        padding: '1.5rem'
      }}
    >
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <button
          onClick={onNavigateToLogin}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 500,
            padding: 0
          }}
        >
          <ArrowLeft size={16} /> Volver al Login
        </button>

        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--color-accent-glow)', 
              color: 'var(--color-accent)',
              marginBottom: '1rem'
            }}
          >
            <KeyRound size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Recuperar Contraseña</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Ingrese su correo registrado para recibir instrucciones de restablecimiento de contraseña.
          </p>
        </div>

        {formError && (
          <div 
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              fontWeight: 500
            }}
          >
            {formError}
          </div>
        )}

        {success && (
          <div 
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--color-success)',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--color-success)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              fontWeight: 500
            }}
          >
            Enlace de recuperación enviado con éxito. Revise su bandeja de entrada.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }}>
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="ejemplo@entucel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting || success}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: '0.5rem' }}
            disabled={submitting || success}
          >
            {submitting ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>
      </div>
    </div>
  );
};
