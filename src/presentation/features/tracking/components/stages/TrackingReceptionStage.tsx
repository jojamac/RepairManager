import React from 'react';
import { ServiceOrder } from '../../../../../domain/entities/ServiceOrder';
import { Clock, MessageCircle, Camera, CheckCircle } from 'lucide-react';

interface TrackingReceptionStageProps {
  order: ServiceOrder;
  whatsappUrl: string;
}

export const TrackingReceptionStage: React.FC<TrackingReceptionStageProps> = ({
  order,
  whatsappUrl,
}) => {
  return (
    <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Encabezado de la Etapa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div 
          style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(59, 130, 246, 0.12)', 
            color: 'var(--color-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}
        >
          <Clock size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
            Etapa 1 · Recepción y Registro
          </span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
            Equipo Ingresado en Taller
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
            Su dispositivo ha sido recibido y registrado en el sistema. Actualmente está en turno para inspección física y diagnóstico en laboratorio.
          </p>
        </div>
      </div>

      {/* Grid de Información de Entrada */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Dispositivo Registrado
          </span>
          <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginTop: '0.25rem' }}>
            📱 {order.brand} {order.model}
          </strong>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Fecha y Hora de Ingreso
          </span>
          <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block', marginTop: '0.25rem' }}>
            📅 {new Date(order.entryDate).toLocaleString()}
          </strong>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)', gridColumn: '1 / -1' }}>
          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
            Falla o Motivo de Ingreso Reportado por el Cliente
          </span>
          <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginTop: '0.25rem' }}>
            "{order.reportedFailure}"
          </strong>
        </div>
      </div>

      {/* Fotos de Ingreso Inicial (si existen) */}
      {order.mediaUrls && order.mediaUrls.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Camera size={16} /> Registro Fotográfico de Recepción ({order.mediaUrls.length})
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
            {order.mediaUrls.map((url: string, idx: number) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  borderRadius: 'var(--border-radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-light)',
                  aspectRatio: '1',
                  backgroundColor: '#000'
                }}
              >
                <img
                  src={url}
                  alt={`Evidencia de ingreso ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Estado del Próximo Paso */}
      <div style={{ padding: '1rem', backgroundColor: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <CheckCircle size={20} style={{ color: '#06b6d4', flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Próximo paso:</strong> Cuando el técnico abra la orden y comience la revisión técnica de circuitos y piezas, la etapa <strong>Diagnóstico</strong> se desbloqueará automáticamente en esta misma pantalla.
        </span>
      </div>

      {/* Botón WhatsApp */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary"
          style={{ padding: '0.75rem 1.25rem', fontSize: '0.88rem', gap: '0.5rem' }}
        >
          <MessageCircle size={18} style={{ color: '#25D366' }} /> Contactar al Taller por WhatsApp
        </a>
      </div>
    </div>
  );
};
