import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useRepositories } from '../../data/RepositoryContext';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { 
  Search, 
  ArrowLeft, 
  Loader2, 
  ClipboardList, 
  ShieldAlert,
  Calendar
} from 'lucide-react';

import { useDigitalTwin } from '../../application/hooks/useDigitalTwin';
import { ShopConfigService, ShopInfo } from '../../data/firebase/ShopConfigService';
import { db } from '../../data/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useModalDialog } from '../components/ConfirmDialog';

// Componentes modulares del nuevo Tracking Creciente
import { TrackingStepper } from '../features/tracking/components/TrackingStepper';
import { TrackingReceptionStage } from '../features/tracking/components/stages/TrackingReceptionStage';
import { TrackingDiagnosisStage } from '../features/tracking/components/stages/TrackingDiagnosisStage';
import { TrackingBudgetApprovalStage } from '../features/tracking/components/stages/TrackingBudgetApprovalStage';
import { TrackingRepairStage } from '../features/tracking/components/stages/TrackingRepairStage';
import { TrackingReadyStage } from '../features/tracking/components/stages/TrackingReadyStage';
import { TrackingDeliveredStage } from '../features/tracking/components/stages/TrackingDeliveredStage';

interface PublicTrackingProps {
  onNavigateToLogin: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  ingresado: 'Recibido en Taller',
  diagnostico: 'En Diagnóstico Técnico',
  espera_aprobacion: 'Esperando Aprobación de Presupuesto',
  reparacion: 'En Proceso de Reparación',
  listo: 'Listo para Entrega',
  entregado: 'Entregado al Cliente',
};

export const PublicTracking: React.FC<PublicTrackingProps> = ({ onNavigateToLogin }) => {
  const location = useLocation();
  const { ordersRepo } = useRepositories();
  const { twin, loadTwinForOrder, authorizeRepair } = useDigitalTwin();
  const { showAlert } = useModalDialog();
  
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Información del taller configurada en Ajustes
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [shopPhone, setShopPhone] = useState<string>('3000000000');

  // Etapa del Stepper actualmente enfocada por el usuario (por defecto: estado actual de la orden)
  const [selectedStage, setSelectedStage] = useState<OrderStatus>('ingresado');
  const [authorizing, setAuthorizing] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Cargar información del taller
  useEffect(() => {
    ShopConfigService.getShopInfo()
      .then((info) => {
        if (info) {
          setShopInfo(info);
          if (info.phone) setShopPhone(info.phone);
        }
      })
      .catch(() => {});
  }, []);

  // Función para enlace de WhatsApp directo
  const getWhatsAppUrl = (orderCode: string) => {
    const digits = shopPhone.replace(/\D/g, '');
    const formattedPhone = (digits.length === 10 && digits.startsWith('3')) ? `57${digits}` : (digits || '573000000000');
    const message = `Hola, tengo una consulta sobre el estado de mi orden ${orderCode}`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  // Búsqueda automática desde URL ?order=OR-XXXX
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderParam = params.get('order');
    if (orderParam) {
      setOrderId(orderParam);
      executeSearch(orderParam);
    }
  }, [location.search]);

  // Listener en Tiempo Real (Firestore onSnapshot) - Sincroniza diagnóstico y cambios sin costo extra
  useEffect(() => {
    if (!order?.id) return;
    const cleanId = order.id.trim().toUpperCase();

    // 1. Escuchar Firestore si está inicializado
    let unsubscribeOrder: (() => void) | undefined;
    let unsubscribeTwin: (() => void) | undefined;

    if (db) {
      try {
        const orderRef = doc(db, 'orders', cleanId);
        unsubscribeOrder = onSnapshot(orderRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as ServiceOrder;
            setOrder((prev) => {
              if (!prev) return data;
              // Si el estado avanzó de nivel, auto-enfocar la nueva etapa
              if (data.status !== prev.status) {
                setSelectedStage(data.status);
              }
              return { ...prev, ...data };
            });
          }
        }, (err) => console.warn('onSnapshot order listener notice:', err));

        const twinRef = doc(db, 'digital_twins', cleanId);
        unsubscribeTwin = onSnapshot(twinRef, (twinSnap) => {
          if (twinSnap.exists()) {
            loadTwinForOrder(cleanId, `${order.brand} ${order.model}`, order.reportedFailure);
          } else {
            // Si el documento fue eliminado en Firestore, recargar para limpiar la vista
            loadTwinForOrder(cleanId, `${order.brand} ${order.model}`, order.reportedFailure);
          }
        }, (err) => console.warn('onSnapshot twin listener notice:', err));
      } catch (e) {
        console.warn('Firestore onSnapshot init skip:', e);
      }
    }

    // 2. Escuchador de respaldo local / pestañas cruzadas
    const handleLocalSync = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      if (
        (customEvt.detail?.orderId && customEvt.detail.orderId === cleanId) ||
        (evt.type === 'storage' && ((evt as StorageEvent).key === 'entucel_twin_saved' || (evt as StorageEvent).key === 'entucel_order_updated'))
      ) {
        ordersRepo.getOrderById(cleanId).then((refreshed) => {
          if (refreshed) {
            setOrder(refreshed);
            loadTwinForOrder(cleanId, `${refreshed.brand} ${refreshed.model}`, refreshed.reportedFailure);
          }
        });
      }
    };

    window.addEventListener('entucel_twin_saved', handleLocalSync);
    window.addEventListener('entucel_order_updated', handleLocalSync);
    window.addEventListener('storage', handleLocalSync);

    return () => {
      if (unsubscribeOrder) unsubscribeOrder();
      if (unsubscribeTwin) unsubscribeTwin();
      window.removeEventListener('entucel_twin_saved', handleLocalSync);
      window.removeEventListener('entucel_order_updated', handleLocalSync);
      window.removeEventListener('storage', handleLocalSync);
    };
  }, [order?.id, loadTwinForOrder, ordersRepo]);

  const executeSearch = async (codeStr: string) => {
    setSearchError(null);
    setOrder(null);
    setSearched(false);

    const code = codeStr.trim().toUpperCase();
    if (!code) return;

    setSearching(true);
    try {
      const result = await ordersRepo.getOrderById(code);
      setSearched(true);
      if (result) {
        setOrder(result);
        setSelectedStage(result.status);
        await loadTwinForOrder(result.id, `${result.brand} ${result.model}`, result.reportedFailure);
      } else {
        setSearchError(`No se encontró ninguna orden con el código "${code}". Verifique e intente nuevamente.`);
      }
    } catch (err: any) {
      setSearchError('Error al consultar el servidor. Intente más tarde.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(orderId);
  };

  // Aprobación de Presupuesto con PIN
  const handleConfirmAuthorization = async (pinInput: string) => {
    if (!order) return;
    setAuthorizing(true);
    try {
      await authorizeRepair(order.id);
      const updatedOrder = await ordersRepo.updateOrderStatus(
        order.id,
        'reparacion',
        `Aprobación de presupuesto verificada por el cliente vía PIN telefónico (****${pinInput.slice(-4)}) desde el portal web.`,
        'Cliente (Portal Web)'
      );
      setOrder(updatedOrder);
      setSelectedStage('reparacion');

      window.dispatchEvent(new CustomEvent('entucel_order_approved', { detail: { orderId: order.id } }));
      localStorage.setItem('entucel_order_updated', Date.now().toString());

      await showAlert({
        title: '¡Presupuesto Aprobado con Éxito!',
        message: 'Su autorización ha sido registrada y verificada por seguridad.\n\nNuestro equipo técnico ha sido notificado inmediatamente en el taller y su dispositivo ha pasado a Proceso de Reparación.',
        type: 'success',
        confirmText: 'Ver Avance de Reparación'
      });
    } catch (err: any) {
      throw new Error('Error al procesar la aprobación: ' + err.message);
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        background: 'radial-gradient(circle at 50% 50%, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        padding: '1.5rem 1rem',
        overflowY: 'auto'
      }}
    >
      <div style={{ maxWidth: '1040px', width: '100%' }}>
        
        {/* Cabecera / Volver */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            onClick={onNavigateToLogin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={16} /> Volver al Login Administrativo
          </button>

          {/* Marca / Logo del Taller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {shopInfo?.logoUrl ? (
              <img 
                src={shopInfo.logoUrl} 
                alt={shopInfo.name || 'Logo'} 
                style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} 
              />
            ) : null}
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              {shopInfo?.name || 'EnTuCel'}
            </span>
          </div>
        </div>

        {/* Buscador de Orden */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.3rem' }}>
            Seguimiento de Orden de Servicio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            {shopInfo?.subtitle ? `${shopInfo.subtitle} · ` : ''}Ingrese el código de su orden de servicio (ej. OR-1001) para ver el avance en tiempo real.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}>
                <ClipboardList size={20} />
              </span>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.75rem', textTransform: 'uppercase' }}
                placeholder="OR-XXXX"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                disabled={searching}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Consultando
                </>
              ) : (
                <>
                  <Search size={18} /> Consultar
                </>
              )}
            </button>
          </form>

          {searchError && (
            <div 
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--color-danger)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldAlert size={16} />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* ─────────────── RESULTADOS DEL TRACKING CRECIENTE ─────────────── */}
        {searched && order && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Tarjeta Unificada: Información Principal de la Orden + Stepper Progresivo */}
            <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '0.75rem' 
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Orden de Servicio
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {new Date(order.entryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 0.2rem 0', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {order.id}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>📱 <strong>{order.brand} {order.model}</strong></span>
                    {order.clientName && (
                      <>
                        <span style={{ color: 'var(--border-medium)' }}>•</span>
                        <span>👤 {order.clientName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Estado Actual
                  </span>
                  <div>
                    <span className={`badge badge-${order.status}`} style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem', fontWeight: 800 }}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divisor sutil */}
              <div style={{ height: '1px', backgroundColor: 'var(--border-light)', width: '100%' }} />

              {/* Stepper Progresivo Interactivo Creciente */}
              <TrackingStepper
                order={order}
                selectedStage={selectedStage}
                onSelectStage={(stage) => setSelectedStage(stage)}
                withoutCard={true}
              />
            </div>

            {/* Selector de Pantalla según la Etapa Seleccionada */}
            {selectedStage === 'ingresado' && (
              <TrackingReceptionStage
                order={order}
                whatsappUrl={getWhatsAppUrl(order.id)}
              />
            )}

            {selectedStage === 'diagnostico' && (
              <TrackingDiagnosisStage
                order={order}
                twin={twin}
                whatsappUrl={getWhatsAppUrl(order.id)}
              />
            )}

            {selectedStage === 'espera_aprobacion' && (
              <TrackingBudgetApprovalStage
                order={order}
                twin={twin}
                whatsappUrl={getWhatsAppUrl(order.id)}
                formatCurrency={formatCurrency}
                onConfirmAuthorization={handleConfirmAuthorization}
                authorizing={authorizing}
              />
            )}

            {selectedStage === 'reparacion' && (
              <TrackingRepairStage
                order={order}
                twin={twin}
                whatsappUrl={getWhatsAppUrl(order.id)}
              />
            )}

            {selectedStage === 'listo' && (
              <TrackingReadyStage
                order={order}
                twin={twin}
                whatsappUrl={getWhatsAppUrl(order.id)}
                formatCurrency={formatCurrency}
              />
            )}

            {selectedStage === 'entregado' && (
              <TrackingDeliveredStage
                order={order}
                whatsappUrl={getWhatsAppUrl(order.id)}
              />
            )}

            {/* Bitácora de Progreso y Estados (Siempre disponible al pie) */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Calendar size={18} className="text-secondary" />
                Historial de Avance de la Orden
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {order.statusHistory.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.85rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                      {i < order.statusHistory.length - 1 && (
                        <div style={{ width: '1px', flex: 1, backgroundColor: 'var(--border-light)', marginTop: '4px' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {STATUS_LABELS[h.status] || h.status}
                      </strong>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                        {new Date(h.date).toLocaleString()}
                      </span>
                      {h.notes && (
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontStyle: 'italic', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                          {h.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
