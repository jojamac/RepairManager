import React, { useState, useEffect, useMemo } from 'react';
import { ServiceOrder } from '../../../../../domain/entities/ServiceOrder';
import { 
  DigitalTwinInstance, 
  DigitalTwinComponent, 
  getOriginalDiagnosticStatus, 
  getWorkshopOutcome, 
  createDiagnosticTwinSnapshot 
} from '../../../../../domain/entities/DigitalTwin';
import { DigitalTwinPanel } from '../../../../components/DigitalTwinPanel';
import { Wrench, FileText, MessageCircle, AlertCircle } from 'lucide-react';

interface TrackingDiagnosisStageProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance | null;
  whatsappUrl: string;
}

export const TrackingDiagnosisStage: React.FC<TrackingDiagnosisStageProps> = ({
  order,
  twin,
  whatsappUrl,
}) => {
  // Reconstrucción del Gemelo Digital en estado diagnóstico 100% inmutable
  const diagnosticTwin = useMemo(() => {
    if (!twin) return null;
    return createDiagnosticTwinSnapshot(twin);
  }, [twin]);

  const damagedComponents = diagnosticTwin 
    ? diagnosticTwin.components.filter((c: DigitalTwinComponent) => 
        c.status === 'DAMAGED' || 
        c.status === 'REPLACEMENT_REQUIRED' || 
        Boolean(c.diagnosisNote && c.diagnosisNote.trim().length > 0) || 
        Boolean(c.replacementCost && c.replacementCost > 0)
      )
    : [];

  const [selectedTwinKey, setSelectedTwinKey] = useState<string | null>(null);

  useEffect(() => {
    if (damagedComponents.length > 0) {
      if (!selectedTwinKey || !damagedComponents.some(c => c.key === selectedTwinKey)) {
        setSelectedTwinKey(damagedComponents[0].key);
      }
    } else {
      setSelectedTwinKey(null);
    }
  }, [damagedComponents.length, twin?.updatedAt]);

  const hasDiagnosisNotes = Boolean(order.technicalDiagnosis && order.technicalDiagnosis.trim().length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner de Estado del Diagnóstico con Botón de Contacto */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          borderLeft: '4px solid #06b6d4', 
          backgroundColor: 'rgba(6, 182, 212, 0.06)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 260px' }}>
            <div 
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(6, 182, 212, 0.15)', 
                color: '#06b6d4', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}
            >
              <Wrench size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase' }}>
                Etapa 2 · Laboratorio Técnico
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0 0 0' }}>
                Inspección y Diagnóstico Técnico en Curso
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
                Los técnicos están evaluando el estado del hardware, placa madre, circuitos de carga y pantalla de su <strong>{order.brand} {order.model}</strong>.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ 
              padding: '0.65rem 1.15rem', 
              fontSize: '0.85rem', 
              gap: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'rgba(37, 211, 102, 0.12)',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              color: 'var(--text-primary)',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <MessageCircle size={18} style={{ color: '#25D366' }} /> Consultar con el Laboratorio
          </a>
        </div>
      </div>

      {/* Grid: Gemelo 3D e Informe Técnico */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', 
          gap: '1.25rem',
          alignItems: 'start'
        }}
      >
        {/* Columna Izquierda: Visor 3D Interactivo */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
              Inspección Virtual 3D
            </span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>
              Gemelo Digital del Dispositivo
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.1rem' }}>
              {damagedComponents.length > 0 
                ? `Se han detectado ${damagedComponents.length} componente(s) con hallazgos de falla:` 
                : 'Inspección virtual en curso (sin componentes con falla marcados aún):'}
            </p>
          </div>

          {diagnosticTwin ? (
            <DigitalTwinPanel
              twin={diagnosticTwin}
              selectedComponentKey={selectedTwinKey}
              onSelectComponent={(key: string | null) => setSelectedTwinKey(key)}
              readOnly={true}
              filterDamagedOnly={damagedComponents.length > 0}
              onlyDamagedMarkers={true}
              height="420px"
            />
          ) : (
            <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-muted)' }}>
              Cargando gemelo digital...
            </div>
          )}
        </div>

        {/* Columna Derecha: Informe de Laboratorio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                Informe Técnico de Laboratorio
              </h4>
            </div>

            {hasDiagnosisNotes ? (
              <div 
                style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-primary)', 
                  borderLeft: '3px solid var(--color-primary)', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  padding: '1rem', 
                  borderRadius: '0 var(--border-radius-sm) var(--border-radius-sm) 0',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}
              >
                {order.technicalDiagnosis}
              </div>
            ) : (
              <div 
                style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  border: '1px dashed var(--border-medium)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <AlertCircle size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                <span>
                  El técnico se encuentra evaluando su equipo. Tan pronto como guarde sus conclusiones y notas de laboratorio, se visualizarán aquí de forma inmediata.
                </span>
              </div>
            )}
          </div>

          {/* Resumen de Piezas Diagnosticadas */}
          {damagedComponents.length > 0 && (
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                Componentes con Falla Confirmada en Laboratorio:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {damagedComponents.map((c: DigitalTwinComponent) => (
                  <div 
                    key={c.key} 
                    style={{ 
                      padding: '0.85rem 1rem', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-medium)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        • {c.name}
                      </strong>
                    </div>

                    {c.diagnosisNote && (
                      <div 
                        style={{ 
                          fontSize: '0.86rem', 
                          color: 'var(--text-primary)', 
                          lineHeight: '1.5', 
                          whiteSpace: 'pre-line',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          padding: '0.6rem 0.85rem',
                          borderRadius: 'var(--border-radius-sm)',
                          borderLeft: '3px solid var(--color-warning)'
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          Nota de Laboratorio:
                        </span>
                        {c.diagnosisNote}
                      </div>
                    )}

                    <div style={{ marginTop: '0.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(() => {
                        const origDiagStatus = getOriginalDiagnosticStatus(c, twin?.events);
                        const workshopOutcome = twin ? getWorkshopOutcome(c, twin.events) : 'PENDING';
                        const isReplacement = origDiagStatus === 'REPLACEMENT_REQUIRED';

                        const color = isReplacement ? 'var(--color-danger)' : '#f97316';
                        const label = isReplacement 
                          ? 'Requiere cambio total por repuesto nuevo' 
                          : 'Falla técnica diagnosticada (Reparable en laboratorio)';

                        return (
                          <>
                            <span 
                              style={{ 
                                fontSize: '0.72rem',
                                color,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                opacity: 0.95
                              }}
                            >
                              <span 
                                style={{ 
                                  width: '6px', 
                                  height: '6px', 
                                  borderRadius: '50%', 
                                  backgroundColor: color,
                                  display: 'inline-block' 
                                }} 
                              />
                              {label}
                            </span>

                            {workshopOutcome === 'REPAIRED' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                ✓ Reparada en taller
                              </span>
                            )}
                            {workshopOutcome === 'REPLACED' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                ✓ Repuesto nuevo instalado
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
