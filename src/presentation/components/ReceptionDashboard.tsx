import React from 'react';
import { ServiceOrder } from '../../domain/entities/ServiceOrder';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Users, 
  MessageCircle, 
  DollarSign, 
  Eye, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../../domain/entities/User';
import { useAuth } from '../../application/hooks/useAuth';

interface ReceptionDashboardProps {
  orders: ServiceOrder[];
  onSelectOrder: (orderId: string) => void;
  formatCurrency: (val: number) => string;
}

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  orders,
  onSelectOrder,
  formatCurrency,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canCreateOrder = hasPermission(currentUser, 'create_order');
  const canViewClients = hasPermission(currentUser, 'view_clients');

  // Clasificación de órdenes operativas para Recepción / Mostrador
  // 1. Listos para entrega al cliente (esperando retiro en mostrador)
  const readyOrders = orders.filter(o => o.status === 'listo');
  
  // 2. Esperando aprobación de presupuesto por parte del cliente
  const waitingApprovalOrders = orders.filter(o => o.status === 'espera_aprobacion');
  
  // 3. Recién ingresados (aún en cola para diagnóstico)
  const enteredOrders = orders.filter(o => o.status === 'ingresado');

  // 4. Entregados recientemente (últimos 5)
  const recentDelivered = orders.filter(o => o.status === 'entregado').slice(0, 5);

  // Total por cobrar en mostrador de equipos listos
  const totalToCollectOnDelivery = readyOrders.reduce((sum, o) => {
    const pending = Math.max(0, (o.cost || 0) - (o.paymentAdvance || 0));
    return sum + pending;
  }, 0);

  const handleWhatsAppContact = (order: ServiceOrder) => {
    const phoneClean = order.clientPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `¡Hola ${order.clientName}! Te saludamos de Servicio Técnico. Te informamos sobre tu equipo ${order.brand} ${order.model} (Orden: ${order.id}).`
    );
    window.open(`https://wa.me/${phoneClean}?text=${message}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Barra de Acciones Rápidas y Bienvenida */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛎️ Mostrador y Recepción de Clientes
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
            Gestión directa de ingresos, llamadas a clientes y entregas de equipos reparados.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canViewClients && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/clients')}
              style={{ gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Users size={16} /> Directorio de Clientes
            </button>
          )}

          {canCreateOrder && (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => navigate('/orders')}
              style={{ gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800 }}
            >
              <Plus size={16} /> + Nueva Orden de Servicio
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas Resumen Operativo de Mostrador */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '1rem' 
        }}
      >
        {/* Card 1: Listos para entrega */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.25rem', 
            borderLeft: '4px solid var(--color-success)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Equipos Listos para Retiro
            </span>
            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)', padding: '4px 8px', borderRadius: '50%', display: 'flex' }}>
              <CheckCircle size={18} />
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-success)' }}>
            {readyOrders.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <DollarSign size={14} style={{ color: '#f59e0b' }} />
            Saldo por cobrar en caja: <strong>{formatCurrency(totalToCollectOnDelivery)}</strong>
          </div>
        </div>

        {/* Card 2: Espera de Aprobación */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.25rem', 
            borderLeft: '4px solid var(--color-warning)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Pendientes de Aprobación
            </span>
            <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-warning)', padding: '4px 8px', borderRadius: '50%', display: 'flex' }}>
              <AlertCircle size={18} />
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-warning)' }}>
            {waitingApprovalOrders.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Clientes con presupuesto cotizado por confirmar
          </div>
        </div>

        {/* Card 3: En Cola de Ingreso */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.25rem', 
            borderLeft: '4px solid var(--color-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Equipos Ingresados
            </span>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: 'var(--color-primary)', padding: '4px 8px', borderRadius: '50%', display: 'flex' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)' }}>
            {enteredOrders.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Equipos en cola pendientes de diagnóstico por taller
          </div>
        </div>
      </div>

      {/* Grilla Principal de Trabajo para Recepción */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', 
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* COLUMNA 1: Equipos Listos para Entrega (Prioridad #1) */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Equipos Listos para Entrega
              </h3>
            </div>
            <span className="badge badge-listo" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
              {readyOrders.length} por retirar
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {readyOrders.map(order => {
              const pendingBalance = Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0));
              return (
                <div 
                  key={order.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>{order.id}</strong>
                      <span style={{ margin: '0 0.35rem', color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{order.brand} {order.model}</span>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 800, 
                        color: pendingBalance > 0 ? '#ef4444' : 'var(--color-success)',
                        backgroundColor: pendingBalance > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {pendingBalance > 0 ? `Cobrar: ${formatCurrency(pendingBalance)}` : 'Totalmente Pago'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    👤 Cliente: <strong>{order.clientName}</strong> ({order.clientPhone})
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-light)' }}>
                    <button 
                      type="button" 
                      onClick={() => handleWhatsAppContact(order)}
                      className="btn btn-secondary" 
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.35rem', color: '#22c55e', borderColor: '#22c55e' }}
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>

                    <button 
                      type="button" 
                      onClick={() => onSelectOrder(order.id)}
                      className="btn btn-primary" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: '0.35rem', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                    >
                      Procesar Entrega <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {readyOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                🎉 No hay equipos pendientes por retirar en este momento.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 2: Esperando Aprobación de Presupuesto */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} style={{ color: 'var(--color-warning)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Presupuestos por Aprobar
              </h3>
            </div>
            <span className="badge badge-espera_aprobacion" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
              {waitingApprovalOrders.length} cotizados
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {waitingApprovalOrders.map(order => (
              <div 
                key={order.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>{order.id}</strong>
                    <span style={{ margin: '0 0.35rem', color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{order.brand} {order.model}</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-warning)' }}>
                    {formatCurrency(order.cost)}
                  </strong>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  👤 Cliente: <strong>{order.clientName}</strong> ({order.clientPhone})
                </div>

                {order.technicalDiagnosis && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', lineHeight: '1.3' }}>
                    Diag: {order.technicalDiagnosis.length > 70 ? `${order.technicalDiagnosis.substring(0, 70)}...` : order.technicalDiagnosis}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-light)' }}>
                  <button 
                    type="button" 
                    onClick={() => handleWhatsAppContact(order)}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.35rem', color: '#22c55e', borderColor: '#22c55e' }}
                  >
                    <MessageCircle size={14} /> Enviar Cotización
                  </button>

                  <button 
                    type="button" 
                    onClick={() => onSelectOrder(order.id)}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.35rem' }}
                  >
                    <Eye size={14} /> Ver Orden
                  </button>
                </div>
              </div>
            ))}

            {waitingApprovalOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                👍 No hay cotizaciones pendientes de respuesta del cliente.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial rápido de entregas recientes */}
      {recentDelivered.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.85rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} />
            Entregas Recientes (Garantía Activa)
          </h3>
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Dispositivo</th>
                  <th>Monto Cobrado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recentDelivered.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700 }}>{order.id}</td>
                    <td>{order.clientName}</td>
                    <td>{order.brand} {order.model}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(order.cost)}</td>
                    <td>
                      <button 
                        type="button" 
                        onClick={() => onSelectOrder(order.id)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
