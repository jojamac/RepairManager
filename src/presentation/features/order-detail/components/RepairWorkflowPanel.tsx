import React, { useState } from 'react';
import { DigitalTwinInstance, TwinComponentKey } from '../../../../domain/entities/DigitalTwin';
import { ServiceOrder } from '../../../../domain/entities/ServiceOrder';
import { CheckCircle2, Circle, AlertTriangle, Trash2, Plus, Loader2, ArrowRight, ArrowLeft, Lock, Check } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export type RepairWizardStep = 'piezas' | 'qc' | 'evidencias';

interface RepairWorkflowPanelProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance;
  onUpdateComponentStatus: (key: TwinComponentKey, status: any) => Promise<void>;
  onToggleQualityCheck: (key: TwinComponentKey, passed: boolean) => Promise<void>;
  onBatchQualityCheck?: (passed: boolean) => Promise<void>;
  onRemoveRepairMedia?: (index: number) => Promise<void>;
  onCompleteRepair: (pendingFiles?: File[]) => Promise<void>;
  canEditTechnicalData: boolean;
  formatCurrency: (val: number) => string;
}

export const RepairWorkflowPanel: React.FC<RepairWorkflowPanelProps> = ({
  order,
  twin,
  onUpdateComponentStatus,
  onToggleQualityCheck,
  onBatchQualityCheck,
  onRemoveRepairMedia,
  onCompleteRepair,
  canEditTechnicalData,
  formatCurrency
}) => {
  const toast = useToast();
  const [completing, setCompleting] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [localEvidenceFiles, setLocalEvidenceFiles] = useState<{ file: File; previewUrl: string }[]>([]);

  const damagedComponents = twin.components.filter(
    c => c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED' || c.status === 'REPAIRED' || c.status === 'REPLACED'
  );

  const pendingPartsCount = damagedComponents.filter(
    c => c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED'
  ).length;

  const passedQC = twin.qualityChecks.filter(q => q.passed).length;
  const totalQC = twin.qualityChecks.length;
  const pendingQCCount = totalQC - passedQC;
  const isCertified = passedQC === totalQC && totalQC > 0;

  const existingUrls = order.repairMediaUrls || [];
  const totalEvidenceCount = existingUrls.length + localEvidenceFiles.length;

  // Criterios de cumplimiento de cada etapa del Wizard
  const isPiezasCompleted = pendingPartsCount === 0;
  const isQcCompleted = pendingQCCount === 0;
  const isEvidenciasCompleted = totalEvidenceCount >= 1;

  // Desbloqueo progresivo
  const isQcUnlocked = isPiezasCompleted;
  const isEvidenciasUnlocked = isPiezasCompleted && isQcCompleted;

  // Paso inicial según el progreso de la orden
  const [currentStep, setCurrentStep] = useState<RepairWizardStep>(() => {
    if (!isPiezasCompleted) return 'piezas';
    if (!isQcCompleted) return 'qc';
    return 'evidencias';
  });

  // Requisitos obligatorios para finalizar: Piezas OK + QC OK + Al menos 1 Foto de Evidencia
  const canFinish = isPiezasCompleted && isQcCompleted && isEvidenciasCompleted;

  const handleStepClick = (target: RepairWizardStep) => {
    if (target === 'piezas') {
      setCurrentStep('piezas');
      return;
    }

    if (target === 'qc') {
      if (!isQcUnlocked) {
        toast.warning('Primero debes marcar todas las piezas intervenidas como reparadas o con repuesto instalado.');
        return;
      }
      setCurrentStep('qc');
      return;
    }

    if (target === 'evidencias') {
      if (!isPiezasCompleted) {
        toast.warning('Primero debes completar la reparación física de las piezas.');
        return;
      }
      if (!isQcCompleted) {
        toast.warning('Primero debes superar las pruebas en Control de Calidad (QC).');
        return;
      }
      setCurrentStep('evidencias');
      return;
    }
  };

  const handleFinish = async () => {
    if (!canFinish) return;
    setCompleting(true);
    try {
      await onCompleteRepair(localEvidenceFiles.map(item => item.file));
    } finally {
      setCompleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REPLACEMENT_REQUIRED':
        return {
          label: 'Requiere Cambio de Repuesto',
          color: 'var(--color-danger)',
          bg: 'rgba(239, 68, 68, 0.12)',
          icon: '🔴'
        };
      case 'DAMAGED':
        return {
          label: 'Falla (Reparable en Lab)',
          color: '#ea580c',
          bg: 'rgba(249, 115, 22, 0.12)',
          icon: '🟠'
        };
      case 'REPAIRED':
        return {
          label: 'Reparado en Laboratorio',
          color: 'var(--color-success)',
          bg: 'rgba(16, 185, 129, 0.12)',
          icon: '🛠️'
        };
      case 'REPLACED':
        return {
          label: 'Repuesto Nuevo Instalado',
          color: 'var(--color-success)',
          bg: 'rgba(16, 185, 129, 0.12)',
          icon: '✨'
        };
      case 'VERIFIED':
        return {
          label: 'Verificado (OK)',
          color: 'var(--color-success)',
          bg: 'rgba(16, 185, 129, 0.12)',
          icon: '🟢'
        };
      default:
        return {
          label: 'Operativo',
          color: 'var(--color-primary)',
          bg: 'rgba(59, 130, 246, 0.12)',
          icon: '🔵'
        };
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.15rem', height: '100%', minHeight: '480px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      
      {/* ─────────────── ENCABEZADO WIZARD PROGRESIVO ─────────────── */}
      <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          
          {/* PASO 1: PIEZAS */}
          <div
            onClick={() => handleStepClick('piezas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              padding: '0.45rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: currentStep === 'piezas' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
              border: `1.5px solid ${currentStep === 'piezas' ? 'var(--color-primary)' : isPiezasCompleted ? 'var(--color-success)' : 'var(--border-medium)'}`,
              transition: 'all 0.2s ease',
              flex: '1 1 0',
              justifyContent: 'center'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: isPiezasCompleted ? 'var(--color-success)' : currentStep === 'piezas' ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {isPiezasCompleted ? <Check size={13} strokeWidth={3} /> : '1'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: currentStep === 'piezas' ? 'var(--color-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Piezas
              </span>
              <span style={{ fontSize: '0.65rem', color: isPiezasCompleted ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {isPiezasCompleted ? '✓ Listas' : `${pendingPartsCount} pend.`}
              </span>
            </div>
          </div>

          {/* Conector 1 -> 2 */}
          <div style={{ height: '2px', flex: '0 0 14px', backgroundColor: isPiezasCompleted ? 'var(--color-success)' : 'var(--border-light)', margin: '0 4px' }} />

          {/* PASO 2: CONTROL DE CALIDAD */}
          <div
            onClick={() => handleStepClick('qc')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: isQcUnlocked ? 'pointer' : 'not-allowed',
              opacity: isQcUnlocked ? 1 : 0.65,
              padding: '0.45rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: currentStep === 'qc' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
              border: `1.5px solid ${currentStep === 'qc' ? 'var(--color-primary)' : isQcCompleted ? 'var(--color-success)' : 'var(--border-medium)'}`,
              transition: 'all 0.2s ease',
              flex: '1 1 0',
              justifyContent: 'center'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: isQcCompleted ? 'var(--color-success)' : currentStep === 'qc' ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {!isQcUnlocked ? <Lock size={11} /> : isQcCompleted ? <Check size={13} strokeWidth={3} /> : '2'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: currentStep === 'qc' ? 'var(--color-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Calidad (QC)
              </span>
              <span style={{ fontSize: '0.65rem', color: isQcCompleted ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {passedQC}/{totalQC} OK
              </span>
            </div>
          </div>

          {/* Conector 2 -> 3 */}
          <div style={{ height: '2px', flex: '0 0 14px', backgroundColor: isQcCompleted ? 'var(--color-success)' : 'var(--border-light)', margin: '0 4px' }} />

          {/* PASO 3: EVIDENCIAS */}
          <div
            onClick={() => handleStepClick('evidencias')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: isEvidenciasUnlocked ? 'pointer' : 'not-allowed',
              opacity: isEvidenciasUnlocked ? 1 : 0.65,
              padding: '0.45rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: currentStep === 'evidencias' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
              border: `1.5px solid ${currentStep === 'evidencias' ? 'var(--color-primary)' : isEvidenciasCompleted ? 'var(--color-success)' : 'var(--border-medium)'}`,
              transition: 'all 0.2s ease',
              flex: '1 1 0',
              justifyContent: 'center'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: isEvidenciasCompleted ? 'var(--color-success)' : currentStep === 'evidencias' ? 'var(--color-primary)' : 'var(--bg-secondary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {!isEvidenciasUnlocked ? <Lock size={11} /> : isEvidenciasCompleted ? <Check size={13} strokeWidth={3} /> : '3'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: currentStep === 'evidencias' ? 'var(--color-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Evidencias
              </span>
              <span style={{ fontSize: '0.65rem', color: isEvidenciasCompleted ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {totalEvidenceCount}/3 fotos
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────── CONTENIDO DEL PASO ACTIVO ─────────────── */}

      {/* PASO 1: REPARACIÓN DE PIEZAS */}
      {currentStep === 'piezas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Paso 1: Marque las piezas reparadas o reemplazadas físicamente en el taller:
            </p>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isPiezasCompleted ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {isPiezasCompleted ? '✓ Todo Listo' : `${pendingPartsCount} pendiente(s)`}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {damagedComponents.map((c) => {
              const isRepaired = c.status === 'REPAIRED' || c.status === 'REPLACED' || c.status === 'VERIFIED';
              const badge = getStatusBadge(c.status);

              return (
                <div 
                  key={c.key}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--border-radius-sm)',
                    borderLeft: `4px solid ${isRepaired ? 'var(--color-success)' : badge.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {isRepaired ? '🛠️ ' : `${badge.icon} `}{c.name.split('/')[0]}
                      </strong>
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {c.diagnosisNote && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0.05rem 0' }}>
                        Nota de diagnóstico: "{c.diagnosisNote}"
                      </div>
                    )}

                    {(c.replacementCost ?? 0) > 0 && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Costo del repuesto: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.replacementCost || 0)}</strong>
                      </span>
                    )}
                  </div>

                  {canEditTechnicalData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {isRepaired ? (
                        <>
                          <span 
                            style={{ 
                              fontSize: '0.78rem', 
                              fontWeight: 700, 
                              padding: '0.35rem 0.65rem', 
                              borderRadius: '4px',
                              backgroundColor: c.status === 'REPLACED' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: c.status === 'REPLACED' ? 'var(--color-primary)' : 'var(--color-success)',
                              border: `1px solid ${c.status === 'REPLACED' ? 'var(--color-primary)' : 'var(--color-success)'}`
                            }}
                          >
                            {c.status === 'REPLACED' ? '📦 Repuesto Instalado' : '🛠️ Pieza Reparada'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={updatingKey === c.key}
                            onClick={async () => {
                              setUpdatingKey(c.key);
                              try {
                                const prevStatus = c.diagnosisStatus || 
                                  twin.events?.find(e => e.componentKey === c.key && (e.previousStatus === 'DAMAGED' || e.previousStatus === 'REPLACEMENT_REQUIRED'))?.previousStatus ||
                                  ((c.replacementCost ?? 0) > 0 ? 'REPLACEMENT_REQUIRED' : 'DAMAGED');
                                await onUpdateComponentStatus(c.key, prevStatus);
                              } finally {
                                setUpdatingKey(null);
                              }
                            }}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            ↩ Deshacer
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={updatingKey === c.key}
                            onClick={async () => {
                              setUpdatingKey(c.key);
                              try {
                                await onUpdateComponentStatus(c.key, 'REPAIRED');
                                if (pendingPartsCount <= 1) {
                                  setTimeout(() => {
                                    setCurrentStep('qc');
                                    toast.success('¡Todas las piezas listas! Pasando a Control de Calidad.');
                                  }, 450);
                                }
                              } finally {
                                setUpdatingKey(null);
                              }
                            }}
                            style={{ 
                              padding: '0.45rem 0.75rem', 
                              fontSize: '0.78rem', 
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--color-success)',
                              borderColor: 'var(--color-success)'
                            }}
                          >
                            🛠️ Marcar Reparada
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={updatingKey === c.key}
                            onClick={async () => {
                              setUpdatingKey(c.key);
                              try {
                                await onUpdateComponentStatus(c.key, 'REPLACED');
                                if (pendingPartsCount <= 1) {
                                  setTimeout(() => {
                                    setCurrentStep('qc');
                                    toast.success('¡Todas las piezas listas! Pasando a Control de Calidad.');
                                  }, 450);
                                }
                              } finally {
                                setUpdatingKey(null);
                              }
                            }}
                            style={{ 
                              padding: '0.45rem 0.75rem', 
                              fontSize: '0.78rem', 
                              fontWeight: 700,
                              backgroundColor: 'var(--color-primary)',
                              borderColor: 'var(--color-primary)'
                            }}
                          >
                            📦 Repuesto Instalado
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {damagedComponents.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                No hay piezas marcadas con daño en esta orden. Puedes continuar directamente a Control de Calidad.
              </div>
            )}
          </div>

          {/* Botón de avance manual al Paso 2 */}
          {isPiezasCompleted && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep('qc')}
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, gap: '0.4rem' }}
              >
                Continuar a Control de Calidad (QC) <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* PASO 2: CONTROL DE CALIDAD (QC) */}
      {currentStep === 'qc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Paso 2: Realice el checklist de pruebas antes de autorizar la salida del equipo:
              </p>
              <span style={{ fontSize: '0.72rem', color: isCertified ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 700 }}>
                Progreso: {passedQC} de {totalQC} pruebas superadas {isCertified ? '· ¡QC Certificado! ✅' : ''}
              </span>
            </div>

            {canEditTechnicalData && onBatchQualityCheck && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    await onBatchQualityCheck(true);
                    setTimeout(() => {
                      setCurrentStep('evidencias');
                      toast.success('¡Control de Calidad superado! Avanzando a Evidencias Fotográficas.');
                    }, 450);
                  }}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', gap: '0.3rem' }}
                  title="Marcar todas las pruebas como superadas y avanzar"
                >
                  ✓ Aprobar Todas
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onBatchQualityCheck(false)}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', gap: '0.3rem' }}
                  title="Reiniciar todas las pruebas a pendiente"
                >
                  ↺ Reiniciar a Pendiente
                </button>
              </div>
            )}
          </div>

          {/* Barra de progreso visual */}
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${totalQC > 0 ? (passedQC / totalQC) * 100 : 0}%`, 
                height: '100%', 
                backgroundColor: isCertified ? 'var(--color-success)' : 'var(--color-primary)',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.6rem' }}>
            {twin.qualityChecks.map((qc) => {
              const isRepairedComponent = damagedComponents.some(c => c.key === qc.componentKey);

              return (
                <div
                  key={qc.componentKey}
                  role="button"
                  tabIndex={0}
                  onClick={async () => {
                    if (!canEditTechnicalData) {
                      toast.warning('No tienes permisos asignados para modificar el control de calidad.');
                      return;
                    }
                    const nextPassed = !qc.passed;
                    await onToggleQualityCheck(qc.componentKey, nextPassed);

                    // Auto-avance al Paso 3 (Evidencias) si se marcó la última prueba pendiente
                    if (nextPassed && pendingQCCount <= 1) {
                      setTimeout(() => {
                        setCurrentStep('evidencias');
                        toast.success('¡QC Certificado! Pasando automáticamente a Evidencias Fotográficas.');
                      }, 450);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: qc.passed ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)',
                    border: `1.5px solid ${qc.passed ? 'var(--color-success)' : isRepairedComponent ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-medium)'}`,
                    borderRadius: 'var(--border-radius-sm)',
                    cursor: canEditTechnicalData ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.6rem',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: qc.passed ? '0 1px 3px rgba(16, 185, 129, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    {qc.passed ? (
                      <CheckCircle2 size={19} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    ) : (
                      <Circle size={19} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: qc.passed ? 700 : 500, color: qc.passed ? 'var(--color-success)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {qc.componentName.split('/')[0]}
                      </span>
                      {isRepairedComponent && (
                        <span style={{ fontSize: '0.65rem', color: qc.passed ? 'var(--color-success)' : '#ef4444', fontWeight: 700 }}>
                          {qc.passed ? '✓ Pieza reparada probada' : '⚡ Pieza reparada (Prioridad)'}
                        </span>
                      )}
                    </div>
                  </div>

                  <span 
                    style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 700, 
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: qc.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(150, 150, 150, 0.12)',
                      color: qc.passed ? 'var(--color-success)' : 'var(--text-muted)' 
                    }}
                  >
                    {qc.passed ? '✓ Probado' : '○ Probar'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Navegación manual Paso 2 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep('piezas')}
              style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem', gap: '0.4rem' }}
            >
              <ArrowLeft size={15} /> Volver a Piezas
            </button>

            {isQcCompleted && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep('evidencias')}
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, gap: '0.4rem' }}
              >
                Continuar a Evidencias <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PASO 3: EVIDENCIAS FOTOGRÁFICAS (OBLIGATORIAS) */}
      {currentStep === 'evidencias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Paso 3: Adjunte fotografías demostrando el correcto funcionamiento del dispositivo:
              </p>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isEvidenciasCompleted ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {totalEvidenceCount}/3 fotos {isEvidenciasCompleted ? '✓ Requisito Cumplido' : '(Obligatorio mín. 1)'}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Ejemplos: pantalla encendida mostrando el menú, probador de carga USB marcando amperaje, pruebas de cámara o sonido.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.85rem' }}>
            {/* 1. Fotografías ya existentes previamente guardadas (si las hay) */}
            {existingUrls.map((url, idx) => (
              <div 
                key={`existing-${idx}`} 
                style={{ 
                  position: 'relative', 
                  borderRadius: 'var(--border-radius-sm)', 
                  overflow: 'hidden', 
                  border: '1px solid var(--border-medium)',
                  aspectRatio: '1',
                  backgroundColor: '#000000',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                <img 
                  src={url} 
                  alt={`Evidencia previa ${idx + 1}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {canEditTechnicalData && onRemoveRepairMedia && (
                  <button
                    type="button"
                    onClick={() => onRemoveRepairMedia(idx)}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      color: 'var(--color-danger)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Eliminar fotografía"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <span 
                  style={{ 
                    position: 'absolute', 
                    bottom: '4px', 
                    left: '6px', 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    color: '#ffffff', 
                    backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                    padding: '1px 5px', 
                    borderRadius: '3px' 
                  }}
                >
                  Evidencia #{idx + 1}
                </span>
              </div>
            ))}

            {/* 2. Fotografías seleccionadas en el dispositivo (locales, pendientes de subir al finalizar) */}
            {localEvidenceFiles.map((item, idx) => (
              <div 
                key={`local-${idx}`} 
                style={{ 
                  position: 'relative', 
                  borderRadius: 'var(--border-radius-sm)', 
                  overflow: 'hidden', 
                  border: '2px solid var(--color-primary)',
                  aspectRatio: '1',
                  backgroundColor: '#000000',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                <img 
                  src={item.previewUrl} 
                  alt={`Evidencia local ${idx + 1}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {canEditTechnicalData && (
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(item.previewUrl);
                      setLocalEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
                    }}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      color: 'var(--color-danger)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Quitar fotografía"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <span 
                  style={{ 
                    position: 'absolute', 
                    bottom: '4px', 
                    left: '6px', 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    color: '#ffffff', 
                    backgroundColor: 'rgba(59, 130, 246, 0.9)', 
                    padding: '1px 5px', 
                    borderRadius: '3px' 
                  }}
                >
                  Evidencia #{existingUrls.length + idx + 1}
                </span>
              </div>
            ))}

            {/* 3. Botón para seleccionar o capturar foto localmente */}
            {canEditTechnicalData && totalEvidenceCount < 3 && (
              <label 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.45rem', 
                  border: '2px dashed var(--border-medium)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  aspectRatio: '1', 
                  cursor: completing ? 'not-allowed' : 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  padding: '0.5rem'
                }}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  style={{ display: 'none' }} 
                  disabled={completing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (totalEvidenceCount >= 3) {
                        toast.warning('Límite máximo de 3 fotografías de evidencia alcanzado.');
                        return;
                      }
                      const previewUrl = URL.createObjectURL(file);
                      setLocalEvidenceFiles(prev => [...prev, { file, previewUrl }]);
                      e.target.value = '';
                    }
                  }}
                />
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tomar / Adjuntar Foto
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  ({totalEvidenceCount}/3 seleccionadas)
                </span>
              </label>
            )}
          </div>

          {/* Navegación manual Paso 3 */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'auto', paddingTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep('qc')}
              style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem', gap: '0.4rem' }}
            >
              <ArrowLeft size={15} /> Volver a Control de Calidad (QC)
            </button>
          </div>
        </div>
      )}

      {/* ─────────────── BLOQUE DE VALIDACIÓN Y FINALIZACIÓN ─────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: '1.1rem', borderTop: '1px solid var(--border-light)' }}>
        {canEditTechnicalData && (
          <>
            {!canFinish ? (
              <div 
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  marginBottom: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-danger)', fontWeight: 800 }}>
                  <AlertTriangle size={16} />
                  <span>Requisitos obligatorios para finalizar la orden:</span>
                </div>
                <div style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {pendingPartsCount > 0 && (
                    <span>• Quedan <strong>{pendingPartsCount} pieza(s)</strong> pendientes por reparar o sustituir repuesto.</span>
                  )}
                  {pendingQCCount > 0 && (
                    <span>• Faltan <strong>{pendingQCCount} prueba(s)</strong> por verificar en Control de Calidad (QC).</span>
                  )}
                  {totalEvidenceCount === 0 && (
                    <span>• Debe adjuntar al menos <strong>1 fotografía de evidencia</strong> que demuestre el correcto funcionamiento.</span>
                  )}
                </div>
              </div>
            ) : (
              <div 
                style={{
                  padding: '0.65rem 0.95rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.78rem',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem'
                }}
              >
                <CheckCircle2 size={16} />
                <span>¡Excelente! Piezas reparadas, QC certificado y evidencias adjuntas. Equipo listo para finalizar.</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={!canFinish || completing}
              onClick={handleFinish}
              style={{ 
                padding: '0.75rem', 
                fontSize: '0.9rem', 
                fontWeight: 800, 
                backgroundColor: canFinish ? 'var(--color-success)' : 'var(--bg-tertiary)', 
                borderColor: canFinish ? 'var(--color-success)' : 'var(--border-medium)', 
                color: canFinish ? '#ffffff' : 'var(--text-muted)',
                cursor: canFinish ? 'pointer' : 'not-allowed',
                opacity: canFinish ? 1 : 0.65,
                gap: '0.5rem' 
              }}
            >
              {completing ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Subiendo evidencias a Storage y finalizando orden...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>Finalizar Reparación y Marcar Listo para Entrega</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
