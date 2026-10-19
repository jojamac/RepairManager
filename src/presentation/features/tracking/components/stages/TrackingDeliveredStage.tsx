import React from 'react';
import { ServiceOrder } from '../../../../../domain/entities/ServiceOrder';
import { CheckCircle2, BadgeCheck, MessageCircle } from 'lucide-react';

interface TrackingDeliveredStageProps {
  order: ServiceOrder;
  whatsappUrl: string;
}

export const TrackingDeliveredStage: React.FC<TrackingDeliveredStageProps> = ({
  order,
  whatsappUrl,
}) => {
  // Cálculo de fecha de fin de garantía si no viene explícita
  const calculateWarrantyEnd = () => {
    if (order.warrantyEndDate) {
      return new Date(order.warrantyEndDate).toLocaleDateString();
    }
    const delivery = order.deliveryDate ? new Date(order.deliveryDate) : new Date(order.entryDate);
    const months = order.warrantyMonths || 1;
    delivery.setMonth(delivery.getMonth() + months);
    return delivery.toLocaleDateString();
  };

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
            <CheckCircle2 size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase' }}>
              Etapa 6 · Servicio Finalizado
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.1rem 0 0 0' }}>
              Dispositivo Entregado al Cliente
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>
              ¡Gracias por confiar en nuestro servicio técnico! Su orden ha sido cerrada y cuenta con respaldo y garantía activa.
            </p>
          </div>
        </div>
      </div>

      {/* Certificado de Garantía */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.75rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.03) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeCheck size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Certificado de Garantía Técnica Activa
            </h4>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Orden #{order.id} · Dispositivo {order.brand} {order.model}
            </span>
          </div>
        </div>

        <div style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', display: 'grid', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Meses de Cobertura
            </span>
            <strong style={{ color: 'var(--color-success)', fontSize: '1.35rem', display: 'block', marginTop: '0.2rem' }}>
              {order.warrantyMonths || 1} {order.warrantyMonths === 1 ? 'Mes' : 'Meses'}
            </strong>
          </div>

          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Válida Hasta
            </span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '1.15rem', display: 'block', marginTop: '0.2rem' }}>
              📅 {calculateWarrantyEnd()}
            </strong>
          </div>
        </div>

        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
          <strong>Condiciones de garantía:</strong> La garantía ampara los repuestos reemplazados y la mano de obra realizada. No aplica para daños por humedad, golpes posteriores, sobrevoltajes o sellos de garantía violentados.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.88rem', gap: '0.5rem' }}
          >
            <MessageCircle size={18} style={{ color: '#25D366' }} /> Soporte Post-Venta por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
