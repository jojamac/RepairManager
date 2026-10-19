import React, { useState } from 'react';
import { ServiceOrder } from '../../../../domain/entities/ServiceOrder';
import { DigitalTwinInstance } from '../../../../domain/entities/DigitalTwin';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ApprovalWorkflowPanelProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance;
  onApproveRepair: () => Promise<void>;
  formatCurrency: (val: number) => string;
}

export const ApprovalWorkflowPanel: React.FC<ApprovalWorkflowPanelProps> = ({
  order,
  twin,
  onApproveRepair,
  formatCurrency
}) => {
  const [approving, setApproving] = useState(false);

  const damagedComponents = twin.components.filter(
    c => c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED'
  );

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApproveRepair();
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem', height: '100%', minHeight: '460px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner Destacado de Espera de Aprobación */}
      <div 
        style={{ 
          padding: '1.25rem', 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid #f59e0b', 
          borderRadius: 'var(--border-radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
          <AlertTriangle size={22} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            Orden en Espera de Aprobación del Cliente
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
          El presupuesto total calculado para esta reparación excede el valor acordado en el ingreso inicial.
          La intervención técnica está pausada temporalmente hasta obtener la confirmación del cliente.
        </p>
      </div>

      {/* Resumen del Excedente */}
      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Presupuesto Inicial Acordado:</span>
          <strong>{formatCurrency(order.cost)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Informe Técnico / Mano de Obra:</span>
          <strong>{formatCurrency(order.laborCost || 0)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Total Repuestos ({damagedComponents.length}):</span>
          <strong style={{ color: '#ef4444' }}>
            {formatCurrency(damagedComponents.reduce((sum, c) => sum + (c.replacementCost || 0), 0))}
          </strong>
        </div>
        <hr style={{ borderColor: 'var(--border-light)', margin: '0.3rem 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
          <span>VALOR TOTAL AJUSTADO:</span>
          <span style={{ color: '#f59e0b' }}>
            {formatCurrency((order.laborCost || 0) + damagedComponents.reduce((sum, c) => sum + (c.replacementCost || 0), 0))}
          </span>
        </div>
      </div>

      {/* Informe Técnico de Lectura */}
      {order.technicalDiagnosis && (
        <div className="sub-block">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
            Informe Técnico Registrado
          </span>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0, lineHeight: '1.4' }}>
            "{order.technicalDiagnosis}"
          </p>
        </div>
      )}

      {/* Botón de Aprobación Manual en Tienda / Teléfono */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={approving}
          onClick={handleApprove}
          style={{ padding: '0.8rem', fontSize: '0.95rem', fontWeight: 800, backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', gap: '0.5rem' }}
        >
          <CheckCircle size={20} /> {approving ? 'Registrando Aprobación...' : 'Registrar Aprobación del Cliente (Pasa a Reparación)'}
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
          También puede esperar que el cliente apruebe mediante el enlace público de seguimiento QR.
        </span>
      </div>
    </div>
  );
};
