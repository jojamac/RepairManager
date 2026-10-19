import React from 'react';
import { ServiceOrder } from '../../../../domain/entities/ServiceOrder';
import { DigitalTwinInstance, TwinComponentStatus } from '../../../../domain/entities/DigitalTwin';
import { Tabs } from '../../../components/Tabs';
import { Wrench, FileText, AlertTriangle, Save, Trash2 } from 'lucide-react';

interface DiagnosisWorkflowPanelProps {
  order: ServiceOrder;
  draftTwin: DigitalTwinInstance;
  selectedTwinKey: string | null;
  setSelectedTwinKey: (key: string | null) => void;
  selectedDiagnosisNote: string;
  setSelectedDiagnosisNote: (note: string) => void;
  selectedReplacementCost: number;
  setSelectedReplacementCost: (cost: number) => void;
  technicalDiagnosisText: string;
  setTechnicalDiagnosisText: (text: string) => void;
  laborCost: number;
  setLaborCost: (cost: number) => void;
  advanceAmount: number;
  setAdvanceAmount: (advance: number) => void;
  activeTab: 'pieza' | 'diagnostico' | 'presupuesto';
  setActiveTab: (tab: 'pieza' | 'diagnostico' | 'presupuesto') => void;
  updateLocalComponent: (key: string, newStatus: TwinComponentStatus, note?: string, cost?: number) => void;
  handleSaveFullWorkflow: () => void;
  savingFullWorkflow: boolean;
  canEditTechnicalData: boolean;
  formatCurrency: (val: number) => string;
  autosaveStatus?: 'idle' | 'saving' | 'saved';
  onFlushAutosave?: () => void;
}

export const DiagnosisWorkflowPanel: React.FC<DiagnosisWorkflowPanelProps> = ({
  order,
  draftTwin,
  selectedTwinKey,
  setSelectedTwinKey,
  selectedDiagnosisNote,
  setSelectedDiagnosisNote,
  selectedReplacementCost,
  setSelectedReplacementCost,
  technicalDiagnosisText,
  setTechnicalDiagnosisText,
  laborCost,
  setLaborCost,
  advanceAmount,
  setAdvanceAmount,
  activeTab,
  setActiveTab,
  updateLocalComponent,
  handleSaveFullWorkflow,
  savingFullWorkflow,
  canEditTechnicalData,
  formatCurrency,
  autosaveStatus = 'idle',
  onFlushAutosave
}) => {
  const damagedComponents = draftTwin.components.filter(
    c => c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED'
  );
  const totalPartsCost = damagedComponents.reduce((sum, c) => sum + (c.replacementCost || 0), 0);
  const grandTotalCost = totalPartsCost + laborCost;
  const exceedsBudget = grandTotalCost > order.cost;

  return (
    <div className="glass-card" style={{ padding: '1rem 1.15rem', height: '100%', minHeight: '460px', minWidth: 0 }}>
      {/* Indicador de Autoguardado en Vivo */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.4rem', minHeight: '20px' }}>
        {autosaveStatus === 'saving' && (
          <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', animation: 'pulse 1s infinite' }} />
            Guardando diagnóstico en vivo...
          </span>
        )}
        {autosaveStatus === 'saved' && (
          <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
            ✓ Diagnóstico sincronizado con el cliente
          </span>
        )}
      </div>

      <Tabs
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as any)}
        tabs={[
          { key: 'pieza', label: 'Pieza', icon: <Wrench size={15} /> },
          { key: 'diagnostico', label: 'Diagnóstico', icon: <FileText size={15} /> },
          { 
            key: 'presupuesto', 
            label: 'Presupuesto', 
            icon: <AlertTriangle size={15} />,
            badge: damagedComponents.length > 0 ? (
              <span className="badge badge-diagnostico" style={{ padding: '1px 5px', fontSize: '0.7rem' }}>
                {damagedComponents.length}
              </span>
            ) : undefined
          }
        ]}
      >
        {/* TAB 1: PIEZA */}
        {activeTab === 'pieza' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedTwinKey && draftTwin ? (
              (() => {
                const comp = draftTwin.components.find(c => c.key === selectedTwinKey);
                if (!comp) return null;

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{comp.name}</h3>
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          backgroundColor: comp.status === 'REPLACEMENT_REQUIRED' ? 'rgba(239, 68, 68, 0.15)' : comp.status === 'DAMAGED' ? 'rgba(249, 115, 22, 0.15)' : comp.status === 'REPAIRED' ? 'rgba(6, 182, 212, 0.15)' : comp.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: comp.status === 'REPLACEMENT_REQUIRED' ? 'var(--color-danger)' : comp.status === 'DAMAGED' ? '#f97316' : comp.status === 'REPAIRED' ? '#06b6d4' : comp.status === 'VERIFIED' ? 'var(--color-success)' : 'var(--color-primary)'
                        }}
                      >
                        {comp.status === 'REPLACEMENT_REQUIRED' ? '🔴 Requiere Repuesto' : comp.status === 'DAMAGED' ? '🟠 Falla (Reparable)' : comp.status === 'REPAIRED' ? '🛠️ Reparado' : comp.status === 'VERIFIED' ? '🟢 Verificado' : '🔵 Operativo'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.45rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!canEditTechnicalData}
                        onClick={() => updateLocalComponent(comp.key, 'NORMAL', selectedDiagnosisNote, selectedReplacementCost)}
                        style={{ padding: '0.45rem 0.35rem', fontSize: '0.78rem', whiteSpace: 'nowrap', border: comp.status === 'NORMAL' ? '2px solid var(--color-primary)' : undefined }}
                      >
                        🔵 Operativo / OK
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!canEditTechnicalData}
                        onClick={() => updateLocalComponent(comp.key, 'DAMAGED', selectedDiagnosisNote, selectedReplacementCost)}
                        style={{ 
                          padding: '0.45rem 0.35rem', 
                          fontSize: '0.78rem', 
                          whiteSpace: 'nowrap', 
                          color: comp.status === 'DAMAGED' ? '#ea580c' : 'var(--text-primary)',
                          border: comp.status === 'DAMAGED' ? '2px solid #f97316' : '1px solid rgba(249, 115, 22, 0.4)',
                          backgroundColor: comp.status === 'DAMAGED' ? 'rgba(249, 115, 22, 0.15)' : undefined,
                          fontWeight: comp.status === 'DAMAGED' ? 800 : 500
                        }}
                      >
                        🟠 Falla (Reparable)
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!canEditTechnicalData}
                        onClick={() => updateLocalComponent(comp.key, 'REPLACEMENT_REQUIRED', selectedDiagnosisNote, selectedReplacementCost)}
                        style={{ 
                          padding: '0.45rem 0.35rem', 
                          fontSize: '0.78rem', 
                          whiteSpace: 'nowrap', 
                          backgroundColor: '#ef4444', 
                          borderColor: '#ef4444', 
                          border: comp.status === 'REPLACEMENT_REQUIRED' ? '2px solid #b91c1c' : undefined,
                          fontWeight: comp.status === 'REPLACEMENT_REQUIRED' ? 800 : 500
                        }}
                      >
                        🔴 Requiere Repuesto
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!canEditTechnicalData}
                        onClick={() => updateLocalComponent(comp.key, 'REPAIRED', selectedDiagnosisNote, selectedReplacementCost)}
                        style={{ padding: '0.45rem 0.35rem', fontSize: '0.78rem', whiteSpace: 'nowrap', border: comp.status === 'REPAIRED' ? '2px solid #06b6d4' : undefined }}
                      >
                        🛠️ Reparado
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!canEditTechnicalData}
                        onClick={() => updateLocalComponent(comp.key, 'VERIFIED', selectedDiagnosisNote, selectedReplacementCost)}
                        style={{ padding: '0.45rem 0.35rem', fontSize: '0.78rem', whiteSpace: 'nowrap', border: comp.status === 'VERIFIED' ? '2px solid #10b981' : undefined }}
                      >
                        🟢 Verificar
                      </button>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Nota Técnica / Observaciones
                      </label>
                      <textarea
                        className="form-textarea"
                        style={{ 
                          fontSize: '0.85rem', 
                          height: '90px', 
                          resize: 'none', 
                          backgroundColor: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-light)',
                          lineHeight: '1.4'
                        }}
                        placeholder="Describa los hallazgos o estado técnico de esta pieza..."
                        value={selectedDiagnosisNote}
                        onChange={(e) => {
                          const newNote = e.target.value;
                          setSelectedDiagnosisNote(newNote);
                          updateLocalComponent(comp.key, comp.status, newNote, selectedReplacementCost);
                        }}
                        onBlur={onFlushAutosave}
                        disabled={!canEditTechnicalData}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Costo del Repuesto ($ COP)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ fontSize: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}
                        placeholder="0"
                        value={selectedReplacementCost || ''}
                        onChange={(e) => {
                          const cost = Number(e.target.value);
                          setSelectedReplacementCost(cost);
                          updateLocalComponent(comp.key, comp.status, selectedDiagnosisNote, cost);
                        }}
                        onBlur={onFlushAutosave}
                        disabled={!canEditTechnicalData}
                      />
                    </div>
                  </>
                );
              })()
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
                Selecciona una pieza en el visor 3D o en los chips inferiores para comenzar.
              </p>
            )}
          </div>
        )}

        {/* TAB 2: DIAGNÓSTICO */}
        {activeTab === 'diagnostico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="sub-block">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                Falla reportada por el cliente
              </span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{order.reportedFailure}</strong>
            </div>

            <div className="sub-block">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                Presupuesto Máximo Inicial Acordado
              </span>
              <strong style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>{formatCurrency(order.cost)}</strong>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Informe Técnico General de Laboratorio
              </label>
              <textarea
                className="form-textarea"
                style={{ 
                  fontSize: '0.85rem', 
                  height: '180px', 
                  resize: 'none', 
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-light)',
                  lineHeight: '1.45'
                }}
                placeholder="Escriba el diagnóstico completo de laboratorio, pruebas realizadas, estado de circuitos..."
                value={technicalDiagnosisText}
                onChange={(e) => setTechnicalDiagnosisText(e.target.value)}
                onBlur={onFlushAutosave}
                disabled={!canEditTechnicalData}
              />
            </div>
          </div>
        )}

        {/* TAB 3: PRESUPUESTO */}
        {activeTab === 'presupuesto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Componente</th>
                    <th>Costo Repuesto</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {damagedComponents.map((c) => {
                    const isSelected = selectedTwinKey === c.key;
                    return (
                      <tr 
                        key={c.key} 
                        onClick={() => setSelectedTwinKey(c.key)}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : undefined,
                          borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent'
                        }}
                        title="Haz clic para enfocar y marcar esta pieza en el 3D"
                      >
                        <td style={{ fontWeight: isSelected ? 700 : 500 }}>
                          <div>
                            <span>{isSelected ? '🎯 ' : (c.status === 'REPLACEMENT_REQUIRED' ? '🔴 ' : '🟠 ')}{c.name.split('/')[0]}</span>
                            <span style={{ fontSize: '0.68rem', display: 'block', color: c.status === 'REPLACEMENT_REQUIRED' ? 'var(--color-danger)' : '#f97316' }}>
                              {c.status === 'REPLACEMENT_REQUIRED' ? 'Requiere repuesto' : 'Reparación en lab'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: c.status === 'REPLACEMENT_REQUIRED' ? '#ef4444' : '#f97316' }}>{formatCurrency(c.replacementCost || 0)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {canEditTechnicalData && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              title="Eliminar del presupuesto (Marcar OK)"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateLocalComponent(c.key, 'NORMAL', '', 0);
                              }}
                              style={{ padding: '0.3rem', fontSize: '0.72rem', color: 'var(--color-danger)', borderColor: 'var(--border-light)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {damagedComponents.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.75rem' }}>
                        Sin piezas dañadas registradas
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Total Repuestos:</td>
                    <td colSpan={2} style={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totalPartsCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Mano de Obra ($)</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                  value={laborCost || ''}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                  disabled={!canEditTechnicalData}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Abono Inicial ($)</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                  value={advanceAmount || ''}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="sub-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>TOTAL PRESUPUESTO:</span>
              <strong style={{ fontSize: '1.2rem', color: exceedsBudget ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {formatCurrency(grandTotalCost)}
              </strong>
            </div>

            {exceedsBudget && (
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid #f59e0b', borderRadius: 'var(--border-radius-sm)', fontSize: '0.75rem', color: '#f59e0b' }}>
                ⚠️ Excede el presupuesto inicial de {formatCurrency(order.cost)} en +{formatCurrency(grandTotalCost - order.cost)}. Se enviará automáticamente a <strong>"Espera Aprobación"</strong> al guardar.
              </div>
            )}

            {canEditTechnicalData && (
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={savingFullWorkflow}
                onClick={handleSaveFullWorkflow}
                style={{ 
                  padding: '0.75rem', 
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  backgroundColor: exceedsBudget ? '#f59e0b' : undefined, 
                  borderColor: exceedsBudget ? '#f59e0b' : undefined 
                }}
              >
                <Save size={18} /> {savingFullWorkflow ? 'Guardando Orden...' : exceedsBudget ? 'Guardar y Solicitar Aprobación al Cliente' : 'Guardar Diagnóstico y Confirmar Reparación'}
              </button>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
};
