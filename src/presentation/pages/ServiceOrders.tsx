import React, { useState, useEffect } from 'react';
import { useServiceOrders } from '../../application/hooks/useServiceOrders';
import { useClients } from '../../application/hooks/useClients';
import { useAuth } from '../../application/hooks/useAuth';
import { hasPermission } from '../../domain/entities/User';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { Search, Plus, Filter, Eye, Smartphone, Calendar, X, UserPlus, Check, Loader2, Printer, Download, Lock, Key, Shield, Save } from 'lucide-react';
import { BrandService } from '../../data/firebase/BrandService';
import { ShopConfigService, ShopInfo } from '../../data/firebase/ShopConfigService';
import { ImageCompressor } from '../../application/utils/ImageCompressor';
import { QRGenerator } from '../components/QRGenerator';
import { CSVExportService } from '../../application/services/CSVExportService';
import { PatternLockInput } from '../components/PatternLockInput';

import { Pagination } from '../components/Pagination';

interface ServiceOrdersProps {
  onSelectOrder: (orderId: string) => void;
}

export const ServiceOrders: React.FC<ServiceOrdersProps> = ({ onSelectOrder }) => {
  const { currentUser } = useAuth();
  const { orders, createOrder, searchOrders } = useServiceOrders();
  const { clients, createClient } = useClients();

  const canCreateOrder = hasPermission(currentUser, 'create_order');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todos'>('todos');
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[] | null>(null);

  // Estados de Paginación en Frontend
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdOrderToPrint, setCreatedOrderToPrint] = useState<ServiceOrder | null>(null);
  const [printType, setPrintType] = useState<'ticket' | 'label'>('ticket');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Información configurable del taller
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);

  useEffect(() => {
    ShopConfigService.getShopInfo().then(info => setShopInfo(info));
  }, []);
  
  // Estado para creación rápida de cliente inline dentro del selector
  const [isCreatingInlineClient, setIsCreatingInlineClient] = useState(false);
  const [inlineClientName, setInlineClientName] = useState('');
  const [inlineClientPhone, setInlineClientPhone] = useState('');
  const [inlineClientDocumentId, setInlineClientDocumentId] = useState('');
  const [inlineClientEmail, setInlineClientEmail] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [serial, setSerial] = useState('');
  const [reportedFailure, setReportedFailure] = useState('');
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState('');
  const [cost, setCost] = useState(0);
  const [paymentAdvance, setPaymentAdvance] = useState(0);
  const [warrantyMonths, setWarrantyMonths] = useState(3);
  const [securityLockType, setSecurityLockType] = useState<'none' | 'pin' | 'pattern'>('none');
  const [securityLockCode, setSecurityLockCode] = useState('');
  const [securityLockPattern, setSecurityLockPattern] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Gestión de marcas predefinidas y personalizables
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [isCreatingInlineBrand, setIsCreatingInlineBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Cargar marcas al montar
  useEffect(() => {
    BrandService.getBrands().then(brands => setAvailableBrands(brands));
  }, []);

  // Fotos iniciales de recepción (máximo 4)
  const [receptionPhotos, setReceptionPhotos] = useState<string[]>([]);

  const handleQuickCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    const updated = await BrandService.addBrand(newBrandName.trim());
    setAvailableBrands(updated);
    setBrand(newBrandName.trim());
    setIsCreatingInlineBrand(false);
    setNewBrandName('');
  };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const filesArray = Array.from(files).slice(0, 4 - receptionPhotos.length);
      filesArray.forEach(async (file) => {
        try {
          const compressed = await ImageCompressor.compressImage(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setReceptionPhotos(prev => [...prev, reader.result as string].slice(0, 4));
          };
          reader.readAsDataURL(compressed);
        } catch (err) {
          console.error('Error al comprimir foto:', err);
        }
      });
    };

  const handleQuickCreateClient = async () => {
    if (!inlineClientName.trim() || !inlineClientPhone.trim() || !inlineClientDocumentId.trim() || !inlineClientEmail.trim()) {
      setError('Todos los campos son obligatorios: Nombre, Teléfono, Identificación/Cédula y Correo electrónico.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inlineClientEmail.trim())) {
      setError('Por favor ingrese un correo electrónico válido para la facturación electrónica.');
      return;
    }
    setIsSavingClient(true);
    setError(null);
    try {
      const newClient = await createClient({
        name: inlineClientName.trim(),
        phone: inlineClientPhone.trim(),
        documentId: inlineClientDocumentId.trim(),
        email: inlineClientEmail.trim().toLowerCase(),
        devices: []
      });
      setSelectedClientId(newClient.id);
      setIsCreatingInlineClient(false);
      setInlineClientName('');
      setInlineClientPhone('');
      setInlineClientDocumentId('');
      setInlineClientEmail('');
    } catch (err: any) {
      setError(err.message || 'Error al registrar cliente nuevo.');
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleSearch = async (queryStr: string) => {
    setSearchQuery(queryStr);
    if (!queryStr.trim()) {
      setFilteredOrders(null);
      return;
    }
    const results = await searchOrders(queryStr);
    setFilteredOrders(results);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClientId || !brand || !model || !imei || !reportedFailure) {
      setError('Por favor complete los campos obligatorios (*).');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      setError('Cliente seleccionado inválido.');
      return;
    }

    setIsSavingOrder(true);
    try {
      const created = await createOrder({
        clientId: selectedClientId,
        clientName: client.name,
        clientPhone: client.phone,
        brand,
        model,
        imei,
        serial: serial || `S/N-${Math.random().toString(36).substring(7).toUpperCase()}`,
        reportedFailure,
        technicalDiagnosis: technicalDiagnosis || 'En espera de revisión.',
        cost: Number(cost),
        paymentAdvance: Number(paymentAdvance),
        balanceDue: Number(cost) - Number(paymentAdvance),
        mediaUrls: receptionPhotos,
        warrantyMonths: Number(warrantyMonths),
        securityLockType,
        securityLockCode: securityLockType === 'pin' ? securityLockCode : undefined,
        securityLockPattern: securityLockType === 'pattern' ? securityLockPattern : undefined
      });

      // Limpiar y abrir modal de impresión de tiquete con QR
      setSelectedClientId('');
      setBrand('');
      setModel('');
      setImei('');
      setSerial('');
      setReportedFailure('');
      setTechnicalDiagnosis('');
      setCost(0);
      setPaymentAdvance(0);
      setWarrantyMonths(3);
      setSecurityLockType('none');
      setSecurityLockCode('');
      setSecurityLockPattern([]);
      setReceptionPhotos([]);
      setShowAddModal(false);
      
      setCreatedOrderToPrint(created);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la orden.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Resetear a página 1 cuando cambia el filtro o la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Filtrado final de órdenes y paginación
  const baseOrders = filteredOrders !== null ? filteredOrders : orders;
  const filteredDisplayOrders = statusFilter === 'todos'
    ? baseOrders
    : baseOrders.filter(o => o.status === statusFilter);

  const totalPages = Math.ceil(filteredDisplayOrders.length / pageSize) || 1;
  const paginatedOrders = filteredDisplayOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Órdenes de Servicio</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Registro de equipos, diagnósticos, historial de estados y entregas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => CSVExportService.exportOrdersToCSV(filteredDisplayOrders)}>
            <Download size={18} /> Exportar CSV
          </button>
          {canCreateOrder && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Nueva Orden
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem', 
          marginBottom: '2rem', 
          display: 'flex', 
          gap: '1rem', 
          flexDirection: 'column'
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}>
            <Search size={20} />
          </span>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Buscar por IMEI, Serial, Marca, Modelo, Código o Nombre de Cliente..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
            <Filter size={14} /> Filtrar por:
          </span>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'ingresado', label: 'Ingresados' },
            { key: 'diagnostico', label: 'Diagnóstico' },
            { key: 'espera_aprobacion', label: 'En Espera' },
            { key: 'reparacion', label: 'Reparación' },
            { key: 'listo', label: 'Listos' },
            { key: 'entregado', label: 'Entregados' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className="btn btn-secondary"
              style={{
                padding: '0.4rem 1rem',
                fontSize: '0.8rem',
                backgroundColor: statusFilter === tab.key ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                color: statusFilter === tab.key ? '#ffffff' : 'var(--text-primary)',
                borderColor: statusFilter === tab.key ? 'var(--color-primary)' : 'var(--border-light)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado en Tabla con Paginador */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Fecha Ingreso</th>
                <th>Dispositivo</th>
                <th>Estado</th>
                <th>Costo Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 'bold' }}>{order.id}</td>
                  <td>
                    <div>
                      <strong>{order.clientName}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Tel: {order.clientPhone}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                      <Calendar size={14} className="text-secondary" />
                      {new Date(order.entryDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Smartphone size={14} className="text-secondary" />
                      {order.brand} {order.model}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(order.cost)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        onClick={() => onSelectOrder(order.id)}
                      >
                        <Eye size={14} /> Detalles
                      </button>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        onClick={() => setCreatedOrderToPrint(order)}
                        title="Imprimir Tiquete de Recepción con QR"
                      >
                        <Printer size={14} /> Tiquete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDisplayOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
                    No se encontraron órdenes de servicio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Componente Reutilizable de Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredDisplayOrders.length}
          pageSize={pageSize}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal para Crear Orden */}
      {showAddModal && canCreateOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Nueva Orden de Servicio</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                {error && (
                  <div style={{ gridColumn: 'span 2', color: 'var(--color-danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-danger)' }}>
                    {error}
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Seleccionar Cliente <span className="required-asterisk">*</span>
                    </label>
                    {!isCreatingInlineClient && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingInlineClient(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <UserPlus size={14} /> + Registrar Nuevo Cliente
                      </button>
                    )}
                  </div>

                  {!isCreatingInlineClient ? (
                    <select 
                      className="form-select" 
                      value={selectedClientId} 
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingInlineClient(true);
                          setSelectedClientId('');
                        } else {
                          setSelectedClientId(e.target.value);
                        }
                      }}
                      required
                    >
                      <option value="">-- Seleccionar cliente existente --</option>
                      <option value="__NEW__" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        ➕ -- Registrar Nuevo Cliente --
                      </option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UserPlus size={15} /> Registro Rápido de Cliente
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingInlineClient(false)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            Nombre Completo *
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: Carlos Gómez"
                            value={inlineClientName}
                            onChange={(e) => setInlineClientName(e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            Teléfono Móvil (WhatsApp) *
                          </label>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="Ej: 3001234567"
                            value={inlineClientPhone}
                            onChange={(e) => setInlineClientPhone(e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            Identificación / Cédula / NIT *
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: 1020304050"
                            value={inlineClientDocumentId}
                            onChange={(e) => setInlineClientDocumentId(e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            Correo Electrónico (Facturación) *
                          </label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="Ej: cliente@correo.com"
                            value={inlineClientEmail}
                            onChange={(e) => setInlineClientEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => setIsCreatingInlineClient(false)}
                          disabled={isSavingClient}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                          onClick={handleQuickCreateClient}
                          disabled={isSavingClient}
                        >
                          {isSavingClient ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Guardando...
                            </>
                          ) : (
                            <>
                              <Check size={14} /> Guardar y Seleccionar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selector de Marca Inteligente con opción de crear marcas en caliente */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Marca <span className="required-asterisk">*</span>
                    </label>
                    {!isCreatingInlineBrand && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingInlineBrand(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Crear Marca
                      </button>
                    )}
                  </div>

                  {!isCreatingInlineBrand ? (
                    <select
                      className="form-select"
                      value={brand}
                      onChange={(e) => {
                        if (e.target.value === '__NEW_BRAND__') {
                          setIsCreatingInlineBrand(true);
                        } else {
                          setBrand(e.target.value);
                        }
                      }}
                      required
                    >
                      <option value="">-- Seleccionar Marca --</option>
                      {availableBrands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__NEW_BRAND__" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        ➕ -- Nueva Marca --
                      </option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. Honor, Motorola..."
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickCreateBrand();
                          } else if (e.key === 'Escape') {
                            setIsCreatingInlineBrand(false);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.55rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={handleQuickCreateBrand}
                        title="Guardar marca"
                        disabled={!newBrandName.trim()}
                      >
                        <Save size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.55rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setIsCreatingInlineBrand(false)}
                        title="Cancelar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Modelo <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej. iPhone 13 Pro"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    IMEI (15 dígitos) <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    maxLength={15}
                    placeholder="ej. 359182039485762"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Serial / SKU (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej. SN-APL-1234"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                  />
                </div>

                {/* 🔒 Seguridad y Desbloqueo del Equipo */}
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0, backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-light)' }}>
                  <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    <Lock size={16} className="text-secondary" /> Bloqueo de Seguridad del Dispositivo
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <button
                      type="button"
                      className={`btn ${securityLockType === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSecurityLockType('none')}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      Sin Bloqueo
                    </button>
                    <button
                      type="button"
                      className={`btn ${securityLockType === 'pin' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSecurityLockType('pin')}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Key size={14} /> Código / PIN / Clave
                    </button>
                    <button
                      type="button"
                      className={`btn ${securityLockType === 'pattern' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSecurityLockType('pattern')}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Shield size={14} /> Patrón 3x3
                    </button>
                  </div>

                  {securityLockType === 'pin' && (
                    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Escriba la clave, PIN o contraseña de acceso del cliente..."
                        value={securityLockCode}
                        onChange={(e) => setSecurityLockCode(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>
                  )}

                  {securityLockType === 'pattern' && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', animation: 'fadeIn 0.2s ease-out' }}>
                      <PatternLockInput
                        value={securityLockPattern}
                        onChange={(newPattern) => setSecurityLockPattern(newPattern)}
                        size={210}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">
                    Fallas Reportadas por el Cliente <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Escriba aquí los síntomas que describe el cliente al entregar el equipo..."
                    value={reportedFailure}
                    onChange={(e) => setReportedFailure(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Diagnóstico Inicial Preliminar del Técnico (Opcional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Notas técnicas iniciales si se realizó una revisión básica en caja..."
                    value={technicalDiagnosis}
                    onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                  />
                </div>

                {/* Registro Fotográfico de Recepción (Hasta 4 Fotos del Estado Físico) */}
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      📷 Fotos de Recepción del Equipo (Máximo 4)
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {receptionPhotos.length}/4 Fotos cargadas
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    {receptionPhotos.map((photo, i) => (
                      <div key={i} style={{ position: 'relative', height: '70px', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                        <img src={photo} alt={`Recepción ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setReceptionPhotos(prev => prev.filter((_, index) => index !== i))}
                          style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {receptionPhotos.length < 4 && (
                      <label 
                        style={{ 
                          height: '70px', 
                          border: '2px dashed var(--border-medium)', 
                          borderRadius: 'var(--border-radius-sm)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          gap: '0.2rem'
                        }}
                      >
                        <Plus size={16} />
                        <span>Añadir Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Presupuesto Estimado (Costo)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={cost || ''}
                    onChange={(e) => setCost(Number(e.target.value))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Abono Inicial</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={paymentAdvance || ''}
                    onChange={(e) => setPaymentAdvance(Number(e.target.value))}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Garantía por Defecto (Meses)</label>
                  <select 
                    className="form-select" 
                    value={warrantyMonths} 
                    onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                  >
                    <option value={0}>Sin Garantía</option>
                    <option value={1}>1 Mes</option>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={isSavingOrder}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} disabled={isSavingOrder}>
                  {isSavingOrder ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando Orden...
                    </>
                  ) : (
                    'Registrar Orden'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Tiquete / Etiqueta Imprimible tras Crear u Ordenar */}
      {createdOrderToPrint && (
        <div className="modal-overlay">
          <div className="glass-card" style={{ width: '90%', maxWidth: '460px', padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                🖨️ Impresión de Recepción
              </span>
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
                onClick={() => setCreatedOrderToPrint(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de Tipo de Impresión: Tiquete Cliente vs Etiqueta Térmica del Celular */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', backgroundColor: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setPrintType('ticket')}
                style={{
                  flex: 1,
                  fontSize: '0.8rem',
                  padding: '0.4rem',
                  backgroundColor: printType === 'ticket' ? 'var(--color-primary)' : 'transparent',
                  color: printType === 'ticket' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                📄 Tiquete Cliente
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setPrintType('label')}
                style={{
                  flex: 1,
                  fontSize: '0.8rem',
                  padding: '0.4rem',
                  backgroundColor: printType === 'label' ? 'var(--color-primary)' : 'transparent',
                  color: printType === 'label' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                🏷️ Etiqueta Celular (Taller)
              </button>
            </div>

            {/* VISTA 1: Tiquete Cliente (con QR a URL Pública de Seguimiento) */}
            {printType === 'ticket' && (
              <div 
                id="printable-ticket"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  marginBottom: '1.25rem',
                  textAlign: 'left'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{shopInfo?.name || 'EnTuCel'}</h2>
                  {shopInfo?.nit && <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>NIT: {shopInfo.nit}</span>}
                  {shopInfo?.address && <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{shopInfo.address} | Tel: {shopInfo.phone}</span>}
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, display: 'block', marginTop: '0.2rem' }}>Tiquete de Recepción de Equipo</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>CÓDIGO DE ORDEN</span>
                    <strong style={{ fontSize: '1.2rem', color: '#2563eb' }}>{createdOrderToPrint.id}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>FECHA INGRESO</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{new Date(createdOrderToPrint.entryDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: '#f8fafc', padding: '0.65rem', borderRadius: '4px' }}>
                  <div><strong>Cliente:</strong> {createdOrderToPrint.clientName}</div>
                  <div><strong>Teléfono:</strong> {createdOrderToPrint.clientPhone}</div>
                  <div><strong>Equipo:</strong> {createdOrderToPrint.brand} {createdOrderToPrint.model}</div>
                  <div><strong>IMEI:</strong> {createdOrderToPrint.imei}</div>
                  <div><strong>Falla Reportada:</strong> {createdOrderToPrint.reportedFailure}</div>
                </div>

                {/* QR PÚBLICO: Lleva al Cliente al seguimiento web */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  <QRGenerator value={`${window.location.origin}/tracking?order=${createdOrderToPrint.id}`} size={110} />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>
                      Escanee este código QR para consultar el estado en línea
                  </span>
                </div>
              </div>
            )}

            {/* VISTA 2: Etiqueta Adhesiva Celular (con QR TÉCNICO interno /orders/OR-XXXX) */}
            {printType === 'label' && (
              <div 
                id="printable-label"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #000000',
                  marginBottom: '1.25rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, borderBottom: '1px solid #000', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                    ETIQUETA DE TALLER - EN TUCEL
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ textAlign: 'left', fontSize: '0.75rem', lineHeight: '1.3' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{createdOrderToPrint.id}</div>
                    <div><strong>Equipo:</strong> {createdOrderToPrint.brand} {createdOrderToPrint.model}</div>
                    <div><strong>Cliente:</strong> {createdOrderToPrint.clientName}</div>
                    <div><strong>IMEI:</strong> {createdOrderToPrint.imei}</div>
                  </div>

                  {/* QR TÉCNICO INTERNO: Redirige directamente al Detalle de la Orden del aplicativo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <QRGenerator value={`${window.location.origin}/orders/${createdOrderToPrint.id}`} size={105} />
                    <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, marginTop: '2px' }}>Uso Técnico</span>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.68rem', color: '#334155', textAlign: 'left' }}>
                  <strong>Falla:</strong> {createdOrderToPrint.reportedFailure}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setCreatedOrderToPrint(null)}
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ flex: 1, gap: '0.4rem' }}
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={16} /> Imprimir {printType === 'ticket' ? 'Tiquete' : 'Etiqueta Celular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
