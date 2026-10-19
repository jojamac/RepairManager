import React, { useState, useEffect } from 'react';
import { useAuth } from '../../application/hooks/useAuth';
import { UserRole, Permission, User, DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../../domain/entities/User';
import { UserPlus, ToggleLeft, ToggleRight, X, Key, CheckSquare, Square, Edit2, Loader2, Shield, Users as UsersIcon } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { RolesManager } from '../components/RolesManager';

export const INITIAL_PERMISSION_LABELS: Record<string, { label: string; group: string; description: string }> = {
  // Panel y Operación
  view_dashboard: { label: 'Acceso General al Panel', group: 'Dashboard', description: 'Permite entrar a la pantalla principal del panel de control' },
  view_reception_dashboard: { label: 'Panel Operativo de Mostrador', group: 'Dashboard', description: 'Vista dedicada de mostrador: equipos por retirar, cobros pendientes y cotizaciones WhatsApp' },
  view_dashboard_metrics: { label: 'Ver Métricas y Gráficos Financieros', group: 'Dashboard', description: 'Visualizar balances de caja, facturación histórica y métricas globales' },
  view_technician_kanban: { label: 'Ver Tablero Kanban de Taller', group: 'Dashboard', description: 'Gestión visual de equipos en diagnóstico, reparación y listos' },

  // Taller y Órdenes
  view_orders: { label: 'Consultar Órdenes de Servicio', group: 'Taller & Órdenes', description: 'Ver el listado de reparaciones y fichas de recepción' },
  create_order: { label: 'Crear Nuevas Órdenes', group: 'Taller & Órdenes', description: 'Ingresar nuevos equipos al taller y emitir tiquetes' },
  update_order_status: { label: 'Cambiar Estados de Reparación', group: 'Taller & Órdenes', description: 'Mover órdenes entre diagnóstico, reparación y listo' },
  edit_order_details: { label: 'Modificar Presupuestos y Diagnósticos', group: 'Taller & Órdenes', description: 'Asignar costos, editar componentes 3D y piezas dañadas' },
  deliver_order: { label: 'Liquidar y Entregar al Cliente', group: 'Taller & Órdenes', description: 'Entregar el dispositivo al cliente en mostrador y registrar cobro/liquidación final' },

  // Clientes
  view_clients: { label: 'Consultar Clientes (Directorio)', group: 'CRM Clientes', description: 'Buscar clientes del taller, ver sus teléfonos y su historial de equipos reparados' },
  manage_clients: { label: 'Registrar y Editar Clientes', group: 'CRM Clientes', description: 'Crear fichas de nuevos clientes y modificar sus datos de contacto' },

  // Finanzas y Caja
  view_finance: { label: 'Consultar Módulo Financiero', group: 'Finanzas', description: 'Ver ingresos, gastos y movimientos de caja diaria' },
  manage_finance: { label: 'Registrar Ingresos y Egresos', group: 'Finanzas', description: 'Crear transacciones financieras y arqueos de caja' },

  // Personal y Administración
  view_users: { label: 'Ver Nómina de Empleados', group: 'Personal & Accesos', description: 'Consultar la lista del personal interno (técnicos, recepcionistas, administradores)' },
  manage_users: { label: 'Gestionar Cuentas y Permisos', group: 'Personal & Accesos', description: 'Crear empleados, otorgar accesos al sistema, cambiar contraseñas y asignar roles' },
  manage_settings: { label: 'Configuración del Taller', group: 'Personal & Accesos', description: 'Editar logotipo, NIT, nombre comercial y preferencias del sistema' },
};

export const Users: React.FC = () => {
  const { 
    currentUser, 
    users, 
    roles, 
    permissions,
    loadUsers, 
    loadRoles, 
    loadPermissions,
    saveRole, 
    deleteRole, 
    savePermission,
    deletePermission,
    seedSystemDefaults,
    createUser, 
    toggleUserStatus, 
    updateUserPermissions, 
    updateUser, 
    error: authError 
  } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();

  const canManageUsers = hasPermission(currentUser, 'manage_users');
  
  // Pestañas principales: 'employees' o 'roles'
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('tecnico');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados para Registro de Usuario
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'masculino' | 'femenino' | 'otro' | ''>('');
  const [birthDate, setBirthDate] = useState('');

  // Estado para Edición de Usuario
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('tecnico');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState<'masculino' | 'femenino' | 'otro' | ''>('');
  const [editBirthDate, setEditBirthDate] = useState('');

  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadPermissions();
  }, [loadUsers, loadRoles, loadPermissions]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !role) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      await createUser(email, name, role, phone, gender, birthDate);
      setName('');
      setEmail('');
      setPhone('');
      setGender('');
      setBirthDate('');
      setRole('tecnico');
      setShowAddModal(false);
      toast.success('Empleado registrado correctamente.');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta del personal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const isConfirmed = await confirmDialog.confirm({
      title: 'Confirmar cambio de estado',
      message: `¿Está seguro de que desea ${currentStatus ? 'desactivar' : 'activar'} este usuario?`,
      type: currentStatus ? 'danger' : 'info',
      confirmText: currentStatus ? 'Desactivar' : 'Activar',
    });

    if (isConfirmed) {
      try {
        await toggleUserStatus(userId, !currentStatus);
        toast.success(`Usuario ${currentStatus ? 'desactivado' : 'activado'} con éxito.`);
      } catch (err: any) {
        toast.error(err.message || 'Error al cambiar estado.');
      }
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPhone(user.phone || '');
    setEditGender(user.gender || '');
    setEditBirthDate(user.birthDate || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim()) {
      toast.warning('El nombre del usuario no puede estar vacío.');
      return;
    }

    setSubmitting(true);
    try {
      await updateUser(editingUser.id, editName.trim(), editRole, editPhone, editGender, editBirthDate);
      setEditingUser(null);
      toast.success('Datos del usuario actualizados.');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUserForPermissions(user);
    const matchedRole = roles.find(r => r.id === user.role);
    const baseRolePerms = matchedRole ? matchedRole.permissions : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);
    const current = user.customPermissions && user.customPermissions.length > 0 
      ? user.customPermissions 
      : baseRolePerms;
    setSelectedPermissions(current);
  };

  const handleTogglePermission = (permission: Permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    setSubmitting(true);
    try {
      await updateUserPermissions(selectedUserForPermissions.id, selectedPermissions);
      setSelectedUserForPermissions(null);
      toast.success('Permisos actualizados correctamente.');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar los permisos del usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mapa dinámico de etiquetas de roles a partir de la base de datos
  const roleNameMap: Record<string, string> = React.useMemo(() => {
    const map: Record<string, string> = {
      admin: 'Administrador',
      tecnico: 'Técnico de Taller',
      recepcion: 'Recepcionista'
    };
    roles.forEach(r => {
      map[r.id] = r.name;
    });
    return map;
  }, [roles]);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Gestión de Personal & Accesos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Control de cuentas de empleados, asignación de roles y personalización de permisos de seguridad.
          </p>
        </div>
        {canManageUsers && activeTab === 'employees' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> Registrar Empleado
          </button>
        )}
      </div>

      {/* Pestañas de Navegación: Empleados vs Roles */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '0.55rem 1.15rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            borderRadius: 'var(--border-radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'employees' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'employees' ? '#ffffff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <UsersIcon size={16} /> Nómina de Empleados ({users.length})
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '0.55rem 1.15rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            borderRadius: 'var(--border-radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'roles' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'roles' ? '#ffffff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Shield size={16} /> Roles y Plantillas de Acceso ({roles.length})
        </button>
      </div>

      {authError && (
        <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-danger)', marginBottom: '1.5rem' }}>
          {authError}
        </div>
      )}

      {/* VISTA 1: Roles y Plantillas Dinámicas */}
      {activeTab === 'roles' ? (
        <RolesManager
          roles={roles}
          permissions={permissions}
          onSaveRole={saveRole}
          onDeleteRole={deleteRole}
          onSavePermission={savePermission}
          onDeletePermission={deletePermission}
          onSeedDefaults={seedSystemDefaults}
          canManage={canManageUsers}
        />
      ) : (
        /* VISTA 2: Tabla de Empleados */
        <div className="glass-card" style={{ padding: '1.75rem' }}>
        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ padding: '1.15rem 1.5rem' }}>Empleado</th>
                <th style={{ padding: '1.15rem 1.5rem' }}>Correo Electrónico</th>
                <th style={{ padding: '1.15rem 1.5rem' }}>Rol Asignado</th>
                <th style={{ padding: '1.15rem 1.5rem' }}>Estado</th>
                <th style={{ padding: '1.15rem 1.5rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const hasCustom = u.customPermissions && u.customPermissions.length > 0;
                  const activePerms = hasCustom ? u.customPermissions!.length : (DEFAULT_ROLE_PERMISSIONS[u.role] || []).length;

                  return (
                    <tr key={u.id}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div 
                            className="user-avatar" 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              fontSize: '1rem',
                              fontWeight: 700,
                              borderRadius: '50%',
                              backgroundColor: u.role === 'admin' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {u.id.substring(0, 10)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                        <div>{u.email}</div>
                        {u.phone && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Tel: {u.phone}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span 
                          className="badge" 
                          style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: u.role === 'admin' ? 'rgba(99, 102, 241, 0.12)' : u.role === 'tecnico' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: u.role === 'admin' ? 'var(--color-primary)' : u.role === 'tecnico' ? '#38bdf8' : '#f59e0b',
                            border: `1px solid ${u.role === 'admin' ? 'rgba(99, 102, 241, 0.25)' : u.role === 'tecnico' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                          }}
                        >
                          {roleNameMap[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span 
                          className="badge"
                          style={{
                            padding: '0.35rem 0.8rem',
                            fontSize: '0.75rem',
                            backgroundColor: u.active ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: u.active ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${u.active ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                          }}
                        >
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {canManageUsers ? (
                            <>
                              {/* Botón Editar Usuario */}
                              <button 
                                onClick={() => handleOpenEditModal(u)}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.45rem', 
                                  borderRadius: 'var(--border-radius-sm)', 
                                  color: 'var(--text-primary)'
                                }}
                                title="Editar Datos del Empleado"
                              >
                                <Edit2 size={16} />
                              </button>

                              {/* Botón Configurar Permisos */}
                              <button 
                                onClick={() => handleOpenPermissionsModal(u)}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.45rem', 
                                  borderRadius: 'var(--border-radius-sm)', 
                                  color: 'var(--color-accent)'
                                }}
                                title={`Gestionar Permisos de Acceso (${activePerms} activos)`}
                              >
                                <Key size={16} />
                              </button>
                              
                              {/* Botón Activar / Desactivar (Deshabilitado si es Administrador) */}
                              <button
                                onClick={() => u.role !== 'admin' && handleToggleStatus(u.id, u.active)}
                                disabled={u.role === 'admin'}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.45rem', 
                                  borderRadius: 'var(--border-radius-sm)', 
                                  borderColor: u.role === 'admin' ? 'var(--border-light)' : u.active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                                  color: u.role === 'admin' ? 'var(--text-muted)' : u.active ? 'var(--color-danger)' : 'var(--color-success)',
                                  opacity: u.role === 'admin' ? 0.4 : 1,
                                  cursor: u.role === 'admin' ? 'not-allowed' : 'pointer'
                                }}
                                title={
                                  u.role === 'admin' 
                                    ? 'No se puede desactivar la cuenta de Administrador por seguridad del sistema' 
                                    : u.active ? 'Desactivar Cuenta del Empleado' : 'Activar Cuenta del Empleado'
                                }
                              >
                                {u.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Solo lectura
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {selectedUserForPermissions && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} className="text-secondary" />
                Permisos para {selectedUserForPermissions.name}
              </h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setSelectedUserForPermissions(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Rol actual: <strong>{roleNameMap[selectedUserForPermissions.role] || selectedUserForPermissions.role}</strong>. {selectedPermissions.length} permisos activos.
                </p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const allKeys = permissions.map(p => p.key);
                      setSelectedPermissions(allKeys);
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedPermissions([])}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    Desmarcar Todos
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const matched = roles.find(r => r.id === selectedUserForPermissions.role);
                      const def = matched ? matched.permissions : (DEFAULT_ROLE_PERMISSIONS[selectedUserForPermissions.role] || []);
                      setSelectedPermissions(def);
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--color-primary)' }}
                  >
                    Restablecer al Rol
                  </button>
                </div>
              </div>

              {/* Agrupamiento Modular de Permisos desde Base de Datos */}
              {(() => {
                const groups: Record<string, typeof permissions> = {};
                permissions.forEach((p) => {
                  const grp = p.group || 'Otros';
                  if (!groups[grp]) groups[grp] = [];
                  groups[grp].push(p);
                });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {Object.keys(groups).map((grpName) => (
                      <div key={grpName} style={{ border: '1px solid var(--border-medium)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
                        <div style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          padding: '0.6rem 1rem',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{grpName}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {groups[grpName].filter(p => selectedPermissions.includes(p.key)).length} / {groups[grpName].length}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                          {groups[grpName].map((p) => {
                            const isChecked = selectedPermissions.includes(p.key);

                            return (
                              <div
                                key={p.key}
                                onClick={() => handleTogglePermission(p.key)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.75rem 0.85rem',
                                  borderRadius: '6px',
                                  backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease'
                                }}
                              >
                                <div style={{ paddingRight: '1rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isChecked ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                                    {p.label}
                                  </div>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                    {p.description} <code style={{ fontSize: '0.68rem', opacity: 0.7 }}>({p.key})</code>
                                  </div>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                  {isChecked ? (
                                    <CheckSquare size={20} style={{ color: 'var(--color-primary)' }} />
                                  ) : (
                                    <Square size={20} style={{ color: 'var(--text-muted)' }} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedUserForPermissions(null)} disabled={submitting}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSavePermissions} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Datos del Empleado */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={20} className="text-secondary" />
                Editar Datos de {editingUser.name}
              </h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setEditingUser(null)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEditUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingUser.email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    El correo electrónico no se puede modificar por motivos de autenticación.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nombre Completo <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono de Contacto</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="ej. 3001234567"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Género</label>
                    <select 
                      className="form-select" 
                      value={editGender} 
                      onChange={(e) => setEditGender(e.target.value as any)}
                      disabled={submitting}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro / Prefiero no decir</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fecha Nacimiento</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Rol Base del Empleado <span className="required-asterisk">*</span>
                  </label>
                  <select 
                    className="form-select" 
                    value={editRole} 
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    disabled={submitting || editingUser.role === 'admin'}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    {/* Respaldo por si hay un rol antiguo no listado */}
                    {!roles.some(r => r.id === editRole) && (
                      <option value={editRole}>{roleNameMap[editRole] || editRole}</option>
                    )}
                  </select>
                  {editingUser.role === 'admin' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.25rem', display: 'block' }}>
                      El rol del Administrador principal está protegido.
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Personal Técnico / Administrativo</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
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
                    placeholder="ej. Jorge Mendoza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Correo Electrónico <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="tecnico@entucel.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono de Contacto</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="ej. 3001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Género</label>
                    <select 
                      className="form-select" 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value as any)}
                      disabled={submitting}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro / Prefiero no decir</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fecha Nacimiento</label>
                    <input
                      type="date"
                      className="form-input"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Rol Base del Empleado <span className="required-asterisk">*</span>
                  </label>
                  <select 
                    className="form-select" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={submitting}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    {roles.length === 0 && (
                      <>
                        <option value="tecnico">Técnico de Taller</option>
                        <option value="recepcion">Recepcionista</option>
                        <option value="admin">Administrador General</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <strong>Nota de Seguridad:</strong> Se generará una contraseña temporal por defecto: <code>123456</code>. El empleado podrá cambiarla después o solicitar recuperación de contraseña al ingresar.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Registrando...
                    </>
                  ) : (
                    'Registrar Empleado'
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
