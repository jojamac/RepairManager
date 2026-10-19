import React from 'react';
import { ServiceOrder } from '../../../../../domain/entities/ServiceOrder';
import { DigitalTwinInstance, DigitalTwinComponent } from '../../../../../domain/entities/DigitalTwin';
import { Wrench, MessageCircle, Clock } from 'lucide-react';

interface TrackingRepairStageProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance | null;
  whatsappUrl: string;
}

export const TrackingRepairStage: React.FC<TrackingRepairStageProps> = ({
  order,
  twin,
  whatsappUrl,
}) => {
  const activeComponents = twin 
    ? twin.components.filter((c: DigitalTwinComponent) => c.status !== 'NORMAL')
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner de Estado */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          borderLeft: '4px solid var(--color-primary)', 
          backgroundColor: 'rgba(59, 130, 246, 0.08)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(59, 130, 246, 0.15)', 
              color: 'var(--color-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}
          >
            <Wrench size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
              Etapa 4 · En Reparación
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0 0 0' }}>
              Trabajo Técnico en Progreso
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
              ¡Su reparación está en marcha! Los repuestos han sido asignados y nuestro equipo técnico se encuentra realizando el ensamble y calibración de su <strong>{order.brand} {order.model}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta de Componentes en Taller */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
            Estado de los Componentes en Taller
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
            Seguimiento de las piezas en proceso de reemplazo o reparación técnica:
          </p>
        </div>

        {activeComponents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeComponents.map((c: DigitalTwinComponent) => {
              const isDone = c.status === 'REPAIRED' || c.status === 'REPLACED' || c.status === 'VERIFIED';
              return (
                <div 
                  key={c.key} 
                  style={{ 
                    padding: '0.85rem 1rem', 
                    backgroundColor: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--border-radius-sm)',
                    border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-medium)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      {c.name}
                    </strong>
                    {c.diagnosisNote && (
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {c.diagnosisNote}
                      </span>
                    )}
                  </div>

                  <div>
                    {isDone ? (
                      <span className="badge badge-entregado" style={{ fontSize: '0.75rem', gap: '0.3rem' }}>
                        ✓ Reparado / Calibrado
                      </span>
                    ) : (
                      <span className="badge badge-reparacion" style={{ fontSize: '0.75rem', gap: '0.3rem' }}>
                        ⚡ En Ensamble
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Reparación en mesa de trabajo técnica.
          </div>
        )}

        {/* Próximo Paso */}
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.06)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <Clock size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span>
            Una vez concluido el armado físico, el dispositivo pasará a la etapa de <strong>Control de Calidad (Pruebas de pantalla, cámaras y carga)</strong> antes de ser notificado para entrega.
          </span>
        </div>

        {/* WhatsApp */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.88rem', gap: '0.5rem' }}
          >
            <MessageCircle size={18} style={{ color: '#25D366' }} /> Consultar Avance por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
