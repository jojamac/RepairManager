import React from 'react';
import { ServiceOrder } from '../../../../../domain/entities/ServiceOrder';
import { DigitalTwinInstance, DigitalTwinQualityCheck } from '../../../../../domain/entities/DigitalTwin';
import { PackageCheck, CheckCircle2, MessageCircle, MapPin, DollarSign, Camera } from 'lucide-react';

interface TrackingReadyStageProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance | null;
  whatsappUrl: string;
  formatCurrency: (val: number) => string;
}

export const TrackingReadyStage: React.FC<TrackingReadyStageProps> = ({
  order,
  twin,
  whatsappUrl,
  formatCurrency,
}) => {
  const balanceDue = Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0));
  const qualityChecks = twin?.qualityChecks || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner de Estado */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          borderLeft: '4px solid var(--color-success)', 
          backgroundColor: 'rgba(34, 197, 94, 0.08)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(34, 197, 94, 0.15)', 
              color: 'var(--color-success)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}
          >
            <PackageCheck size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase' }}>
              Etapa 5 · Listo para Entrega
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.1rem 0 0 0' }}>
              🎉 ¡Su equipo está terminado y listo para retirar!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
              Su <strong>{order.brand} {order.model}</strong> ha superado con éxito las pruebas técnicas y de control de calidad. Puede pasar a retirarlo en nuestro local comercial.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Saldo Pendiente y Pruebas de Calidad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Tarjeta de Retiro y Saldo */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} className="text-primary" /> Información de Retiro
          </h4>

          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Saldo Pendiente a Cancelar
            </span>
            <strong style={{ color: balanceDue > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontSize: '1.75rem', fontWeight: 900, display: 'block', marginTop: '0.2rem' }}>
              {balanceDue > 0 ? formatCurrency(balanceDue) : 'Totalmente Cancelado'}
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
              (Costo Total: {formatCurrency(order.cost)} | Abono: {formatCurrency(order.paymentAdvance || 0)})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
            <MapPin size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
            <span>
              Recuerde presentar su documento de identidad o el código de orden <strong>{order.id}</strong> al momento de retirar su equipo.
            </span>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.88rem', gap: '0.5rem', justifyContent: 'center' }}
          >
            <MessageCircle size={18} style={{ color: '#25D366' }} /> Confirmar Hora de Retiro por WhatsApp
          </a>
        </div>

        {/* Tarjeta de Control de Calidad */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> 
            Control de Calidad Aprobado
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
            Verificación técnica realizada previa entrega al cliente:
          </p>

          {qualityChecks.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {qualityChecks.map((q: DigitalTwinQualityCheck) => (
                <span
                  key={q.componentKey}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    backgroundColor: q.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: q.passed ? 'var(--color-success)' : 'var(--color-danger)',
                    border: `1px solid ${q.passed ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {q.passed ? '✓' : '✗'} {q.componentName.split('/')[0]}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ✓ Todas las pruebas de encendido, pantalla y carga completadas con éxito.
            </div>
          )}

          {/* Registro Fotográfico de Evidencias de Calidad y Funcionamiento */}
          {order.repairMediaUrls && order.repairMediaUrls.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.6rem' }}>
                <Camera size={14} style={{ color: 'var(--color-success)' }} />
                Evidencias de Funcionamiento en Laboratorio ({order.repairMediaUrls.length})
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.65rem' }}>
                {order.repairMediaUrls.map((url: string, idx: number) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      borderRadius: 'var(--border-radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-medium)',
                      aspectRatio: '1',
                      backgroundColor: '#000000',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <img
                      src={url}
                      alt={`Evidencia técnica ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
