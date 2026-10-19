import React from 'react';
import { ServiceOrder } from '../../../../domain/entities/ServiceOrder';
import { DigitalTwinInstance } from '../../../../domain/entities/DigitalTwin';
import { CheckCircle, ShieldCheck, Printer, Smartphone, DollarSign } from 'lucide-react';
import { PDFExportService } from '../../../../application/services/PDFExportService';
import { ShopConfigService } from '../../../../data/firebase/ShopConfigService';
import { useToast } from '../../../components/Toast';

interface CompletedWorkflowPanelProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance;
  onDeliverOrder?: () => Promise<void>;
  onLiquidateRemainingBalance?: () => Promise<void>;
  canUpdateStatus: boolean;
  canDeliverOrder?: boolean;
  canLiquidateBalance?: boolean;
  formatCurrency: (val: number) => string;
}

export const CompletedWorkflowPanel: React.FC<CompletedWorkflowPanelProps> = ({
  order,
  twin,
  onDeliverOrder,
  onLiquidateRemainingBalance,
  canUpdateStatus,
  canDeliverOrder = false,
  canLiquidateBalance = false,
  formatCurrency
}) => {
  const toast = useToast();
  const isDelivered = order.status === 'entregado';
  const pendingBalance = Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0));
  const isFullyPaid = isDelivered && (pendingBalance === 0 || order.balanceDue === 0);
  const allowDelivery = canUpdateStatus && canDeliverOrder;

  return (
    <div className="glass-card" style={{ padding: '1.25rem', height: '100%', minHeight: '460px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner de Estado Final */}
      <div 
        style={{ 
          padding: '1.25rem', 
          backgroundColor: isDelivered ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)', 
          border: `1px solid ${isDelivered ? 'var(--color-success)' : 'var(--color-primary)'}`, 
          borderRadius: 'var(--border-radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}
      >
        {isDelivered ? (
          <CheckCircle size={28} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        ) : (
          <Smartphone size={28} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        )}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            {isDelivered ? 'Orden Entregada al Cliente' : 'Equipo Listo para Entrega'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            {isDelivered 
              ? 'El dispositivo fue entregado satisfactoriamente y la garantía ha sido activada.'
              : 'Las reparaciones y pruebas de calidad concluyeron. Pendiente de entrega al cliente.'}
          </p>
        </div>
      </div>

      {/* Resumen de Certificación QC */}
      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
          Certificado de Calidad y Pruebas
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {twin.qualityChecks.map(q => (
            <span
              key={q.componentKey}
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                backgroundColor: q.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: q.passed ? 'var(--color-success)' : 'var(--color-danger)',
                border: `1px solid ${q.passed ? 'var(--color-success)' : 'var(--color-danger)'}`
              }}
            >
              {q.passed ? '✓' : '✗'} {q.componentName.split('/')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Resumen Financiero de Cierre */}
      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Costo Total Servicio:</span>
          <strong>{formatCurrency(order.cost)}</strong>
        </div>

        {isFullyPaid ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Pagado / Liquidado:</span>
              <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(order.cost)}</strong>
            </div>
            <hr style={{ borderColor: 'var(--border-light)', margin: '0.2rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 800 }}>
              <span>ESTADO DE CUENTA:</span>
              <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={16} /> TOTALMENTE LIQUIDADO ($0)
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Abono Registrado:</span>
              <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(order.paymentAdvance)}</strong>
            </div>
            <hr style={{ borderColor: 'var(--border-light)', margin: '0.2rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
              <span>{isDelivered ? 'SALDO PENDIENTE POR LIQUIDAR:' : 'SALDO POR COBRAR:'}</span>
              <span style={{ color: pendingBalance > 0 ? '#ef4444' : 'var(--color-success)' }}>
                {formatCurrency(pendingBalance)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Botones de Acción de Cierre */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {/* Botón de liquidación rápida si la orden ya está entregada pero tiene saldo pendiente */}
        {isDelivered && !isFullyPaid && pendingBalance > 0 && onLiquidateRemainingBalance && canLiquidateBalance && (
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={onLiquidateRemainingBalance}
            style={{ 
              padding: '0.75rem', 
              fontSize: '0.88rem', 
              fontWeight: 800, 
              backgroundColor: '#f59e0b', 
              borderColor: '#f59e0b', 
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem' 
            }}
          >
            <DollarSign size={18} /> Registrar Liquidación ({formatCurrency(pendingBalance)}) en Finanzas
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={async () => {
            const shopInfo = await ShopConfigService.getShopInfo();
            PDFExportService.exportOrderTicket(order, shopInfo);
            toast.success('Imprimiendo tiquete de entrega...');
          }}
          style={{ padding: '0.65rem', fontSize: '0.85rem', gap: '0.5rem' }}
        >
          <Printer size={16} /> Imprimir Tiquete / Factura PDF
        </button>

        {!isDelivered && allowDelivery && onDeliverOrder && (
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={onDeliverOrder}
            style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 800, backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', gap: '0.5rem' }}
          >
            <CheckCircle size={18} /> Confirmar Entrega al Cliente y Liquidar Caja
          </button>
        )}

        {!isDelivered && !allowDelivery && (
          <div 
            style={{ 
              padding: '0.65rem 0.85rem', 
              backgroundColor: 'rgba(56, 189, 248, 0.08)', 
              borderRadius: 'var(--border-radius-sm)', 
              border: '1px dashed var(--color-primary)', 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}
          >
            🔔 <strong>Listo para entrega en mostrador</strong>: La entrega y cobro final deben ser gestionados por Recepción o Administración.
          </div>
        )}
      </div>
    </div>
  );
};
