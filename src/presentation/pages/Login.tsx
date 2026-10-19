import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../application/hooks/useAuth';
import { Shield, Lock, Mail } from 'lucide-react';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
  const navigate = useNavigate();
  const { login, hasUsers, setupInitialAdmin } = useAuth();
  const [view, setView] = useState<'login' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para Onboarding de Administrador Inicial
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Por favor ingrese correo y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      // Breve pausa para asegurar transición fluida perceptible
      await new Promise(resolve => setTimeout(resolve, 400));
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!setupName.trim() || !setupEmail.trim() || !setupPassword) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await setupInitialAdmin(setupEmail.trim(), setupPassword, setupName.trim());
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al registrar administrador inicial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        width: '100vw', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'var(--bg-primary)',
        padding: '1rem'
      }}
    >
      <div 
        className="glass-card fade-in" 
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {view === 'setup' || hasUsers === false ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(250, 92, 60, 0.1)', 
                  color: 'var(--color-primary)',
                  marginBottom: '0.75rem'
                }}
              >
                <Shield size={28} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Configuración Inicial</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                No se detectaron usuarios en el sistema. Registre la cuenta Administrador principal para comenzar.
              </p>
            </div>

            {error && (
              <div className="badge badge-danger" style={{ display: 'block', marginBottom: '1rem', padding: '0.6rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSetupAdmin}>
              <div className="form-group">
                <label className="form-label">
                  Nombre Completo <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Administrador Taller"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Correo Electrónico <span className="required-asterisk">*</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@entucel.com"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Contraseña Propietario <span className="required-asterisk">*</span>
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Confirmar Contraseña <span className="required-asterisk">*</span>
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Repita la contraseña"
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ 
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: submitting ? 0.85 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2.5px', borderTopColor: '#ffffff' }} />
                    <span>Creando cuenta admin...</span>
                  </>
                ) : (
                  <span>Inicializar Sistema EnTuCel</span>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(250, 92, 60, 0.1)', 
                  color: 'var(--color-primary)',
                  marginBottom: '1rem'
                }}
              >
                <Shield size={32} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>EnTuCel</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Panel de Administración Técnico
              </p>
            </div>

            {!hasUsers && (
              <div 
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(250, 92, 60, 0.04)',
                  border: '1px dashed var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}
              >
                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  ⚠️ Primer inicio detectado
                </p>
                <button
                  onClick={() => setView('setup')}
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  Crear Administrador Inicial
                </button>
              </div>
            )}

            {error && (
              <div className="badge badge-danger" style={{ display: 'block', marginBottom: '1.5rem', padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="admin@entucel.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Contraseña</label>
                  <Link
                    to="/reset-password"
                    style={{
                      color: 'var(--color-accent)',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    ¿Olvidó su contraseña?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }}>
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ 
                  marginTop: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: submitting ? 0.85 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2.5px', borderTopColor: '#ffffff' }} />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>

            <div 
              style={{ 
                marginTop: '2rem', 
                paddingTop: '1.5rem', 
                borderTop: '1px solid var(--border-light)',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>¿Es usted cliente?</span>
              <br />
              <Link
                to="/tracking"
                className="btn btn-secondary"
                style={{ 
                  display: 'inline-block',
                  marginTop: '0.75rem', 
                  width: '100%', 
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.2rem',
                  textAlign: 'center',
                  textDecoration: 'none'
                }}
              >
                Consultar estado de reparación
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
