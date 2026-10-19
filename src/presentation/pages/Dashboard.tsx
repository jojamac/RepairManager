import React, { useState, useEffect } from 'react';
import { useServiceOrders } from '../../application/hooks/useServiceOrders';
import { useFinance } from '../../application/hooks/useFinance';
import { useClients } from '../../application/hooks/useClients';
import { useRepositories } from '../../data/RepositoryContext';
import { ActivityLog } from '../../domain/entities/Activity';
import { CustomChart } from '../components/CustomChart';
import { 
  Smartphone, 
  Wrench, 
  DollarSign, 
  Activity, 
  Clock, 
  ArrowUpRight, 
  UserCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/hooks/useAuth';
import { hasPermission } from '../../domain/entities/User';
import { DateRangePicker, DateRange, isDateInRange } from '../components/DateRangePicker';
import { TechnicianKanban } from '../components/TechnicianKanban';
import { ReceptionDashboard } from '../components/ReceptionDashboard';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { orders, loading: ordersLoading, updateOrderStatus } = useServiceOrders();
  const { records, loading: financeLoading } = useFinance();
  const { clients, loading: clientsLoading } = useClients();
  const { logsRepo } = useRepositories();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Permisos granulares para el Dashboard
  const canViewReception = hasPermission(currentUser, 'view_reception_dashboard');
  const canViewMetrics = hasPermission(currentUser, 'view_dashboard_metrics');
  const canViewKanban = hasPermission(currentUser, 'view_technician_kanban');

  // Modo de vista del Dashboard: 'admin', 'technician' o 'reception'
  const [viewMode, setViewMode] = useState<'admin' | 'technician' | 'reception'>(() => {
    if (canViewReception && !canViewMetrics && !canViewKanban) return 'reception';
    if (!canViewMetrics && canViewKanban) return 'technician';
    if (canViewMetrics && !canViewKanban) return 'admin';
    if (currentUser?.role === 'recepcion') return 'reception';
    return currentUser?.role === 'tecnico' ? 'technician' : 'admin';
  });

  // Estado del filtro de fechas
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: ''
  });

  // Cargar registros de actividad (logs de auditoría)
  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const activityLogs = await logsRepo.listLogs();
        setLogs(activityLogs.slice(0, 5)); // Mostrar solo los 5 más recientes
      } catch (err) {
        console.error('Error al cargar logs:', err);
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
  }, [logsRepo, orders]); // Recargar logs si cambian las órdenes

  // Órdenes y registros filtrados por rango de fecha
  const filteredOrders = orders.filter(o => isDateInRange(o.entryDate, dateRange));
  const filteredRecords = records.filter(r => isDateInRange(r.date, dateRange));

  // Cálculos estadísticos filtrados
  const totalOrders = filteredOrders.length;
  const pendingOrders = filteredOrders.filter(
    o => o.status !== 'entregado' && o.status !== 'listo'
  ).length;

  const filteredIncome = filteredRecords
    .filter(r => r.type === 'ingreso')
    .reduce((sum, r) => sum + r.amount, 0);

  const filteredExpense = filteredRecords
    .filter(r => r.type === 'egreso')
    .reduce((sum, r) => sum + r.amount, 0);

  const filteredProfit = filteredIncome - filteredExpense;

  // Formatear monedas en Pesos
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Preparar datos para gráficos
  // 1. Historial de ingresos de los últimos meses/semanas
  const getIncomeChartData = () => {
    const incomeTx = [...filteredRecords]
      .filter(r => r.type === 'ingreso')
      .slice(0, 6)
      .reverse();

    if (incomeTx.length === 0) {
      return [
        { label: 'Ene', value: 0 },
        { label: 'Feb', value: 0 },
        { label: 'Mar', value: 0 },
      ];
    }

    return incomeTx.map(t => ({
      label: new Date(t.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
      value: t.amount
    }));
  };

  // 2. Gráfico Donut de distribución por Estado
  const getStatusChartData = () => {
    const states = ['ingresado', 'diagnostico', 'espera_aprobacion', 'reparacion', 'listo', 'entregado'];
    const labels: Record<string, string> = {
      ingresado: 'Ingresados',
      diagnostico: 'Diagnóstico',
      espera_aprobacion: 'En Espera',
      reparacion: 'Reparación',
      listo: 'Listos',
      entregado: 'Entregados'
    };

    return states.map(status => {
      const count = filteredOrders.filter(o => o.status === status).length;
      return {
        label: labels[status],
        value: count
      };
    }).filter(d => d.value > 0);
  };

  const isGlobalLoading = ordersLoading || financeLoading || clientsLoading || logsLoading;

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            {viewMode === 'reception' 
              ? 'Panel de Recepción y Mostrador' 
              : viewMode === 'admin' 
              ? 'Dashboard Administrativo' 
              : 'Taller Técnico'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            {viewMode === 'reception'
              ? 'Atención al cliente en mostrador, entregas pendientes y seguimiento de presupuestos.'
              : viewMode === 'admin' 
              ? 'Resumen en tiempo real del taller de servicio técnico y flujo financiero.'
              : 'Flujo de trabajo de reparación y control visual de estados en taller.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Selector de Modo de Vista para usuarios con múltiples vistas permitidas */}
          {((canViewReception ? 1 : 0) + (canViewMetrics ? 1 : 0) + (canViewKanban ? 1 : 0) > 1) && (
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              {canViewReception && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setViewMode('reception')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'reception' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'reception' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'reception' ? 700 : 500
                  }}
                >
                  🛎️ Mostrador
                </button>
              )}

              {canViewMetrics && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setViewMode('admin')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'admin' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'admin' ? 700 : 500
                  }}
                >
                  📊 Métricas
                </button>
              )}

              {canViewKanban && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setViewMode('technician')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'technician' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'technician' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'technician' ? 700 : 500
                  }}
                >
                  🛠️ Taller (Kanban)
                </button>
              )}
            </div>
          )}

          {viewMode === 'admin' && <DateRangePicker value={dateRange} onChange={setDateRange} />}

          {isGlobalLoading && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="loading-spinner" style={{ width: '16px', height: '16px', margin: 0, borderWidth: '2px' }} />
              Actualizando...
            </span>
          )}
        </div>
      </div>

      {viewMode === 'reception' ? (
        <ReceptionDashboard 
          orders={orders} 
          onSelectOrder={(id) => navigate(`/orders/${id}`)}
          formatCurrency={formatCurrency}
        />
      ) : viewMode === 'technician' ? (
        <TechnicianKanban 
          orders={orders} 
          onUpdateStatus={updateOrderStatus} 
          onSelectOrder={(id) => navigate(`/orders/${id}`)} 
        />
      ) : (
        <>
      {/* Grid de KPIs principales */}
      <div className="dashboard-grid">
        {/* KPI 1 */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span className="kpi-title">Equipos Recibidos</span>
            <span style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-accent-glow)', padding: '0.4rem', borderRadius: '50%' }}>
              <Smartphone size={18} />
            </span>
          </div>
          <div className="kpi-value">{totalOrders}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {dateRange.preset === 'all' ? 'Total histórico registrado' : 'En el período seleccionado'}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span className="kpi-title">Reparaciones Pendientes</span>
            <span style={{ color: 'var(--color-warning)', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
              <Clock size={18} />
            </span>
          </div>
          <div className="kpi-value">{pendingOrders}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Equipos en taller por procesar
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span className="kpi-title">Balance Neto (Caja)</span>
            <span style={{ color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem', borderRadius: '50%' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', paddingTop: '0.3rem', paddingBottom: '0.2rem' }}>
            {formatCurrency(filteredProfit)}
          </div>
          <div className="kpi-trend up" style={{ marginTop: '0.5rem' }}>
            <ArrowUpRight size={14} /> Total ingresos vs egresos
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span className="kpi-title">Clientes Registrados</span>
            <span style={{ color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-glow)', padding: '0.4rem', borderRadius: '50%' }}>
              <UserCheck size={18} />
            </span>
          </div>
          <div className="kpi-value">{clients.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Fichas únicas de clientes
          </div>
        </div>
      </div>

      {/* Gráficos Estadísticos */}
      <div className="content-grid" style={{ marginBottom: '2.5rem' }}>
        {/* Gráfico Izquierdo: Ingresos Recientes */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Historial de Transacciones Recientes (Ingresos)
          </h3>
          <CustomChart 
            data={getIncomeChartData()} 
            type="bar" 
            height={220} 
            color="var(--color-primary)" 
          />
        </div>

        {/* Gráfico Derecho: Distribución */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Distribución por Estado
          </h3>
          <CustomChart 
            data={getStatusChartData()} 
            type="donut" 
            height={220} 
          />
        </div>
      </div>

      {/* Sección Inferior: Órdenes Recientes y Log de Actividad (Auditoría de Seguridad) */}
      <div className="content-grid">
        {/* Órdenes Recientes */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={18} className="text-secondary" />
            Órdenes Recientes en Taller
          </h3>
          
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Costo</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 'bold' }}>{order.id}</td>
                    <td>{order.clientName}</td>
                    <td>{order.brand} {order.model}</td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatCurrency(order.cost)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No hay órdenes registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Registro de Auditoría de Seguridad (Logs de Actividad) */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} className="text-secondary" />
            Logs de Actividad (Seguridad)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.map((log) => (
              <div 
                key={log.id} 
                style={{ 
                  padding: '0.85rem', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.8rem',
                  borderLeft: log.action.includes('ELIMINACION') || log.action.includes('DESACTIVACION')
                    ? '3px solid var(--color-danger)'
                    : log.action.includes('CREACION') 
                    ? '3px solid var(--color-success)' 
                    : '3px solid var(--color-accent)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.userName}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {new Date(log.date).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', lineHeight: '1.3' }}>
                  {log.details}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{log.action}</span>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rol: {log.userRole}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center" style={{ color: 'var(--text-muted)', padding: '1.5rem' }}>
                No hay actividad registrada aún.
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
