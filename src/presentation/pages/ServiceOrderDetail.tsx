import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useServiceOrders } from '../../application/hooks/useServiceOrders';
import { useAuth } from '../../application/hooks/useAuth';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { useToast } from '../components/Toast';
import { useRepositories } from '../../data/RepositoryContext';
import { QRGenerator } from '../components/QRGenerator';
import { 
  ArrowLeft, 
  Smartphone, 
  Clock, 
  Image as ImageIcon,
  Plus,
  X,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useDigitalTwin } from '../../application/hooks/useDigitalTwin';
import { PDFExportService } from '../../application/services/PDFExportService';
import { ShopConfigService } from '../../data/firebase/ShopConfigService';
import { db } from '../../data/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useMediaQuery } from '../../application/hooks/useMediaQuery';
import { PatternLockInput } from '../components/PatternLockInput';
import { hasPermission } from '../../domain/entities/User';
import { useConfirm } from '../components/ConfirmDialog';

import { DigitalTwinPanel } from '../components/DigitalTwinPanel';
import { DiagnosisWorkflowPanel } from '../features/order-detail/components/DiagnosisWorkflowPanel';
import { ApprovalWorkflowPanel } from '../features/order-detail/components/ApprovalWorkflowPanel';
import { RepairWorkflowPanel } from '../features/order-detail/components/RepairWorkflowPanel';
import { CompletedWorkflowPanel } from '../features/order-detail/components/CompletedWorkflowPanel';
import { DeliveryShowcasePanel } from '../features/order-detail/components/DeliveryShowcasePanel';

interface ServiceOrderDetailProps {
  orderId: string;
  onBack: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  ingresado: 'Ingresado',
  diagnostico: 'Diagnóstico',
  espera_aprobacion: 'Espera Aprobación',
  reparacion: 'En Reparación',
  listo: 'Listo para Entrega',
  entregado: 'Entregado',
};

export const ServiceOrderDetail: React.FC<ServiceOrderDetailProps> = ({ orderId, onBack }) => {
  const { getOrder, updateOrderStatus, updateOrder, uploadOrderMedia } = useServiceOrders();
  const { currentUser } = useAuth();
  const { twin, loadTwinForOrder, saveFullTwin, authorizeRepair } = useDigitalTwin();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { financeRepo } = useRepositories();

  const canUpdateStatus = hasPermission(currentUser, 'update_order_status');
  const canEditDetails = hasPermission(currentUser, 'edit_order_details');
  const canDeliverOrder = hasPermission(currentUser, 'deliver_order');
  const canLiquidateBalance = hasPermission(currentUser, 'manage_finance') || hasPermission(currentUser, 'deliver_order');
  
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook responsive (apilamiento en pantallas < 1200px o laptops con escalado)
  const isCompactLayout = useMediaQuery('(max-width: 1199px)');

  // Tabs estado principal
  const [activeTab, setActiveTab] = useState<'pieza' | 'diagnostico' | 'presupuesto'>('pieza');

  // Estado borrador local para el Gemelo Digital
  const [draftTwin, setDraftTwin] = useState<import('../../domain/entities/DigitalTwin').DigitalTwinInstance | null>(null);
  const draftTwinRef = useRef<import('../../domain/entities/DigitalTwin').DigitalTwinInstance | null>(null);
  draftTwinRef.current = draftTwin;

  // Estados Gemelo 3D
  const [selectedTwinKey, setSelectedTwinKey] = useState<string | null>(null);

  // Estados para edición de pieza seleccionada
  const [selectedDiagnosisNote, setSelectedDiagnosisNote] = useState('');
  const [selectedReplacementCost, setSelectedReplacementCost] = useState<number>(0);

  // Estados form & modals
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [technicalDiagnosisText, setTechnicalDiagnosisText] = useState('');
  
  const [savingFullWorkflow, setSavingFullWorkflow] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Autosave Reactivo Inteligente (Debounce & Low-Cost)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSavedTwinRef = useRef<string>('');
  const lastSavedDiagnosisRef = useRef<string>('');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // UI Toggles & Modals
  const [isEquipDetailsExpanded, setIsEquipDetailsExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  // Sincronizar draftTwin únicamente al inicio si aún no se ha instanciado
  useEffect(() => {
    if (twin && !draftTwinRef.current) {
      const copy = JSON.parse(JSON.stringify(twin));
      draftTwinRef.current = copy;
      setDraftTwin(copy);
    }
  }, [twin]);

  // Sincronizar inputs cuando cambia la pieza seleccionada o el draftTwin
  useEffect(() => {
    if (draftTwin && selectedTwinKey) {
      const comp = draftTwin.components.find(c => c.key === selectedTwinKey);
      if (comp) {
        setSelectedDiagnosisNote(comp.diagnosisNote || '');
        setSelectedReplacementCost(comp.replacementCost || 0);
      }
    }
  }, [selectedTwinKey, draftTwin]);

  const loadOrderDetail = async () => {
    setLoading(true);
    setError(null);
    isInitialLoadRef.current = true;
    try {
      const data = await getOrder(orderId);
      if (data) {
        setOrder(data);
        setAdvanceAmount(data.paymentAdvance);
        setTechnicalDiagnosisText(data.technicalDiagnosis || '');
        setLaborCost(data.laborCost || 0);
        lastSavedDiagnosisRef.current = (data.technicalDiagnosis || '').trim();

        const loadedTwin = await loadTwinForOrder(data.id, `${data.brand} ${data.model}`, data.reportedFailure);
        if (loadedTwin) {
          setDraftTwin(JSON.parse(JSON.stringify(loadedTwin)));
          lastSavedTwinRef.current = JSON.stringify(loadedTwin.components || []);
        }
      } else {
        setError('No se encontró la orden de servicio solicitada.');
      }
    } catch (err) {
      setError('Error al cargar la orden.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  };

  // Función de Autoguardado en Vivo con Validación de Cambios (Diff Check)
  const performAutosave = useCallback(async () => {
    if (!order || !draftTwin || loading) return;

    const currentTwinStr = JSON.stringify(draftTwin.components || []);
    const currentDiagStr = technicalDiagnosisText.trim();

    const twinChanged = currentTwinStr !== lastSavedTwinRef.current;
    const diagChanged = currentDiagStr !== lastSavedDiagnosisRef.current;

    // Si nada cambió respecto a la base de datos, no generar escrituras en Firebase
    if (!twinChanged && !diagChanged) return;

    setAutosaveStatus('saving');
    try {
      // 1. Guardar Gemelo Digital si cambió
      if (twinChanged) {
        await saveFullTwin(draftTwin);
        lastSavedTwinRef.current = currentTwinStr;
      }

      // 2. Transición automática de estado si la orden estaba en 'ingresado' y se diagnostica
      let nextStatus = order.status;
      let newHistory = order.statusHistory;
      if (order.status === 'ingresado' && (diagChanged || draftTwin.components.some(c => c.status !== 'NORMAL'))) {
        nextStatus = 'diagnostico';
        newHistory = [
          ...order.statusHistory,
          {
            status: 'diagnostico',
            date: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Técnico',
            notes: 'Diagnóstico técnico iniciado en laboratorio.'
          }
        ];
      }

      const updatedOrder: ServiceOrder = {
        ...order,
        technicalDiagnosis: technicalDiagnosisText,
        status: nextStatus,
        statusHistory: newHistory
      };

      const saved = await updateOrder(updatedOrder);
      setOrder(saved);
      lastSavedDiagnosisRef.current = currentDiagStr;

      // Notificar en tiempo real al portal de clientes
      window.dispatchEvent(new CustomEvent('entucel_twin_saved', { detail: { orderId: order.id } }));
      localStorage.setItem('entucel_twin_saved', Date.now().toString());
      localStorage.setItem('entucel_order_updated', Date.now().toString());

      setAutosaveStatus('saved');
      setTimeout(() => {
        setAutosaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2500);
    } catch (err) {
      console.warn('Advertencia en autosave técnico:', err);
      setAutosaveStatus('idle');
    }
  }, [order, draftTwin, technicalDiagnosisText, loading, saveFullTwin, updateOrder, currentUser]);

  // Hook que dispara el debounce de 1500ms al detectar cambios en el diagnóstico o componentes
  useEffect(() => {
    if (loading || isInitialLoadRef.current || !order || !draftTwin) return;
    if (order.status !== 'ingresado' && order.status !== 'diagnostico') return;

    const currentTwinStr = JSON.stringify(draftTwin.components || []);
    const currentDiagStr = technicalDiagnosisText.trim();
    if (currentTwinStr === lastSavedTwinRef.current && currentDiagStr === lastSavedDiagnosisRef.current) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performAutosave();
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [draftTwin, technicalDiagnosisText, order, loading, performAutosave]);

  const handleFlushAutosave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    performAutosave();
  };

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  // Escuchar aprobación del cliente y cambios en tiempo real desde Firestore y eventos locales
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    const cleanId = orderId.trim().toUpperCase();

    // 1. Listener en tiempo real desde Firestore (para cuando el cliente aprueba desde su celular)
    if (db) {
      try {
        const orderRef = doc(db, 'orders', cleanId);
        unsubscribeFirestore = onSnapshot(orderRef, async (docSnap) => {
          if (docSnap.exists()) {
            const remoteOrder = docSnap.data() as ServiceOrder;
            setOrder((prev) => {
              if (!prev) return remoteOrder;
              if (remoteOrder.status !== prev.status) {
                if (prev.status === 'espera_aprobacion' && remoteOrder.status === 'reparacion') {
                  toast.success(`🎉 ¡El cliente aprobó el presupuesto para la orden ${remoteOrder.id}! Vista actualizada automáticamente a Proceso de Reparación.`);
                } else {
                  toast.info(`Estado actualizado en vivo a: ${STATUS_LABELS[remoteOrder.status] || remoteOrder.status}`);
                }
                loadTwinForOrder(remoteOrder.id, `${remoteOrder.brand} ${remoteOrder.model}`, remoteOrder.reportedFailure).then((newTwin) => {
                  if (newTwin) setDraftTwin(JSON.parse(JSON.stringify(newTwin)));
                });
              }
              return { ...prev, ...remoteOrder };
            });
          }
        }, (err) => console.warn('onSnapshot order detail err:', err));
      } catch (e) {
        console.warn('Skip firestore listener:', e);
      }
    }

    // 2. Listener para eventos locales en la misma máquina
    const handleOrderApproved = async (evt: Event) => {
      const customEvt = evt as CustomEvent;
      if (customEvt.detail?.orderId === orderId || (evt.type === 'storage' && (evt as StorageEvent).key === 'entucel_order_updated')) {
        const refreshedOrder = await getOrder(orderId);
        if (refreshedOrder) {
          setOrder(refreshedOrder);
          setTechnicalDiagnosisText(refreshedOrder.technicalDiagnosis || '');
          setLaborCost(refreshedOrder.laborCost || 0);
          const loadedTwin = await loadTwinForOrder(refreshedOrder.id, `${refreshedOrder.brand} ${refreshedOrder.model}`, refreshedOrder.reportedFailure);
          if (loadedTwin) {
            setDraftTwin(JSON.parse(JSON.stringify(loadedTwin)));
          }
          toast.success(`🎉 ¡El cliente aprobó el presupuesto para la orden ${refreshedOrder.id}! La orden pasó a Proceso de Reparación.`);
        }
      }
    };

    window.addEventListener('entucel_order_approved', handleOrderApproved);
    window.addEventListener('storage', handleOrderApproved);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('entucel_order_approved', handleOrderApproved);
      window.removeEventListener('storage', handleOrderApproved);
    };
  }, [orderId, getOrder, loadTwinForOrder, toast]);

  // Helper para actualizar localmente un componente en draftTwin (Se guarda al presionar el botón Guardar)
  const updateLocalComponent = (
    key: string,
    newStatus: import('../../domain/entities/DigitalTwin').TwinComponentStatus,
    note?: string,
    cost?: number
  ) => {
    if (!draftTwin) return;
    setDraftTwin(prev => {
      if (!prev) return null;
      const updatedComps = prev.components.map(c => {
        if (c.key === key) {
          const isDiag = newStatus === 'DAMAGED' || newStatus === 'REPLACEMENT_REQUIRED';
          return {
            ...c,
            status: newStatus,
            diagnosisStatus: isDiag ? newStatus : (newStatus === 'NORMAL' ? undefined : (c.diagnosisStatus || c.status)),
            diagnosisNote: note !== undefined ? note : c.diagnosisNote,
            replacementCost: cost !== undefined ? cost : c.replacementCost
          };
        }
        return c;
      });
      return {
        ...prev,
        components: updatedComps
      };
    });
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !order) return;
    const MAX_PHOTOS = 10;
    if (order.mediaUrls.length >= MAX_PHOTOS) {
      toast.warning(`La orden ha alcanzado el límite máximo de ${MAX_PHOTOS} fotografías permitidas.`);
      return;
    }

    setUploadingMedia(true);
    try {
      const file = e.target.files[0];
      const mediaUrl = await uploadOrderMedia(order.id, file);
      const updatedOrder = {
        ...order,
        mediaUrls: [...order.mediaUrls, mediaUrl]
      };
      const result = await updateOrder(updatedOrder);
      setOrder(result);
      toast.success('Fotografía agregada a la orden.');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir la imagen.');
    } finally {
      setUploadingMedia(false);
    }
  };


  const handleRemoveRepairMedia = async (indexToRemove: number) => {
    if (!order) return;
    const currentList = order.repairMediaUrls || [];
    const updatedList = currentList.filter((_, idx) => idx !== indexToRemove);
    try {
      const updatedOrder = {
        ...order,
        repairMediaUrls: updatedList
      };
      const result = await updateOrder(updatedOrder);
      setOrder(result);
      toast.success('Fotografía de evidencia eliminada.');
    } catch (err: any) {
      toast.error('Error al eliminar evidencia: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div 
        className="glass-card text-center" 
        style={{ 
          padding: '4rem 2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '1rem' 
        }}
      >
        <div className="loading-spinner-circle" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
          Cargando detalles de la orden y gemelo digital...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: '1.5rem' }}>{error || 'Error desconocido'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Volver al Listado
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const canEditTechnicalData = canEditDetails;

  const damagedComponents = draftTwin 
    ? draftTwin.components.filter(c => c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED')
    : [];
  const totalPartsCost = damagedComponents.reduce((sum, c) => sum + (c.replacementCost || 0), 0);
  const grandTotalCost = totalPartsCost + laborCost;
  const exceedsBudget = grandTotalCost > order.cost;

  // Acción atómica de Guardar Diagnóstico y Presupuesto Final
  const handleSaveFullWorkflow = async () => {
    if (!order || !draftTwin) return;
    setSavingFullWorkflow(true);
    try {
      // 1. Guardar Gemelo Digital completo con diagnóstico inmutable garantizado
      const twinWithDiag: import('../../domain/entities/DigitalTwin').DigitalTwinInstance = {
        ...draftTwin,
        components: draftTwin.components.map(c => {
          const isDiag = c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED';
          return {
            ...c,
            diagnosisStatus: isDiag ? c.status : c.diagnosisStatus
          };
        }),
        events: [
          {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
            title: 'Diagnóstico Técnico Registrado',
            description: damagedComponents.length > 0 
              ? `Se completó la inspección. ${damagedComponents.length} componente(s) con hallazgos técnicos registrados.`
              : 'Inspección técnica completada sin anomalías de hardware.',
            authorName: currentUser?.name || 'Técnico'
          },
          ...(draftTwin.events || [])
        ]
      };
      await saveFullTwin(twinWithDiag);
      setDraftTwin(twinWithDiag);
      draftTwinRef.current = twinWithDiag;

      // Emitir evento síncrono para notificar al portal público de seguimiento
      window.dispatchEvent(new CustomEvent('entucel_twin_saved', { detail: { orderId: order.id } }));
      localStorage.setItem('entucel_twin_saved', Date.now().toString());

      // 2. Determinar nuevo estado según hallazgos técnicos y presupuesto
      // Si el presupuesto total excede el presupuesto máximo inicial acordado, pasa a 'espera_aprobacion'
      // Si el presupuesto total es <= al acordado, pasa directo a 'reparacion'
      let nextStatus: OrderStatus = order.status;
      if (order.status === 'ingresado' || order.status === 'diagnostico') {
        if (exceedsBudget) {
          nextStatus = 'espera_aprobacion';
        } else {
          nextStatus = 'reparacion';
        }
      }

      // 3. Actualizar la orden de servicio en Firebase / Repo
      const updatedOrder: ServiceOrder = {
        ...order,
        technicalDiagnosis: technicalDiagnosisText,
        laborCost: laborCost,
        cost: grandTotalCost > order.cost ? grandTotalCost : order.cost,
        paymentAdvance: advanceAmount,
        balanceDue: Math.max(0, (grandTotalCost > order.cost ? grandTotalCost : order.cost) - advanceAmount),
        status: nextStatus,
        statusHistory: nextStatus !== order.status ? [
          ...order.statusHistory,
          {
            status: nextStatus,
            date: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Técnico',
            notes: (damagedComponents.length > 0 || exceedsBudget)
              ? `Diagnóstico completado con hallazgos técnicos (${damagedComponents.length} componentes averiados). Solicitando aprobación de presupuesto al cliente.`
              : `Diagnóstico y presupuesto guardados. Pasa a proceso de reparación.`
          }
        ] : order.statusHistory
      };

      const savedOrder = await updateOrder(updatedOrder);
      setOrder(savedOrder);
      setDraftTwin(JSON.parse(JSON.stringify(draftTwin)));

      if (nextStatus === 'espera_aprobacion') {
        toast.warning(`Diagnóstico guardado exitosamente. La orden ha pasado a "Espera Aprobación" del cliente.`);
      } else if (nextStatus === 'reparacion') {
        toast.success(`Diagnóstico y presupuesto guardados exitosamente. La orden pasa a "En Reparación".`);
      } else {
        toast.success(`Diagnóstico y presupuesto guardados exitosamente.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar diagnóstico y presupuesto.');
    } finally {
      setSavingFullWorkflow(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          FASE 1: CABECERA COMPACTA (< 90px alto)
         ───────────────────────────────────────────────────────────── */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '0.75rem 1.25rem',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Izquierda: Volver + Orden · Modelo · Cliente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={onBack} 
            className="btn btn-secondary" 
            title="Volver"
            style={{ padding: '0.45rem 0.65rem' }}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{order.id}</strong>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {order.brand} {order.model}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {order.clientName} ({order.clientPhone})
              </span>
            </div>
          </div>
        </div>

        {/* Derecha: Badge Estado Clickeable + Botón Más [...] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          
          {/* Badge Informativo de Estado Automático */}
          <span className={`badge badge-${order.status}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem', fontWeight: 600 }}>
            {STATUS_LABELS[order.status] || order.status}
          </span>

          {/* Menú de Acciones "..." */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              style={{ padding: '0.45rem 0.65rem' }}
              title="Más opciones de la orden"
            >
              <MoreVertical size={18} />
            </button>

            {showMoreMenu && (
              <div 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  minWidth: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.4rem',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setShowMoreMenu(false); setShowQRModal(true); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Smartphone size={16} style={{ color: 'var(--color-primary)' }} /> Ver QR de Seguimiento
                </button>
                
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={async () => {
                    setShowMoreMenu(false);
                    const shopInfo = await ShopConfigService.getShopInfo();
                    PDFExportService.exportOrderTicket(order, shopInfo);
                    toast.success('Imprimiendo tiquete PDF...');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Printer size={16} style={{ color: 'var(--color-primary)' }} /> Imprimir Tiquete PDF
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setShowMoreMenu(false); setShowPhotoModal(true); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ImageIcon size={16} style={{ color: 'var(--color-primary)' }} /> Registro Fotográfico ({order.mediaUrls.length})
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => { setShowMoreMenu(false); setShowHistoryModal(true); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Clock size={16} style={{ color: 'var(--color-primary)' }} /> Ver Historial de Progreso
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FASE 1.2: FILA DELGADA / COLAPSABLE "DETALLES DEL EQUIPO"
         ───────────────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '0.6rem 1.25rem' }}>
        <div 
          onClick={() => setIsEquipDetailsExpanded(!isEquipDetailsExpanded)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>📱 <strong>IMEI:</strong> {order.imei || 'N/A'}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span><strong>Serial:</strong> {order.serial || 'N/A'}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span><strong>Falla:</strong> "{order.reportedFailure}"</span>
          </div>

          <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem' }}>
            {isEquipDetailsExpanded ? <>Menos <ChevronUp size={14} /></> : <>Ver más <ChevronDown size={14} /></>}
          </button>
        </div>

        {isEquipDetailsExpanded && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
            <div className="sub-block">
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Marca / Modelo</span>
              <strong style={{ color: 'var(--text-primary)' }}>{order.brand} {order.model}</strong>
            </div>
            <div className="sub-block">
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Presupuesto Máximo Inicial</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(order.cost)}</strong>
            </div>
            <div className="sub-block">
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Abono Registrado</span>
              <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(order.paymentAdvance)}</strong>
            </div>
            <div className="sub-block" style={{ gridColumn: 'span 2' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                🔒 Clave de Desbloqueo / Seguridad
              </span>
              {(!order.securityLockType || order.securityLockType === 'none') && (
                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin código de seguridad registrado</span>
              )}
              {order.securityLockType === 'pin' && (
                <strong style={{ color: 'var(--color-primary)', fontSize: '1rem', letterSpacing: '1px' }}>
                  🔑 {order.securityLockCode || 'No especificado'}
                </strong>
              )}
              {order.securityLockType === 'pattern' && order.securityLockPattern && (
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPatternModal(true)}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    🎨 Ver Patrón de Desbloqueo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FASE 2: LAYOUT PRINCIPAL DE 2 COLUMNAS (60% / 40%)
         ───────────────────────────────────────────────────────────── */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: isCompactLayout ? '1fr' : 'minmax(0, 1.35fr) minmax(0, 1fr)', 
          gap: '1.25rem',
          alignItems: 'start'
        }}
      >
        {/* COLUMNA IZQUIERDA (Destacada): Showcase de Evidencias en Entrega / Gemelo Digital en etapas de taller */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {draftTwin && (
            (order.status === 'listo' || order.status === 'entregado') ? (
              <DeliveryShowcasePanel
                order={order}
                twin={draftTwin}
                selectedComponentKey={selectedTwinKey}
                onSelectComponent={(key) => setSelectedTwinKey(key)}
              />
            ) : (
              <DigitalTwinPanel
                twin={draftTwin}
                selectedComponentKey={selectedTwinKey}
                onSelectComponent={(key, newStatus) => {
                  // Si está en etapa posterior al diagnóstico, solo permitir seleccionar piezas dañadas/reparadas
                  if (order.status !== 'ingresado' && order.status !== 'diagnostico') {
                    const comp = draftTwin.components.find(c => c.key === key);
                    if (comp && comp.status !== 'DAMAGED' && comp.status !== 'REPLACEMENT_REQUIRED' && comp.status !== 'REPAIRED' && comp.status !== 'REPLACED') {
                      toast.info('En esta etapa solo puedes interactuar con los componentes marcados en el diagnóstico.');
                      return;
                    }
                  }
                  setSelectedTwinKey(key);
                  if (newStatus && (order.status === 'ingresado' || order.status === 'diagnostico')) {
                    updateLocalComponent(key, newStatus);
                  }
                }}
                onResetAll={async () => {
                  const ok = await confirm({
                    title: '¿Resetear diagnóstico?',
                    message: 'Se restablecerán todos los componentes al estado Normal (OK) y se limpiarán los costos del borrador.',
                    type: 'warning',
                    confirmText: 'Sí, resetear',
                    cancelText: 'Cancelar'
                  });
                  if (ok) {
                    setDraftTwin(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        components: prev.components.map(c => ({ ...c, status: 'NORMAL', diagnosisNote: '', replacementCost: 0 }))
                      };
                    });
                    toast.success('Borrador de diagnóstico reseteado.');
                  }
                }}
                readOnly={!canEditTechnicalData || (order.status !== 'ingresado' && order.status !== 'diagnostico')}
                filterDamagedOnly={order.status !== 'ingresado' && order.status !== 'diagnostico'}
              />
            )
          )}
        </div>

        {/* COLUMNA DERECHA: Componente Dinámico según Estado de la Orden */}
        <div style={{ minWidth: 0 }}>
          {/* CASO 1: Diagnóstico / Ingresado */}
          {(order.status === 'ingresado' || order.status === 'diagnostico') && draftTwin && (
            <DiagnosisWorkflowPanel
              order={order}
              draftTwin={draftTwin}
              selectedTwinKey={selectedTwinKey}
              setSelectedTwinKey={setSelectedTwinKey}
              selectedDiagnosisNote={selectedDiagnosisNote}
              setSelectedDiagnosisNote={setSelectedDiagnosisNote}
              selectedReplacementCost={selectedReplacementCost}
              setSelectedReplacementCost={setSelectedReplacementCost}
              technicalDiagnosisText={technicalDiagnosisText}
              setTechnicalDiagnosisText={setTechnicalDiagnosisText}
              laborCost={laborCost}
              setLaborCost={setLaborCost}
              advanceAmount={advanceAmount}
              setAdvanceAmount={setAdvanceAmount}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              updateLocalComponent={updateLocalComponent}
              handleSaveFullWorkflow={handleSaveFullWorkflow}
              savingFullWorkflow={savingFullWorkflow}
              canEditTechnicalData={canEditTechnicalData}
              formatCurrency={formatCurrency}
              autosaveStatus={autosaveStatus}
              onFlushAutosave={handleFlushAutosave}
            />
          )}

          {/* CASO 2: Espera de Aprobación */}
          {order.status === 'espera_aprobacion' && draftTwin && (
            <ApprovalWorkflowPanel
              order={order}
              twin={draftTwin}
              onApproveRepair={async () => {
                await authorizeRepair(order.id);
                toast.success('Reparación autorizada. Pasa a estado "En Reparación".');
                await loadOrderDetail();
              }}
              formatCurrency={formatCurrency}
            />
          )}

          {/* CASO 3: En Reparación */}
          {order.status === 'reparacion' && draftTwin && (
            <RepairWorkflowPanel
              order={order}
              twin={draftTwin}
              onUpdateComponentStatus={async (key, status) => {
                const base = draftTwinRef.current || draftTwin;
                if (!base) return;

                const targetComp = base.components.find(c => c.key === key);
                const prevStatus = targetComp?.status;

                // Crear evento de auditoría en la cronología del gemelo digital
                const newEvent: import('../../domain/entities/DigitalTwin').DigitalTwinEvent = {
                  id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
                  title: status === 'REPLACED' 
                    ? `Repuesto Instalado: ${targetComp?.name || key}` 
                    : (status === 'REPAIRED' 
                        ? `Reparación Realizada: ${targetComp?.name || key}` 
                        : `Estado Actualizado: ${targetComp?.name || key}`),
                  description: status === 'REPLACED' 
                    ? 'Pieza sustituida por repuesto nuevo en taller.' 
                    : (status === 'REPAIRED' 
                        ? 'Pieza original reparada en laboratorio.' 
                        : `Estado cambiado de ${prevStatus} a ${status}`),
                  componentKey: key,
                  previousStatus: prevStatus,
                  newStatus: status,
                  authorName: currentUser?.name || 'Técnico'
                };

                const updatedComps = base.components.map(c => {
                  if (c.key === key) {
                    const isPrevDiag = prevStatus === 'DAMAGED' || prevStatus === 'REPLACEMENT_REQUIRED';
                    return { 
                      ...c, 
                      status,
                      // Preservar de forma inmutable el diagnóstico inicial
                      diagnosisStatus: c.diagnosisStatus || (isPrevDiag ? prevStatus : c.diagnosisStatus)
                    };
                  }
                  return c;
                });

                const nextTwin: import('../../domain/entities/DigitalTwin').DigitalTwinInstance = {
                  ...base,
                  components: updatedComps,
                  events: [newEvent, ...(base.events || [])],
                  isCertified: base.qualityChecks.every(q => q.passed) && updatedComps.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED')
                };

                draftTwinRef.current = nextTwin;
                setDraftTwin(nextTwin);

                // El estado de las piezas SÍ se sincroniza con Firebase para que el cliente lo vea en vivo en el tracking
                try {
                  await saveFullTwin(nextTwin);
                  window.dispatchEvent(new CustomEvent('entucel_twin_saved', { detail: { orderId: order.id } }));
                  localStorage.setItem('entucel_twin_saved', Date.now().toString());
                } catch (e) {
                  console.warn('Error al guardar estado de pieza en Firebase:', e);
                }
              }}
              onToggleQualityCheck={async (key, passed) => {
                const base = draftTwinRef.current || draftTwin;
                if (!base) return;

                const updatedChecks = base.qualityChecks.map(qc => 
                  qc.componentKey === key 
                    ? { ...qc, passed, testedAt: new Date().toISOString(), testedBy: currentUser?.name || 'Técnico' } 
                    : qc
                );
                const nextTwin: import('../../domain/entities/DigitalTwin').DigitalTwinInstance = {
                  ...base,
                  qualityChecks: updatedChecks,
                  isCertified: updatedChecks.every(q => q.passed) && base.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED')
                };

                draftTwinRef.current = nextTwin;
                setDraftTwin(nextTwin);

                // Persistencia local inmediata (LocalStorage) sin llamadas de red a Firebase
                try {
                  const storageKey = 'entucel_digital_twins';
                  const raw = localStorage.getItem(storageKey);
                  const list = raw ? JSON.parse(raw) : [];
                  const idx = list.findIndex((t: any) => t.orderId?.trim().toUpperCase() === order.id.trim().toUpperCase());
                  if (idx >= 0) list[idx] = nextTwin;
                  else list.push(nextTwin);
                  localStorage.setItem(storageKey, JSON.stringify(list));
                } catch (e) {
                  console.warn('Error al guardar borrador local:', e);
                }
              }}
              onBatchQualityCheck={async (passed: boolean) => {
                const base = draftTwinRef.current || draftTwin;
                if (!base) return;

                const updatedChecks = base.qualityChecks.map(qc => ({
                  ...qc,
                  passed,
                  testedAt: new Date().toISOString(),
                  testedBy: currentUser?.name || 'Técnico'
                }));
                const nextTwin: import('../../domain/entities/DigitalTwin').DigitalTwinInstance = {
                  ...base,
                  qualityChecks: updatedChecks,
                  isCertified: passed && base.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED')
                };

                draftTwinRef.current = nextTwin;
                setDraftTwin(nextTwin);

                // Persistencia local inmediata (LocalStorage)
                try {
                  const storageKey = 'entucel_digital_twins';
                  const raw = localStorage.getItem(storageKey);
                  const list = raw ? JSON.parse(raw) : [];
                  const idx = list.findIndex((t: any) => t.orderId?.trim().toUpperCase() === order.id.trim().toUpperCase());
                  if (idx >= 0) list[idx] = nextTwin;
                  else list.push(nextTwin);
                  localStorage.setItem(storageKey, JSON.stringify(list));
                } catch (e) {
                  console.warn('Error al guardar borrador local:', e);
                }

                toast.success(passed ? 'Todas las pruebas marcadas como superadas.' : 'Pruebas de calidad reiniciadas a pendiente.');
              }}
              onRemoveRepairMedia={handleRemoveRepairMedia}
              onCompleteRepair={async (pendingFiles: File[] = []) => {
                try {
                  // 1. Subir fotografías locales de evidencia a Firebase Storage ÚNICAMENTE en este momento al finalizar
                  let uploadedUrls: string[] = [];
                  if (pendingFiles && pendingFiles.length > 0) {
                    uploadedUrls = await Promise.all(
                      pendingFiles.map(file => uploadOrderMedia(order.id, file))
                    );
                  }

                  const finalRepairMediaUrls = [
                    ...(order.repairMediaUrls || []),
                    ...uploadedUrls
                  ];

                  // 2. Guardar Gemelo Digital completo (pruebas de calidad + piezas certificadas) en Firebase
                  const finalTwin = draftTwinRef.current || draftTwin;
                  if (finalTwin) {
                    await saveFullTwin(finalTwin);
                  }

                  // 3. Actualizar orden con las URLs oficiales de Storage y estado 'listo'
                  const updatedOrder: ServiceOrder = {
                    ...order,
                    balanceDue: Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0)),
                    repairMediaUrls: finalRepairMediaUrls,
                    status: 'listo',
                    statusHistory: [
                      ...order.statusHistory,
                      {
                        status: 'listo',
                        date: new Date().toISOString(),
                        updatedBy: currentUser?.name || 'Técnico',
                        notes: 'Reparación, pruebas de calidad concluidas y evidencias fotográficas registradas.'
                      }
                    ]
                  };

                  const savedOrder = await updateOrder(updatedOrder);
                  setOrder(savedOrder);

                  // 4. Notificar al portal de seguimiento del cliente en tiempo real
                  window.dispatchEvent(new CustomEvent('entucel_twin_saved', { detail: { orderId: order.id } }));
                  localStorage.setItem('entucel_twin_saved', Date.now().toString());
                  localStorage.setItem('entucel_order_updated', Date.now().toString());

                  toast.success('¡Reparación completada! Evidencias almacenadas y orden marcada como "Listo para Entrega".');
                  await loadOrderDetail();
                } catch (err: any) {
                  toast.error('Error al finalizar y subir evidencias: ' + (err.message || 'Error desconocido'));
                }
              }}
              canEditTechnicalData={canEditTechnicalData}
              formatCurrency={formatCurrency}
            />
          )}

          {/* CASO 4: Listo para Entrega o Entregado */}
          {(order.status === 'listo' || order.status === 'entregado') && draftTwin && (
            <CompletedWorkflowPanel
              order={order}
              twin={draftTwin}
              onDeliverOrder={async () => {
                const updated = await updateOrderStatus(order.id, 'entregado', 'Equipo entregado al cliente en tienda.');
                setOrder(updated);
                toast.success('Orden entregada al cliente exitosamente.');
                await loadOrderDetail();
              }}
              onLiquidateRemainingBalance={async () => {
                const pending = Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0));
                if (pending <= 0) return;
                try {
                  await financeRepo.createRecord({
                    type: 'ingreso',
                    category: 'reparacion',
                    amount: pending,
                    description: `Pago saldo entrega orden ${order.id} - ${order.clientName}`,
                    createdBy: currentUser?.name || 'Técnico',
                    orderId: order.id,
                    clientName: order.clientName,
                  });

                  const updatedOrder: ServiceOrder = {
                    ...order,
                    paymentAdvance: order.cost,
                    balanceDue: 0,
                  };
                  const saved = await updateOrder(updatedOrder);
                  setOrder(saved);
                  toast.success(`¡Saldo de ${formatCurrency(pending)} registrado en Finanzas y orden totalmente liquidada!`);
                  await loadOrderDetail();
                } catch (err: any) {
                  toast.error('Error al registrar saldo en Finanzas: ' + (err.message || 'Error desconocido'));
                }
              }}
              canUpdateStatus={canUpdateStatus}
              canDeliverOrder={canDeliverOrder}
              canLiquidateBalance={canLiquidateBalance}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALES REUBICADOS (FASE 4)
         ───────────────────────────────────────────────────────────── */}

      {/* MODAL 1: QR de Seguimiento */}
      {showQRModal && (
        <div className="modal-backdrop" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>QR de Seguimiento Público</h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <QRGenerator value={`${window.location.origin}/tracking?order=${order.id}`} size={180} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Escanea para ver el estado de la reparación en tiempo real.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary w-full"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/tracking?order=${order.id}`);
                  toast.success('Enlace copiado al portapapeles');
                }}
              >
                Copiar Enlace
              </button>
              <button className="btn btn-primary w-full" onClick={() => setShowQRModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Registro Fotográfico */}
      {showPhotoModal && (
        <div className="modal-backdrop" onClick={() => setShowPhotoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>Registro Fotográfico ({order.mediaUrls.length}/10)</h3>
              <button className="btn btn-secondary" onClick={() => setShowPhotoModal(false)} style={{ padding: '0.2rem 0.5rem' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', marginBottom: '1rem' }}>
              {order.mediaUrls.map((url, i) => (
                <div key={i} onClick={() => setPreviewImageIndex(i)} style={{ height: '90px', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', border: '1px solid var(--border-medium)', cursor: 'pointer' }}>
                  <img src={url} alt={`Foto ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              {order.mediaUrls.length === 0 && (
                <p style={{ color: 'var(--text-muted)', gridColumn: 'span 4', textAlign: 'center', padding: '1.5rem 0' }}>
                  No hay fotografías adjuntas a esta orden.
                </p>
              )}
            </div>

            {order.mediaUrls.length < 10 && (
              <label className="btn btn-secondary w-full" style={{ cursor: 'pointer', justifyContent: 'center' }}>
                <Plus size={16} /> {uploadingMedia ? 'Subiendo...' : 'Añadir Fotografía'}
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploadingMedia} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Historial de Progreso */}
      {showHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: '1.5rem', maxHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Clock size={18} className="text-secondary" /> Historial de Progreso y Eventos
              </h3>
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)} style={{ padding: '0.2rem 0.5rem' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Progreso de Estados ({order.statusHistory.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {order.statusHistory.map((h, idx) => {
                    const parsedDate = new Date(h.date);
                    const formattedDate = !isNaN(parsedDate.getTime()) 
                      ? parsedDate.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                      : h.date || 'Fecha no registrada';

                    return (
                      <div key={idx} style={{ display: 'flex', gap: '0.85rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                          {idx < order.statusHistory.length - 1 && (
                            <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border-light)', marginTop: '4px' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)' }}>
                          <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.9rem' }}>
                            {STATUS_LABELS[h.status] || h.status}
                          </strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.1rem' }}>
                            Por: <strong>{h.updatedBy || 'Técnico'}</strong> · {formattedDate}
                          </span>
                          {h.notes && (
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontStyle: 'italic', fontSize: '0.8rem', lineHeight: '1.3' }}>
                              {h.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {twin && twin.events.length > 0 && (
                <div>
                  <hr style={{ borderColor: 'var(--border-light)', margin: '1rem 0' }} />
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    Eventos del Gemelo 3D ({twin.events.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {twin.events.map((ev, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.6rem 0.85rem', borderRadius: 'var(--border-radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{ev.title}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ev.timestamp}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.78rem' }}>{ev.description}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                          Registrado por: {ev.authorName || 'Técnico'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.5: Patrón de Desbloqueo del Equipo */}
      {showPatternModal && order.securityLockPattern && (
        <div className="modal-backdrop" onClick={() => setShowPatternModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🎨 Patrón de Desbloqueo
              </h3>
              <button className="btn btn-secondary" onClick={() => setShowPatternModal(false)} style={{ padding: '0.2rem 0.5rem' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Secuencia de nodos registrada para desbloquear el equipo ({order.brand} {order.model}):
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <PatternLockInput value={order.securityLockPattern} onChange={() => {}} readOnly size={220} />
            </div>

            <button className="btn btn-primary w-full" onClick={() => setShowPatternModal(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Lightbox Imagen Ampliada con Navegación Anterior / Siguiente */}
      {previewImageIndex !== null && order.mediaUrls[previewImageIndex] && (
        <div 
          onClick={() => setPreviewImageIndex(null)} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.92)', 
            backdropFilter: 'blur(8px)',
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem' 
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setPreviewImageIndex(null)}
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                backgroundColor: 'var(--color-danger)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10010,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
              title="Cerrar Imagen"
            >
              <X size={20} />
            </button>

            {/* Navegación Anterior */}
            {order.mediaUrls.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewImageIndex((previewImageIndex - 1 + order.mediaUrls.length) % order.mediaUrls.length)}
                style={{
                  position: 'absolute',
                  left: '-25px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  zIndex: 10010,
                  transition: 'background-color 0.2s ease'
                }}
                title="Imagen Anterior"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Imagen Principal */}
            <img 
              src={order.mediaUrls[previewImageIndex]} 
              alt={`Fotografía ${previewImageIndex + 1}`} 
              style={{ 
                maxWidth: '85vw', 
                maxHeight: '80vh', 
                objectFit: 'contain', 
                borderRadius: 'var(--border-radius-sm)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }} 
            />

            {/* Contador de Imágenes */}
            <div 
              style={{ 
                position: 'absolute', 
                bottom: '-35px', 
                color: '#ffffff', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '0.3rem 0.8rem',
                borderRadius: '999px'
              }}
            >
              {previewImageIndex + 1} / {order.mediaUrls.length}
            </div>

            {/* Navegación Siguiente */}
            {order.mediaUrls.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewImageIndex((previewImageIndex + 1) % order.mediaUrls.length)}
                style={{
                  position: 'absolute',
                  right: '-25px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  zIndex: 10010,
                  transition: 'background-color 0.2s ease'
                }}
                title="Imagen Siguiente"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
