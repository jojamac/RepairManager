import React, { useState } from 'react';
import { DigitalTwinInstance, TwinComponentStatus, DigitalTwinComponent, getOriginalDiagnosticStatus } from '../../domain/entities/DigitalTwin';
import { DeviceTwinViewer3D } from './DeviceTwinViewer3D';
import { RefreshCw } from 'lucide-react';

interface DigitalTwinPanelProps {
  twin: DigitalTwinInstance;
  selectedComponentKey: string | null;
  onSelectComponent: (key: string, newStatus?: TwinComponentStatus) => void;
  readOnly?: boolean;
  filterDamagedOnly?: boolean;
  hidePrices?: boolean;
  onResetAll?: () => void;
  height?: string;
  title?: string;
  subtitle?: string;
  onlyDamagedMarkers?: boolean;
}

export const DigitalTwinPanel: React.FC<DigitalTwinPanelProps> = ({
  twin,
  selectedComponentKey,
  onSelectComponent,
  readOnly = false,
  filterDamagedOnly = false,
  hidePrices = false,
  onResetAll,
  height = '460px',
  title,
  subtitle,
  onlyDamagedMarkers
}) => {
  const [isXRayMode, setIsXRayMode] = useState(true);
  const shouldHidePrices = hidePrices || readOnly;

  return (
    <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {(title || subtitle) && (
        <div>
          {title && <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{title}</h3>}
          {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>{subtitle}</p>}
        </div>
      )}

      {/* Visor 3D amplio */}
      <div style={{ position: 'relative', height, borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
        <DeviceTwinViewer3D
          components={twin.components}
          selectedComponentKey={selectedComponentKey}
          hideActionPanel={true}
          onSelectComponent={(key, newStatus) => !readOnly && onSelectComponent(key, newStatus)}
          isXRayMode={isXRayMode}
          onToggleXRayMode={() => setIsXRayMode(!isXRayMode)}
          readOnly={readOnly}
          onlyDamagedMarkers={onlyDamagedMarkers ?? filterDamagedOnly}
        />
      </div>

      {/* Chips Horizontales de Componentes Despiezados */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {filterDamagedOnly ? 'Piezas Diagnosticadas (A reparar)' : `Componentes despiece (${twin.components.length})`}
          </span>
          {!readOnly && onResetAll && (
            <button
              type="button"
              className="btn"
              onClick={onResetAll}
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={12} /> Resetear todo
            </button>
          )}
        </div>

        <div 
          style={{ 
            display: 'flex', 
            gap: '0.4rem', 
            overflowX: 'auto', 
            paddingBottom: '0.4rem',
            scrollbarWidth: 'thin' 
          }}
        >
          {twin.components
            .filter((comp: DigitalTwinComponent) => {
              if (!filterDamagedOnly) return true;
              const diagStatus = getOriginalDiagnosticStatus(comp, twin.events);
              return comp.status === 'DAMAGED' || 
                     comp.status === 'REPLACEMENT_REQUIRED' || 
                     comp.status === 'REPAIRED' ||
                     comp.status === 'REPLACED' ||
                     diagStatus === 'DAMAGED' || 
                     diagStatus === 'REPLACEMENT_REQUIRED' ||
                     (twin.events && twin.events.some(e => e.componentKey === comp.key && (e.previousStatus === 'DAMAGED' || e.previousStatus === 'REPLACEMENT_REQUIRED')));
            })
            .map((comp: DigitalTwinComponent) => {
              const diagStatus = getOriginalDiagnosticStatus(comp, twin.events);
              // Si el panel es de sólo lectura (diagnóstico/aprobación/tracking), reflejamos el diagnóstico original
              const isReplacement = comp.status === 'REPLACEMENT_REQUIRED' || diagStatus === 'REPLACEMENT_REQUIRED';
              const isDamagedLab = (comp.status === 'DAMAGED' || diagStatus === 'DAMAGED') && !isReplacement;
              const isDamaged = isReplacement || isDamagedLab;
              const isRepaired = !readOnly && (comp.status === 'REPAIRED' || comp.status === 'REPLACED');
              const isSelected = (selectedComponentKey === comp.key) || filterDamagedOnly || readOnly || isDamaged || isRepaired;

              const borderColor = isReplacement ? '#ef4444' : isDamagedLab ? '#f97316' : (isRepaired ? '#06b6d4' : (isSelected ? 'var(--color-primary)' : 'var(--border-medium)'));
              const bgColor = isReplacement ? 'rgba(239, 68, 68, 0.18)' : isDamagedLab ? 'rgba(249, 115, 22, 0.18)' : (isRepaired ? 'rgba(6, 182, 212, 0.18)' : 'var(--bg-tertiary)');
              const shadow = isReplacement ? '0 0 10px rgba(239, 68, 68, 0.35)' : isDamagedLab ? '0 0 10px rgba(249, 115, 22, 0.35)' : (isRepaired ? '0 0 10px rgba(6, 182, 212, 0.35)' : undefined);

              return (
                <button
                  key={comp.key}
                  type="button"
                  onClick={() => !readOnly && onSelectComponent(comp.key)}
                  className={`chip ${isDamaged ? 'damaged' : comp.status === 'WARNING' ? 'warning' : comp.status === 'VERIFIED' ? 'verified' : 'normal'}`}
                  style={{
                    flexShrink: 0,
                    cursor: readOnly ? 'default' : 'pointer',
                    border: `2px solid ${borderColor}`,
                    fontWeight: 800,
                    backgroundColor: bgColor,
                    boxShadow: shadow
                  }}
                >
                  <span>
                    {isReplacement 
                      ? '🔴 🎯' 
                      : isDamagedLab 
                        ? '🟠 🎯' 
                        : comp.status === 'WARNING' 
                          ? '🟡' 
                          : comp.status === 'REPAIRED' 
                            ? '🛠️ 🎯' 
                            : comp.status === 'REPLACED'
                              ? '📦 🎯'
                              : comp.status === 'VERIFIED' 
                                ? '🟢' 
                                : '🔵'}
                  </span>
                  <span>{comp.name.split('/')[0]}</span>
                  
                  {/* Mostrar costo únicamente en panel de técnico (no en tracking de cliente) */}
                  {!shouldHidePrices && (comp.replacementCost ?? 0) > 0 && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444' }}>
                      ${(comp.replacementCost ?? 0).toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
