import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '../../../../../domain/entities/ServiceOrder';
import { DigitalTwinInstance, DigitalTwinComponent, getOriginalDiagnosticStatus } from '../../../../../domain/entities/DigitalTwin';
import { Lock, MessageCircle, AlertCircle, CheckCircle2, ShieldCheck, Loader2, Check, Phone, ShieldAlert } from 'lucide-react';
import { ShopConfigService } from '../../../../../data/firebase/ShopConfigService';

interface TrackingBudgetApprovalStageProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance | null;
  whatsappUrl: string;
  formatCurrency: (val: number) => string;
  onConfirmAuthorization: (pin: string) => Promise<void>;
  authorizing: boolean;
}

export const TrackingBudgetApprovalStage: React.FC<TrackingBudgetApprovalStageProps> = ({
  order,
  twin,
  whatsappUrl,
  formatCurrency,
  onConfirmAuthorization,
  authorizing
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [maxPinAttempts, setMaxPinAttempts] = useState(3);
  const [shopPhone, setShopPhone] = useState<string>('');
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Cargar configuración del taller (límite de intentos y teléfono de WhatsApp)
  useEffect(() => {
    ShopConfigService.getShopInfo()
      .then((info) => {
        if (info) {
          const limit = info.maxPinAttempts && info.maxPinAttempts > 0 ? info.maxPinAttempts : 3;
          setMaxPinAttempts(limit);
          if (info.phone) setShopPhone(info.phone);

          const storageKey = `entucel_pin_attempts_${order.id}`;
          const saved = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
          setAttemptsCount(saved);
          if (saved >= limit) {
            setIsBlocked(true);
          }
        }
      })
      .catch(() => {});
  }, [order.id]);

  const damagedComponents = twin 
    ? twin.components.filter((c: DigitalTwinComponent) => 
        c.status !== 'NORMAL' || 
        Boolean(c.diagnosisNote && c.diagnosisNote.trim().length > 0) || 
        Boolean(c.replacementCost && c.replacementCost > 0)
      )
    : [];

  const isPendingApproval = order.status === 'espera_aprobacion' && (!twin || !twin.isAuthorizedByClient);
  const isAlreadyApproved = Boolean(twin?.isAuthorizedByClient || order.status === 'reparacion' || order.status === 'listo' || order.status === 'entregado');

  // Enmascarar teléfono mostrando los primeros 4 o 5 dígitos y ocultando los últimos 4 dígitos (PIN)
  const getMaskedPhoneHint = (phone: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits || digits.length < 4) return '••••';
    if (digits.length === 10) {
      // Para números estándar de 10 dígitos (ej: 314 25• ••••), revela 5 dígitos y oculta el resto
      return `${digits.slice(0, 3)} ${digits.slice(3, 5)}• ••••`;
    }
    const visibleCount = Math.min(5, Math.max(2, digits.length - 4));
    const visible = digits.slice(0, visibleCount);
    const masked = '•'.repeat(digits.length - visibleCount);
    return `${visible} ${masked}`;
  };

  // Enlace directo a WhatsApp con mensaje de solicitud de desbloqueo
  const getWhatsAppBlockedUrl = () => {
    const digits = shopPhone.replace(/\D/g, '');
    const formattedPhone = (digits.length === 10 && digits.startsWith('3')) ? `57${digits}` : (digits || '573000000000');
    const message = `Hola, estoy en el portal de seguimiento intentando autorizar la orden ${order.id} pero se bloquearon los intentos de PIN. ¿Podrían colaborarme para verificar mis datos y aprobar la reparación?`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleOpenPin = () => {
    if (isBlocked) return;
    setPinInput('');
    setPinError(null);
    setShowPinModal(true);
  };

  const handleSubmitPin = async () => {
    if (isBlocked) return;
    setPinError(null);

    const phoneDigits = (order.clientPhone || '').replace(/\D/g, '');
    const expectedPin = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';

    if (expectedPin && pinInput.trim() !== expectedPin) {
      const newAttempts = attemptsCount + 1;
      setAttemptsCount(newAttempts);
      sessionStorage.setItem(`entucel_pin_attempts_${order.id}`, newAttempts.toString());

      // Animación de sacudida y limpieza de input
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinInput('');

      if (newAttempts >= maxPinAttempts) {
        setIsBlocked(true);
        setPinError(`Ha superado el límite de ${maxPinAttempts} intentos permitidos. Por seguridad, la aprobación digital ha sido bloqueada.`);
      } else {
        const remaining = maxPinAttempts - newAttempts;
        setPinError(`PIN incorrecto. Le ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}.`);
      }
      return;
    }

    try {
      await onConfirmAuthorization(pinInput.trim());
      sessionStorage.removeItem(`entucel_pin_attempts_${order.id}`);
      setShowPinModal(false);
    } catch (err: any) {
      setPinError(err.message || 'Error al autorizar el presupuesto.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner de Estado */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          borderLeft: `4px solid ${isPendingApproval ? 'var(--color-warning)' : 'var(--color-success)'}`, 
          backgroundColor: isPendingApproval ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '50%', 
              backgroundColor: isPendingApproval ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
              color: isPendingApproval ? 'var(--color-warning)' : 'var(--color-success)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}
          >
            {isPendingApproval ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isPendingApproval ? 'var(--color-warning)' : 'var(--color-success)', textTransform: 'uppercase' }}>
              Etapa 3 · Presupuesto Comercial
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0 0 0' }}>
              {isPendingApproval 
                ? 'Cotización Lista - Pendiente de su Aprobación' 
                : 'Presupuesto Aprobado para Reparación'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
              {isPendingApproval 
                ? 'El diagnóstico concluyó. Revise los repuestos y el costo total a continuación para autorizar el inicio de la reparación.'
                : 'Usted ha autorizado este presupuesto. Nuestro taller se encuentra procesando el ensamble.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta Principal de Presupuesto */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Resumen Financiero del Servicio
            </span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
              Cotización Total de Reparación
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              Incluye repuestos originales/homologados, mano de obra especializada e inspección general.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Costo Total del Servicio</span>
            <strong style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--color-primary)' }}>
              {formatCurrency(order.cost)}
            </strong>
          </div>
        </div>

        {/* Desglose de Abono y Saldo Restante */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Abono Realizado</span>
            <strong style={{ color: 'var(--color-success)', fontSize: '1.1rem', display: 'block', marginTop: '0.2rem' }}>
              {formatCurrency(order.paymentAdvance || 0)}
            </strong>
          </div>

          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Saldo a Pagar al Retirar</span>
            <strong style={{ color: 'var(--color-warning)', fontSize: '1.1rem', display: 'block', marginTop: '0.2rem' }}>
              {formatCurrency(Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0)))}
            </strong>
          </div>
        </div>

        {/* Desglose de Repuestos Incluidos */}
        {damagedComponents.length > 0 && (
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
              📋 Repuestos y Trabajos Incluidos en esta Cotización:
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {damagedComponents.map((c: DigitalTwinComponent) => (
                <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>• {c.name}</strong>
                    {(() => {
                      const origDiag = getOriginalDiagnosticStatus(c, twin?.events);
                      const isReplacement = origDiag === 'REPLACEMENT_REQUIRED';
                      return (
                        <span 
                          style={{ 
                            marginLeft: '0.45rem',
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '3px',
                            fontWeight: 700,
                            backgroundColor: isReplacement ? 'rgba(239, 68, 68, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                            color: isReplacement ? 'var(--color-danger)' : '#ea580c'
                          }}
                        >
                          {isReplacement ? 'Repuesto Nuevo' : 'Reparación Técnica'}
                        </span>
                      );
                    })()}
                    {c.diagnosisNote && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.4rem' }}>({c.diagnosisNote})</span>}
                  </div>
                  {c.replacementCost ? (
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{formatCurrency(c.replacementCost)}</strong>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .pin-shake {
          animation: pinShake 0.45s ease-in-out;
        }
      `}</style>

      {/* Botonera de Aprobación Centrada */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: '0.75rem' }}>
        {isPendingApproval ? (
          isBlocked ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <div 
                style={{ 
                  padding: '0.85rem 1.15rem', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid var(--color-danger)', 
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--color-danger)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Aprobación digital temporalmente bloqueada</strong>
                  <div style={{ fontSize: '0.82rem', marginTop: '0.15rem', color: 'var(--text-secondary)' }}>
                    Se superó el límite de {maxPinAttempts} intentos. Para su protección, contacte al taller por WhatsApp para validar su orden.
                  </div>
                </div>
              </div>

              <a
                href={getWhatsAppBlockedUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{
                  padding: '0.7rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  backgroundColor: '#25D366',
                  borderColor: '#25D366',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  alignSelf: 'flex-start'
                }}
              >
                <MessageCircle size={18} /> Solicitar Desbloqueo por WhatsApp
              </a>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-success)',
                  borderColor: 'var(--color-success)',
                  gap: '0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={handleOpenPin}
              >
                <Lock size={16} /> Aprobar Presupuesto
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ 
                  padding: '0.65rem 1.15rem', 
                  fontSize: '0.88rem', 
                  gap: '0.45rem', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center' 
                }}
              >
                <MessageCircle size={16} style={{ color: '#25D366' }} /> Consultar por WhatsApp
              </a>
            </>
          )
        ) : isAlreadyApproved ? (
          <div 
            style={{ 
              flex: 1, 
              padding: '0.75rem 1rem', 
              backgroundColor: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid var(--color-success)', 
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--color-success)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <ShieldCheck size={18} /> ✅ Presupuesto Autorizado por el Cliente
          </div>
        ) : null}
      </div>
    </div>

    {/* Modal de Validación de PIN Telefónico */}
    {showPinModal && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
      >
        <div
          className="glass-card"
          style={{
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isBlocked ? 'var(--color-danger)' : 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isBlocked ? <ShieldAlert size={22} /> : <Lock size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {isBlocked ? 'Aprobación Bloqueada por Seguridad' : 'Verificación de Autorización'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Orden {order.id}</span>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
            {isBlocked
              ? `Ha superado el número de intentos permitidos (${maxPinAttempts}). Por protección de su dispositivo, la validación digital se ha deshabilitado.`
              : 'Para garantizar la seguridad de su orden, ingrese los últimos 4 dígitos del número celular registrado al dejar su equipo.'}
          </p>

          {/* Pista Enmascarada del Teléfono (Muestra primeros 4-5 dígitos, nunca los últimos 4) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-medium)',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                Celular registrado: <strong style={{ color: 'var(--text-primary)', letterSpacing: '0.05rem' }}>{getMaskedPhoneHint(order.clientPhone || '')}</strong>
              </span>
            </div>
            {!isBlocked && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: attemptsCount > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                {Math.max(0, maxPinAttempts - attemptsCount)} {maxPinAttempts - attemptsCount === 1 ? 'intento' : 'intentos'}
              </span>
            )}
          </div>

          <div className={isShaking ? 'pin-shake' : ''}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              PIN Telefónico (Últimos 4 dígitos)
            </label>
            <input
              type="password"
              maxLength={4}
              className="form-input"
              disabled={isBlocked || authorizing}
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                fontWeight: 800,
                padding: '0.5rem',
                opacity: isBlocked ? 0.6 : 1,
                cursor: isBlocked ? 'not-allowed' : 'text'
              }}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              autoFocus={!isBlocked}
            />
          </div>

          {pinError && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--color-danger)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{pinError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
            {isBlocked ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPinModal(false)}
                >
                  Cerrar
                </button>
                <a
                  href={getWhatsAppBlockedUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#25D366',
                    borderColor: '#25D366',
                    fontWeight: 800,
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <MessageCircle size={18} /> Contactar por WhatsApp
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={authorizing}
                  onClick={() => setShowPinModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', fontWeight: 800 }}
                  disabled={authorizing || pinInput.length !== 4}
                  onClick={handleSubmitPin}
                >
                  {authorizing ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Autorizando...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Confirmar Aprobación
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
