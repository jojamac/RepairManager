import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClients } from '../../application/hooks/useClients';
import { useServiceOrders } from '../../application/hooks/useServiceOrders';
import { useAuth } from '../../application/hooks/useAuth';
import { hasPermission } from '../../domain/entities/User';
import { Client } from '../../domain/entities/Client';
import { Search, UserPlus, Phone, Mail, FileText, MessageSquare, X, Loader2, Edit2, Save, ExternalLink } from 'lucide-react';
import { useToast } from '../components/Toast';
import { Pagination } from '../components/Pagination';

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { clients, createClient, updateClient, searchClients } = useClients();
  const { orders } = useServiceOrders();
  const toast = useToast();

  const canManageClients = hasPermission(currentUser, 'manage_clients');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[] | null>(null);

  // Estados de Paginación en Clients
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Resetear a página 1 al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected client detail state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Restaurar cliente seleccionado si venimos de vuelta desde una orden
  useEffect(() => {
    const state = location.state as { clientId?: string } | null;
    if (state?.clientId && clients.length > 0 && !selectedClient) {
      const found = clients.find(c => c.id === state.clientId);
      if (found) {
        setSelectedClient(found);
      }
    }
  }, [location.state, clients, selectedClient]);

  // Estados de edición del cliente seleccionado
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDocumentId, setEditDocumentId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Iniciar edición con los datos del cliente seleccionado
  const handleStartEditing = () => {
    if (!selectedClient) return;
    setEditName(selectedClient.name);
    setEditPhone(selectedClient.phone);
    setEditEmail(selectedClient.email || '');
    setEditDocumentId(selectedClient.documentId || '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;
    if (!editName.trim() || !editPhone.trim()) {
      setEditError('Nombre y Teléfono son obligatorios.');
      return;
    }

    if (editEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail.trim())) {
        setEditError('Por favor ingrese un correo electrónico válido.');
        return;
      }
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const updatedData: Client = {
        ...selectedClient,
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() ? editEmail.trim().toLowerCase() : undefined,
        documentId: editDocumentId.trim() ? editDocumentId.trim() : undefined,
      };

      const result = await updateClient(updatedData);
      setSelectedClient(result);
      setIsEditing(false);
      toast.success('Cliente actualizado correctamente.');
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar cliente.');
      toast.error(err.message || 'Error al actualizar cliente.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setFilteredClients(null);
      return;
    }
    const results = await searchClients(val);
    setFilteredClients(results);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !phone) {
      setError('Nombre y Teléfono son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient = await createClient({
        name,
        phone,
        email: email || undefined,
        documentId: documentId || undefined,
        devices: []
      });
      
      // Limpiar campos y cerrar modal
      setName('');
      setPhone('');
      setEmail('');
      setDocumentId('');
      setShowAddModal(false);
      toast.success('Cliente guardado exitosamente.');
      
      // Auto-seleccionar nuevo cliente
      setSelectedClient(newClient);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el cliente.');
      toast.error(err.message || 'Error al guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener historial de reparaciones de un cliente específico
  const getClientOrderHistory = (clientId: string) => {
    return orders.filter(o => o.clientId === clientId);
  };

  // Generador de enlace de WhatsApp
  const getWhatsAppLink = (clientPhone: string, clientName: string) => {
    const trackingUrl = `${window.location.origin}/tracking`;
    const message = `Hola ${clientName}, le escribimos de EnTuCel. Puede realizar el seguimiento online del estado de reparación de su celular ingresando al siguiente enlace: ${trackingUrl} utilizando el código de su orden de servicio.`;
    // Limpiar número de teléfono (quitar espacios, guiones y asegurar código de país si es necesario)
    const cleanPhone = clientPhone.replace(/[^\d]/g, '');
    // Asumimos código 57 de Colombia si el número tiene 10 dígitos
    const formattedPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
    
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const displayList = filteredClients !== null ? filteredClients : clients;
  const totalPages = Math.ceil(displayList.length / pageSize) || 1;
  const paginatedClients = displayList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Gestión de Clientes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Directorio de clientes, historial de dispositivos reparados y notificaciones.
          </p>
        </div>
        {canManageClients && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> Registrar Cliente
          </button>
        )}
      </div>

      {/* Buscador Rápido */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}>
            <Search size={20} />
          </span>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Buscar por nombre, teléfono, correo o documento..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Principal: Listado y Detalle */}
      <div className="content-grid" style={{ gridTemplateColumns: selectedClient ? '1.2fr 1.8fr' : '1fr' }}>
        {/* Listado de Clientes */}
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Clientes Registrados</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 1.5rem' }}>
            {paginatedClients.map((client) => {
              const isActive = selectedClient?.id === client.id;
              const repairsCount = getClientOrderHistory(client.id).length;

              return (
                <div 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  style={{
                    padding: '1rem',
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--border-light)',
                    borderRadius: 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{client.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>
                      Tel: {client.phone}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-ingresado" style={{ fontSize: '0.7rem' }}>
                      {repairsCount} Reparaciones
                    </span>
                  </div>
                </div>
              );
            })}

            {displayList.length === 0 && (
              <div className="text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
                No se encontraron clientes.
              </div>
            )}
          </div>

          {/* Paginación de Clientes */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={displayList.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Detalle del Cliente Seleccionado */}
        {selectedClient && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>FICHA DE CLIENTE</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem' }}>{selectedClient.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!isEditing && canManageClients && (
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={handleStartEditing}
                  >
                    <Edit2 size={14} /> Editar Cliente
                  </button>
                )}
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    setSelectedClient(null);
                    setIsEditing(false);
                  }}
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>

            {/* MODO EDICIÓN */}
            {isEditing ? (
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Edit2 size={16} /> Modificar Datos del Cliente
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </div>

                {editError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.82rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem 0.85rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-danger)' }}>
                    {editError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      Nombre Completo <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nombre del cliente"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      Teléfono Móvil (WhatsApp) <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Teléfono móvil"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      Identificación / Cédula / NIT
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editDocumentId}
                      onChange={(e) => setEditDocumentId(e.target.value)}
                      placeholder="Cédula o NIT para factura"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      Correo Electrónico (Facturación)
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={handleCancelEditing}
                    disabled={isSavingEdit}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.95rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={15} /> Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* MODO LECTURA */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                  <Phone size={18} className="text-secondary" />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Teléfono móvil</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedClient.phone}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                  <Mail size={18} className="text-secondary" />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Correo electrónico</span>
                    <span style={{ fontSize: '0.9rem', color: selectedClient.email ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {selectedClient.email || 'No registrado'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                  <FileText size={18} className="text-secondary" />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Identificación (DNI/Cédula)</span>
                    <span style={{ fontSize: '0.9rem', color: selectedClient.documentId ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {selectedClient.documentId || 'No registrada'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Enlace WhatsApp */}
            <div>
              <a 
                href={getWhatsAppLink(selectedClient.phone, selectedClient.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent"
                style={{ display: 'inline-flex', gap: '0.5rem', width: '100%', justifyContent: 'center', borderColor: '#25D366', color: '#25D366', backgroundColor: 'rgba(37, 211, 102, 0.05)' }}
              >
                <MessageSquare size={18} /> Notificar Código de Seguimiento por WhatsApp
              </a>
            </div>

            {/* Historial de Equipos y Reparaciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                Equipos y Reparaciones Asociadas
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {getClientOrderHistory(selectedClient.id).map((order) => (
                  <div 
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`, { state: { from: '/clients', clientId: selectedClient.id } })}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '1.25rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title="Haga clic para ver el detalle de esta orden"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary)' }}>{order.id}</span>
                        <ExternalLink size={14} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
                      </div>
                      <span className={`badge badge-${order.status}`}>{order.status}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Dispositivo:</span>
                        <br />
                        <strong style={{ color: 'var(--text-primary)' }}>{order.brand} {order.model}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Falla reportada:</span>
                        <br />
                        <span style={{ color: 'var(--text-secondary)' }}>{order.reportedFailure.slice(0, 50)}...</span>
                      </div>
                    </div>
                  </div>
                ))}

                {getClientOrderHistory(selectedClient.id).length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Este cliente no posee órdenes registradas.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Crear Cliente */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Nuevo Cliente</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddClient}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {error && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-danger)' }}>
                    {error}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nombre Completo <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej. María Alejandra Gómez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Teléfono Móvil <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="ej. 3157654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="ej. maria.gomez@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Documento de Identificación (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej. 1020304050"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Cliente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
