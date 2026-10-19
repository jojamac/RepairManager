import React, { useState } from 'react';
import { RoleDefinition } from '../../domain/entities/Role';
import { PermissionDefinition } from '../../domain/entities/PermissionDefinition';
import { Permission, DEFAULT_ROLE_PERMISSIONS } from '../../domain/entities/User';
import { Shield, Plus, Edit3, Trash2, CheckSquare, Square, X, Key, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

interface RolesManagerProps {
  roles: RoleDefinition[];
  permissions?: PermissionDefinition[];
  availablePermissions?: PermissionDefinition[];
  onSaveRole: (role: RoleDefinition) => Promise<RoleDefinition>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onSavePermission?: (permission: PermissionDefinition) => Promise<PermissionDefinition>;
  onDeletePermission?: (key: string) => Promise<void>;
  onSeedDefaults?: (force?: boolean) => Promise<void>;
  canManage: boolean;
}

export const RolesManager: React.FC<RolesManagerProps> = ({
  roles,
  permissions: permissionsProp,
  availablePermissions,
  onSaveRole,
  onDeleteRole,
  onSavePermission,
  onDeletePermission,
  onSeedDefaults,
  canManage,
}) => {
  const permissions = permissionsProp || availablePermissions || [];
  const toast = useToast();
  const confirmDialog = useConfirm();

  // Estados para Rol
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Estados para Crear Nuevo Permiso
  const [showCreatePermModal, setShowCreatePermModal] = useState(false);
  const [permKey, setPermKey] = useState('');
  const [permLabel, setPermLabel] = useState('');
  const [permGroup, setPermGroup] = useState('Taller & Órdenes');
  const [permCustomGroup, setPermCustomGroup] = useState('');
  const [permDesc, setPermDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Agrupar catálogo dinámico de permisos por categoría
  const permissionGroups = React.useMemo(() => {
    const groups: Record<string, PermissionDefinition[]> = {};
    permissions.forEach(p => {
      const grp = p.group || 'Otros';
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(p);
    });
    return groups;
  }, [permissions]);

  // Lista de grupos existentes para el selector
  const existingGroups = React.useMemo(() => {
    const set = new Set<string>();
    permissions.forEach(p => p.group && set.add(p.group));
    return Array.from(set);
  }, [permissions]);

  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setIsCreatingRole(false);
    setRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions([...role.permissions]);
  };

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setIsCreatingRole(true);
    setRoleId('');
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([
      'view_dashboard',
      'view_orders',
      'view_clients',
    ]);
  };

  const handleCloseRoleModal = () => {
    setEditingRole(null);
    setIsCreatingRole(false);
    setRoleId('');
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
  };

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSelectAllGroup = (groupPerms: PermissionDefinition[]) => {
    setSelectedPermissions(prev => {
      const set = new Set(prev);
      groupPerms.forEach(p => set.add(p.key));
      return Array.from(set);
    });
  };

  const handleDeselectAllGroup = (groupPerms: PermissionDefinition[]) => {
    const keys = groupPerms.map(p => p.key);
    setSelectedPermissions(prev => prev.filter(k => !keys.includes(k)));
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.warning('El nombre del rol es obligatorio.');
      return;
    }

    let finalId = isCreatingRole
      ? roleName
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
      : (editingRole?.id || roleId);

    if (!finalId) {
      toast.warning('Por favor especifica un nombre válido para el rol.');
      return;
    }

    if (isCreatingRole && roles.some(r => r.id === finalId)) {
      toast.error(`Ya existe un rol registrado con el nombre "${roleName.trim()}".`);
      return;
    }

    setSubmitting(true);
    try {
      const roleToSave: RoleDefinition = {
        id: finalId,
        name: roleName.trim(),
        description: roleDescription.trim(),
        isSystem: editingRole ? editingRole.isSystem : false,
        permissions: selectedPermissions,
        createdAt: editingRole ? editingRole.createdAt : new Date().toISOString(),
      };

      await onSaveRole(roleToSave);
      toast.success(`Rol "${roleToSave.name}" guardado exitosamente.`);
      handleCloseRoleModal();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar rol.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleDefinition) => {
    if (role.isSystem) {
      toast.warning('Los roles base del sistema no pueden eliminarse.');
      return;
    }

    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Rol Personalizado',
      message: `¿Estás seguro de eliminar el rol "${role.name}"? Los empleados que tengan este rol conservarán sus accesos hasta que se les asigne otro rol.`,
      type: 'danger',
      confirmText: 'Eliminar Rol',
    });

    if (confirmed) {
      try {
        await onDeleteRole(role.id);
        toast.success(`Rol "${role.name}" eliminado correctamente.`);
      } catch (err: any) {
        toast.error(err.message || 'Error al eliminar rol.');
      }
    }
  };

  const handleDeletePermission = async (p: PermissionDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.isSystem || !onDeletePermission) return;
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Permiso Personalizado',
      message: `¿Estás seguro de eliminar el permiso "${p.label}" (${p.key}) del catálogo general del sistema?`,
      type: 'danger',
      confirmText: 'Eliminar Permiso',
    });
    if (confirmed) {
      try {
        await onDeletePermission(p.key);
        // Deseleccionarlo si estaba marcado
        setSelectedPermissions(prev => prev.filter(k => k !== p.key));
        toast.success(`Permiso "${p.label}" eliminado del sistema.`);
      } catch (err: any) {
        toast.error(err.message || 'Error al eliminar permiso.');
      }
    }
  };

  // Crear nuevo permiso personalizado
  const handleSaveNewPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSavePermission) {
      toast.error('No se configuró la función para guardar permisos.');
      return;
    }
    if (!permLabel.trim()) {
      toast.warning('El nombre del permiso es obligatorio.');
      return;
    }

    let finalKey = (permKey.trim() || permLabel.trim())
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (permissions.some(p => p.key === finalKey)) {
      toast.error(`Ya existe un permiso registrado con este nombre ("${permLabel.trim()}").`);
      return;
    }

    const finalGroup = permGroup === '__new__' ? permCustomGroup.trim() : permGroup;
    if (!finalGroup) {
      toast.warning('Por favor asigna un módulo o categoría para el permiso.');
      return;
    }

    setSubmitting(true);
    try {
      await onSavePermission({
        key: finalKey,
        label: permLabel.trim(),
        group: finalGroup,
        description: permDesc.trim() || `Permiso personalizado para ${permLabel.trim()}`,
        isSystem: false,
        createdAt: new Date().toISOString(),
      });

      toast.success(`¡Nuevo permiso "${permLabel.trim()}" registrado en base de datos!`);
      setShowCreatePermModal(false);
      setPermKey('');
      setPermLabel('');
      setPermDesc('');
      setPermCustomGroup('');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el permiso.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!onSeedDefaults) return;
    const confirmed = await confirmDialog.confirm({
      title: 'Sincronizar Roles y Permisos Semilla',
      message: 'Esto creará o restaurará en Firestore los 3 roles base (Administrador, Técnico de Taller, Recepcionista) y el catálogo estándar de permisos del sistema. ¿Deseas continuar?',
      type: 'info',
      confirmText: 'Sembrar en Base de Datos',
    });

    if (confirmed) {
      setSeeding(true);
      try {
        await onSeedDefaults(true);
        toast.success('¡Roles y permisos sembrados exitosamente en la base de datos!');
      } catch (err: any) {
        toast.error(err.message || 'Error al sembrar roles y permisos.');
      } finally {
        setSeeding(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Cabecera del Gestor de Roles */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Shield size={22} style={{ color: 'var(--color-primary)' }} />
            Plantillas de Roles y Perfiles de Acceso
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Gestiona los roles del personal y crea nuevos permisos específicos en la base de datos de Firestore.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onSeedDefaults && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleSeedDefaults}
                disabled={seeding}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}
                title="Crear o restaurar roles y permisos estándar en la base de datos de Firestore"
              >
                <RefreshCw size={15} className={seeding ? 'animate-spin' : ''} /> {seeding ? 'Sincronizando...' : 'Sembrar Roles y Permisos Semilla'}
              </button>
            )}

            {onSavePermission && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCreatePermModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <Key size={15} /> + Nuevo Permiso
              </button>
            )}

            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleOpenCreateRole}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <Plus size={16} /> Crear Nuevo Rol
            </button>
          </div>
        )}
      </div>

      {/* Alerta de siembra si aún no hay roles en la base de datos */}
      {roles.length === 0 && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px dashed var(--color-primary)',
          borderRadius: 'var(--border-radius-md)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Sparkles size={40} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              No se han encontrado roles en la base de datos
            </h4>
            <p style={{ margin: '0.5rem 0 0 0', maxWidth: '520px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Puedes sembrar automáticamente en Firestore los 3 roles predeterminados (Administrador, Técnico de Taller y Recepcionista) junto con el catálogo completo de permisos base.
            </p>
          </div>
          {onSeedDefaults && canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSeedDefaults}
              disabled={seeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.65rem 1.25rem' }}
            >
              <RefreshCw size={16} className={seeding ? 'animate-spin' : ''} /> {seeding ? 'Sembrando...' : 'Sembrar Roles y Permisos Semilla Ahora'}
            </button>
          )}
        </div>
      )}

      {/* Grid de Tarjetas de Roles */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.25rem' 
        }}
      >
        {roles.map(role => {
          return (
            <div 
              key={role.id} 
              className="glass-card" 
              style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                borderTop: role.id === 'admin' 
                  ? '4px solid var(--color-primary)' 
                  : role.id === 'tecnico' 
                  ? '4px solid #38bdf8' 
                  : role.id === 'recepcion' 
                  ? '4px solid #f59e0b' 
                  : '4px solid var(--border-medium)',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {role.name}
                  </h4>
                  {role.isSystem && (
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '999px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--color-primary)',
                        border: '1px solid rgba(99, 102, 241, 0.25)'
                      }}
                    >
                      Rol Base Sistema
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '1rem', minHeight: '40px' }}>
                  {role.description || 'Sin descripción asignada para este rol.'}
                </p>

                {/* Resumen de permisos */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Permisos habilitados:</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {role.permissions.length} de {permissions.length}
                  </strong>
                </div>

                {/* Etiquetas de módulos activos */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                  {Object.keys(permissionGroups).map(grp => {
                    const count = permissionGroups[grp].filter(p => role.permissions.includes(p.key)).length;
                    if (count === 0) return null;
                    return (
                      <span 
                        key={grp}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        {grp} ({count})
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Botones de acción */}
              {canManage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                  {!role.isSystem && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleDeleteRole(role)}
                      style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      title="Eliminar rol personalizado"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => handleOpenEditRole(role)}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Edit3 size={14} /> Configurar Permisos del Rol
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Crear o Editar Rol */}
      {(editingRole || isCreatingRole) && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} className="text-secondary" />
                {isCreatingRole ? 'Crear Nuevo Rol de Usuario' : `Configurar Rol: ${editingRole?.name}`}
              </h3>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={handleCloseRoleModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', paddingRight: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Datos básicos del Rol */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Nombre del Rol <span className="required-asterisk">*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ej. Supervisor de Calidad, Cajero, Auditor..."
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      required
                      disabled={submitting}
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Descripción del Cargo / Funciones (Opcional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ej. Responsable de verificar la calidad final y entregar equipos a recepción"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Acciones de selección masiva */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Matriz de Permisos Base ({selectedPermissions.length} de {permissions.length})
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedPermissions(permissions.map(p => p.key))}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    >
                      Marcar Todos
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedPermissions([])}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    >
                      Desmarcar Todos
                    </button>
                    {editingRole && DEFAULT_ROLE_PERMISSIONS[editingRole.id] && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectedPermissions([...DEFAULT_ROLE_PERMISSIONS[editingRole.id]])}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--color-primary)' }}
                      >
                        Restablecer Semilla
                      </button>
                    )}
                  </div>
                </div>

                {/* Catálogo de Permisos Agrupados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.keys(permissionGroups).map(grpName => {
                    const groupPerms = permissionGroups[grpName];
                    const allChecked = groupPerms.every(p => selectedPermissions.includes(p.key));
                    const checkedCount = groupPerms.filter(p => selectedPermissions.includes(p.key)).length;

                    return (
                      <div 
                        key={grpName}
                        style={{ 
                          border: '1px solid var(--border-medium)', 
                          borderRadius: 'var(--border-radius-md)', 
                          overflow: 'hidden' 
                        }}
                      >
                        <div 
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: '0.55rem 0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-light)'
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                            {grpName} ({checkedCount}/{groupPerms.length})
                          </span>

                          <button
                            type="button"
                            onClick={() => allChecked ? handleDeselectAllGroup(groupPerms) : handleSelectAllGroup(groupPerms)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--color-primary)', 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              cursor: 'pointer' 
                            }}
                          >
                            {allChecked ? 'Desmarcar sección' : 'Marcar toda la sección'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.4rem' }}>
                          {groupPerms.map(p => {
                            const isChecked = selectedPermissions.includes(p.key);

                            return (
                              <div
                                key={p.key}
                                onClick={() => handleTogglePermission(p.key)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.65rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease'
                                }}
                              >
                                <div style={{ paddingRight: '0.75rem' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: isChecked ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                                    {p.label}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                    {p.description} <code style={{ fontSize: '0.68rem', opacity: 0.7 }}>({p.key})</code>
                                  </div>
                                </div>

                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {!p.isSystem && canManage && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeletePermission(p, e)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-danger)',
                                        opacity: 0.7,
                                        cursor: 'pointer',
                                        padding: '0.2rem',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                      title="Eliminar permiso del catálogo"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                  {isChecked ? (
                                    <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                                  ) : (
                                    <Square size={18} style={{ color: 'var(--text-muted)' }} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseRoleModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Configuración del Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear Nuevo Permiso en Base de Datos */}
      {showCreatePermModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} className="text-secondary" />
                Crear Nuevo Permiso en Base de Datos
              </h3>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setShowCreatePermModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewPermission}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nombre del Permiso <span className="required-asterisk">*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="ej. Exportar Reportes de Ganancias"
                    value={permLabel}
                    onChange={(e) => setPermLabel(e.target.value)}
                    required
                    disabled={submitting}
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Módulo / Grupo <span className="required-asterisk">*</span>
                  </label>
                  <select 
                    className="form-select"
                    value={permGroup}
                    onChange={(e) => setPermGroup(e.target.value)}
                    disabled={submitting}
                  >
                    {existingGroups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="__new__">+ Crear nuevo grupo / módulo...</option>
                  </select>
                </div>

                {permGroup === '__new__' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre del Nuevo Módulo / Grupo</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ej. Auditoría & Reportes"
                      value={permCustomGroup}
                      onChange={(e) => setPermCustomGroup(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Descripción del Permiso</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="ej. Permite descargar balances contables e informes a PDF/Excel"
                    value={permDesc}
                    onChange={(e) => setPermDesc(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px dashed var(--color-primary)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  💡 <strong>Impacto en base de datos:</strong> Este permiso se guardará inmediatamente en Firestore en <code>/app_permissions</code> y estará disponible de inmediato en todos los roles y usuarios.
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreatePermModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Crear y Guardar Permiso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
