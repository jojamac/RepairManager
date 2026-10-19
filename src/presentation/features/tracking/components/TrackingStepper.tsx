import React from 'react';
import { ServiceOrder, OrderStatus, StatusHistoryEntry } from '../../../../domain/entities/ServiceOrder';
import { Check, Clock, Wrench, DollarSign, PackageCheck, CheckCircle2 } from 'lucide-react';

export interface ProgressiveStepItem {
  key: OrderStatus;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  date?: string;
  isLatest: boolean;
}

const STEP_DEFINITIONS: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
  ingresado: {
    title: 'Recibido',
    subtitle: 'Taller',
    icon: <Clock size={13} />
  },
  diagnostico: {
    title: 'Diagnóstico',
    subtitle: 'Revisión',
    icon: <Wrench size={13} />
  },
  espera_aprobacion: {
    title: 'Aprobación',
    subtitle: 'Cotización',
    icon: <DollarSign size={13} />
  },
  reparacion: {
    title: 'Reparación',
    subtitle: 'Laboratorio',
    icon: <Wrench size={13} />
  },
  listo: {
    title: 'Listo',
    subtitle: 'Control Calidad',
    icon: <PackageCheck size={13} />
  },
  entregado: {
    title: 'Entregado',
    subtitle: 'Garantía',
    icon: <CheckCircle2 size={13} />
  }
};

interface TrackingStepperProps {
  order: ServiceOrder;
  selectedStage: OrderStatus;
  onSelectStage: (stage: OrderStatus) => void;
  withoutCard?: boolean;
}

export const TrackingStepper: React.FC<TrackingStepperProps> = ({
  order,
  selectedStage,
  onSelectStage,
  withoutCard = false
}) => {
  // Construir la lista de steps dinámicos que REALMENTE ha vivido la orden
  const buildProgressiveSteps = (history: StatusHistoryEntry[] = [], currentStatus: OrderStatus): ProgressiveStepItem[] => {
    const steps: ProgressiveStepItem[] = [];
    const seen = new Set<string>();

    for (const entry of history) {
      if (!seen.has(entry.status) && STEP_DEFINITIONS[entry.status]) {
        seen.add(entry.status);
        steps.push({
          key: entry.status,
          ...STEP_DEFINITIONS[entry.status],
          date: entry.date,
          isLatest: false
        });
      }
    }

    if (!seen.has(currentStatus) && STEP_DEFINITIONS[currentStatus]) {
      seen.add(currentStatus);
      steps.push({
        key: currentStatus,
        ...STEP_DEFINITIONS[currentStatus],
        isLatest: true
      });
    }

    if (!seen.has('ingresado') && STEP_DEFINITIONS['ingresado']) {
      steps.unshift({
        key: 'ingresado',
        ...STEP_DEFINITIONS['ingresado'],
        date: order.entryDate,
        isLatest: currentStatus === 'ingresado'
      });
    }

    if (steps.length > 0) {
      steps.forEach((s, idx) => {
        s.isLatest = idx === steps.length - 1;
      });
    }

    return steps;
  };

  const steps = buildProgressiveSteps(order.statusHistory, order.status);
  const isSingleStep = steps.length === 1;

  return (
    <div 
      className={withoutCard ? '' : 'glass-card'} 
      style={{ 
        padding: withoutCard ? '0.2rem 0' : '0.85rem 0.5rem', 
        width: '100%', 
        overflow: 'hidden', 
        boxSizing: 'border-box' 
      }}
    >
      <style>{`
        @keyframes stepPopIn {
          0% {
            opacity: 0;
            transform: scale(0.65) translateY(4px);
          }
          70% {
            transform: scale(1.08) translateY(-1px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes lineGrow {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @keyframes livePulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.45);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
          }
        }
        .progressive-step-node {
          animation: stepPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div style={{ width: '100%', position: 'relative', padding: '0 0.5rem', boxSizing: 'border-box' }}>
        
        {/* Barra Conectora Dinámica entre nodos */}
        {!isSingleStep && (
          <div
            style={{
              position: 'absolute',
              top: '15px',
              left: '25px',
              right: '25px',
              height: '3px',
              backgroundColor: 'var(--color-primary)',
              zIndex: 1,
              borderRadius: '2px',
              animation: 'lineGrow 0.5s ease-out forwards',
              opacity: 0.8
            }}
          />
        )}

        {/* Nodos del Stepper Creciente Compacto */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: isSingleStep ? 'flex-start' : 'space-between', 
            alignItems: 'flex-start',
            position: 'relative', 
            zIndex: 3,
            width: '100%',
            paddingLeft: isSingleStep ? '0.5rem' : '0'
          }}
        >
          {steps.map((step, idx) => {
            const isSelected = selectedStage === step.key;
            const isLatest = step.isLatest;
            const isPast = !isLatest;

            return (
              <div
                key={step.key}
                className="progressive-step-node"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: isSingleStep ? '0 0 auto' : 1,
                  minWidth: isSingleStep ? '85px' : 0,
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '0 2px',
                  animationDelay: `${idx * 0.06}s`
                }}
                onClick={() => onSelectStage(step.key)}
                title={`Ver detalles de ${step.title}`}
              >
                {/* Círculo indicador compacto */}
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected
                      ? 'var(--color-primary)'
                      : isPast
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'var(--bg-primary)',
                    border: isSelected
                      ? '2.5px solid var(--color-primary)'
                      : isPast
                      ? '2px solid var(--color-success)'
                      : '2px solid var(--color-primary)',
                    color: isSelected
                      ? '#ffffff'
                      : isPast
                      ? 'var(--color-success)'
                      : 'var(--color-primary)',
                    boxShadow: isSelected
                      ? '0 0 10px rgba(59, 130, 246, 0.5)'
                      : isLatest
                      ? '0 0 8px rgba(59, 130, 246, 0.3)'
                      : 'none',
                    animation: isLatest && !isSelected ? 'livePulse 2s infinite' : undefined,
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {isPast ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Título de la etapa compacto */}
                <span
                  style={{
                    fontSize: 'clamp(0.68rem, 2.2vw, 0.78rem)',
                    marginTop: '0.35rem',
                    fontWeight: isSelected ? 800 : isLatest ? 700 : 600,
                    color: isSelected
                      ? 'var(--color-primary)'
                      : isLatest
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}
                >
                  {step.title}
                </span>

                {/* Estado compacto (En curso / Completado) */}
                <span
                  style={{
                    fontSize: '0.62rem',
                    color: isLatest
                      ? 'var(--color-primary)'
                      : 'var(--color-success)',
                    textAlign: 'center',
                    marginTop: '0.05rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isLatest ? '⚡ Activo' : '✓ OK'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
