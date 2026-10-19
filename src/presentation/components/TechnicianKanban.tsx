import React, { useState } from 'react';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { Smartphone, CheckCircle, Clock, AlertCircle, Eye, Wrench, ArrowRight } from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../../application/hooks/useAuth';
import { hasPermission } from '../../domain/entities/User';

interface TechnicianKanbanProps {
  orders: ServiceOrder[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<ServiceOrder | void>;
  onSelectOrder: (orderId: string) => void;
}

const KANBAN_COLUMNS: { key: OrderStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'ingresado', label: 'Ingresados', color: 'var(--color-primary)', icon: <Clock size={16} /> },
  { key: 'diagnostico', label: 'Diagnóstico', color: '#8b5cf6', icon: <Wrench size={16} /> },
  { key: 'espera_aprobacion', label: 'En Espera', color: 'var(--color-warning)', icon: <AlertCircle size={16} /> },
  { key: 'reparacion', label: 'En Reparación', color: '#ec4899', icon: <Wrench size={16} /> },
  { key: 'listo', label: 'Listos para Entrega', color: 'var(--color-success)', icon: <CheckCircle size={16} /> },
];

export const TechnicianKanban: React.FC<TechnicianKanbanProps> = ({ orders, onUpdateStatus, onSelectOrder }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const canUpdateStatus = hasPermission(currentUser, 'update_order_status');

  const handleQuickAdvanceStatus = async (order: ServiceOrder, targetStatus: OrderStatus) => {
    setUpdatingId(order.id);
    try {
      await onUpdateStatus(order.id, targetStatus, `Cambio rápido a ${targetStatus} desde vista Kanban de técnico.`);
      toast.success(`Orden ${order.id} movida a ${targetStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el estado de la orden');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'entregado');

  return (
    <div>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench className="text-secondary" size={22} /> Tablero de Trabajo Técnico (Kanban)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Gestión visual y rápida de equipos activos en el taller.
          </p>
        </div>
        <span className="badge badge-reparacion" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
          {activeOrders.length} Equipos Activos
        </span>
      </div>

      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1rem',
          alignItems: 'start'
        }}
      >
        {KANBAN_COLUMNS.map(col => {
          const colOrders = activeOrders.filter(o => o.status === col.key);
          return (
            <div 
              key={col.key} 
              className="glass-card" 
              style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--bg-secondary)', 
                borderTop: `4px solid ${col.color}`,
                minHeight: '350px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {col.icon} {col.label}
                </span>
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    backgroundColor: 'var(--bg-tertiary)', 
                    padding: '2px 8px', 
                    borderRadius: '12px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {colOrders.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {colOrders.map(order => (
                  <div 
                    key={order.id} 
                    style={{ 
                      padding: '0.85rem', 
                      backgroundColor: 'var(--bg-primary)', 
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-medium)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>{order.id}</strong>
                      <button 
                        onClick={() => onSelectOrder(order.id)}
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                        title="Ver detalles"
                      >
                        <Eye size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
                      <Smartphone size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      {order.brand} {order.model}
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', lineHeight: '1.3' }}>
                      {order.reportedFailure.length > 50 ? `${order.reportedFailure.substring(0, 50)}...` : order.reportedFailure}
                    </p>

                    {/* Botones de acción rápida en Kanban */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed var(--border-light)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {order.clientName.split(' ')[0]}
                      </span>

                      {canUpdateStatus && col.key === 'ingresado' && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#8b5cf6', borderColor: '#8b5cf6' }}
                          disabled={updatingId === order.id}
                          onClick={() => handleQuickAdvanceStatus(order, 'diagnostico')}
                        >
                          Diagnosticar <ArrowRight size={10} />
                        </button>
                      )}

                      {canUpdateStatus && col.key === 'diagnostico' && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#ec4899', borderColor: '#ec4899' }}
                          disabled={updatingId === order.id}
                          onClick={() => handleQuickAdvanceStatus(order, 'reparacion')}
                        >
                          Reparar <ArrowRight size={10} />
                        </button>
                      )}

                      {canUpdateStatus && col.key === 'reparacion' && (
                        <button 
                          className="btn btn-primary"
                          style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                          disabled={updatingId === order.id}
                          onClick={() => handleQuickAdvanceStatus(order, 'listo')}
                        >
                          Finalizar <CheckCircle size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {colOrders.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '2rem 0' }}>
                    Sin equipos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
