import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission, hasPermission } from '../domain/entities/User';
import { useRepositories } from './RepositoryContext';

import { RoleDefinition } from '../domain/entities/Role';
import { PermissionDefinition } from '../domain/entities/PermissionDefinition';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  users: User[];
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
  hasUsers: boolean | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createUser: (email: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string) => Promise<User>;
  toggleUserStatus: (userId: string, active: boolean) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: Permission[]) => Promise<void>;
  updateUser: (userId: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string) => Promise<void>;
  loadUsers: () => Promise<void>;
  loadRoles: () => Promise<RoleDefinition[]>;
  saveRole: (role: RoleDefinition) => Promise<RoleDefinition>;
  deleteRole: (roleId: string) => Promise<void>;
  loadPermissions: () => Promise<PermissionDefinition[]>;
  savePermission: (permission: PermissionDefinition) => Promise<PermissionDefinition>;
  deletePermission: (key: string) => Promise<void>;
  seedSystemDefaults: (force?: boolean) => Promise<void>;
  setupInitialAdmin: (email: string, password: string, name: string) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authRepo, logsRepo, rolesRepo, permissionsRepo } = useRepositories();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  // Verificar sesión activa al montar y si hay usuarios en la DB
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const user = await authRepo.getCurrentUser();
        setCurrentUser(user);
        
        const exists = await authRepo.hasUsers();
        setHasUsers(exists);
      } catch (err: any) {
        console.error('Error al verificar sesión/usuarios:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [authRepo]);

  const setupInitialAdmin = async (email: string, password: string, name: string): Promise<User> => {
    setError(null);
    try {
      const user = await authRepo.setupInitialAdmin(email, password, name);
      setCurrentUser(user);
      setHasUsers(true);
      await logsRepo.logAction(
        user.id,
        user.name,
        user.role,
        'SETUP_ADMIN_INICIAL',
        `Instalación: se registró el administrador inicial del taller: ${name}`
      );
      return user;
    } catch (err: any) {
      const errMsg = err.message || 'Error al registrar administrador inicial.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setError(null);
    try {
      const user = await authRepo.login(email, password);
      setCurrentUser(user);
      try {
        await logsRepo.logAction(
          user.id,
          user.name,
          user.role,
          'INICIO_SESION',
          `Inicio de sesión exitoso desde el frontend`
        );
      } catch (logErr) {
        console.warn('No se pudo registrar log de inicio de sesión:', logErr);
      }
      return user;
    } catch (err: any) {
      const errMsg = err.message || 'Error al iniciar sesión.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'CERRAR_SESION',
          `Cierre de sesión manual`
        );
      } catch (err) {
        console.error('Error al registrar log de salida:', err);
      }
    }
    try {
      await authRepo.logout();
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err);
      setCurrentUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await authRepo.resetPassword(email);
    } catch (err: any) {
      const errMsg = err.message || 'Error al enviar correo de recuperación.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const loadUsers = useCallback(async () => {
    if (!currentUser || !hasPermission(currentUser, 'view_users')) return;
    try {
      const userList = await authRepo.listUsers();
      setUsers(userList);
    } catch (err: any) {
      console.error('Error al listar usuarios:', err);
      // Si las reglas de Firestore aún no se han desplegado o niegan permiso, evitar crash en UI
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        setError('No tienes permisos de base de datos para listar usuarios o las reglas de Firestore requieren actualización.');
      } else {
        setError(err?.message || 'Error al listar usuarios');
      }
    }
  }, [authRepo, currentUser]);

  const createUser = async (email: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string) => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada.');
    }
    setError(null);
    try {
      const newUser = await authRepo.createUser(email, name, role, phone, gender, birthDate);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREACION_USUARIO',
        `Se creó el usuario ${name} (${email}) con el rol ${role.toUpperCase()}`
      );
      await loadUsers();
      return newUser;
    } catch (err: any) {
      const errMsg = err.message || 'Error al crear usuario.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const toggleUserStatus = async (userId: string, active: boolean) => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada.');
    }
    setError(null);
    try {
      await authRepo.toggleUserStatus(userId, active);
      const actionText = active ? 'ACTIVACION_USUARIO' : 'DESACTIVACION_USUARIO';
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        actionText,
        `Se modificó el estado del usuario ID: ${userId} a ${active ? 'ACTIVO' : 'INACTIVO'}`
      );
      await loadUsers();
    } catch (err: any) {
      const errMsg = err.message || 'Error al cambiar estado del usuario.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const updateUserPermissions = async (userId: string, permissions: Permission[]) => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada.');
    }
    setError(null);
    try {
      await authRepo.updateUserPermissions(userId, permissions);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'ACTUALIZACION_PERMISOS',
        `Se actualizaron los permisos personalizados para el usuario ID: ${userId}`
      );
      await loadUsers();
      // Si el usuario modificado es el actual, refrescar sesión local
      if (currentUser.id === userId) {
        const updated = await authRepo.getCurrentUser();
        setCurrentUser(updated);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error al actualizar permisos del usuario.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const loadRoles = useCallback(async (): Promise<RoleDefinition[]> => {
    try {
      const list = await rolesRepo.listRoles();
      setRoles(list);
      return list;
    } catch (err: any) {
      console.warn('Error al cargar roles del sistema:', err);
      return [];
    }
  }, [rolesRepo]);

  const saveRole = async (roleToSave: RoleDefinition): Promise<RoleDefinition> => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada para modificar roles.');
    }
    setError(null);
    try {
      const saved = await rolesRepo.saveRole(roleToSave);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'GUARDAR_ROL',
        `Se guardó la configuración del rol: "${roleToSave.name}" (${roleToSave.id})`
      );
      await loadRoles();
      return saved;
    } catch (err: any) {
      const errMsg = err.message || 'Error al guardar rol.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const deleteRole = async (roleId: string): Promise<void> => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada para eliminar roles.');
    }
    setError(null);
    try {
      await rolesRepo.deleteRole(roleId);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'ELIMINAR_ROL',
        `Se eliminó el rol personalizado: ${roleId}`
      );
      await loadRoles();
    } catch (err: any) {
      const errMsg = err.message || 'Error al eliminar rol.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const loadPermissions = useCallback(async (): Promise<PermissionDefinition[]> => {
    try {
      const list = await permissionsRepo.listPermissions();
      setPermissions(list);
      return list;
    } catch (err: any) {
      console.warn('Error al cargar catálogo de permisos:', err);
      return [];
    }
  }, [permissionsRepo]);

  const seedSystemDefaults = useCallback(async (force: boolean = false): Promise<void> => {
    setError(null);
    try {
      await rolesRepo.seedDefaultRolesIfEmpty(force);
      await permissionsRepo.seedDefaultPermissionsIfEmpty(force);
      await loadRoles();
      await loadPermissions();
      if (currentUser) {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'SEMBRAR_ROLES_PERMISOS',
          `Sincronización de roles y permisos del sistema en la base de datos (force=${force})`
        );
      }
    } catch (err: any) {
      console.warn('Error al sembrar roles y permisos iniciales:', err);
      const errMsg = err.message || 'Error al sembrar roles y permisos iniciales.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  }, [rolesRepo, permissionsRepo, loadRoles, loadPermissions, currentUser, logsRepo]);

  // Cargar roles y permisos al autenticarse cualquier usuario, sembrando automáticamente si es admin y están vacíos
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin' || hasPermission(currentUser, 'manage_users')) {
        rolesRepo.seedDefaultRolesIfEmpty(false)
          .then(() => permissionsRepo.seedDefaultPermissionsIfEmpty(false))
          .then(() => {
            loadRoles();
            loadPermissions();
          })
          .catch((err) => {
            console.warn('Aviso sembrando roles/permisos automáticamente:', err);
            loadRoles();
            loadPermissions();
          });
      } else {
        loadRoles();
        loadPermissions();
      }
    }
  }, [currentUser, loadRoles, loadPermissions, rolesRepo, permissionsRepo]);

  const savePermission = async (permToSave: PermissionDefinition): Promise<PermissionDefinition> => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada para modificar el catálogo de permisos.');
    }
    setError(null);
    try {
      const saved = await permissionsRepo.savePermission(permToSave);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREAR_PERMISO',
        `Se registró el nuevo permiso en sistema: "${permToSave.label}" (${permToSave.key})`
      );
      await loadPermissions();
      return saved;
    } catch (err: any) {
      const errMsg = err.message || 'Error al guardar permiso.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const deletePermission = async (key: string): Promise<void> => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada para eliminar permisos.');
    }
    setError(null);
    try {
      await permissionsRepo.deletePermission(key);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'ELIMINAR_PERMISO',
        `Se eliminó el permiso del sistema: ${key}`
      );
      await loadPermissions();
    } catch (err: any) {
      const errMsg = err.message || 'Error al eliminar permiso.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const updateUser = async (userId: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string) => {
    if (!currentUser || !hasPermission(currentUser, 'manage_users')) {
      throw new Error('Operación no autorizada.');
    }
    setError(null);
    try {
      await authRepo.updateUser(userId, name, role, phone, gender, birthDate);
      await logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'EDICION_USUARIO',
        `Se actualizaron los datos del usuario ${name} (Rol: ${role.toUpperCase()})`
      );
      await loadUsers();
      if (currentUser.id === userId) {
        const updated = await authRepo.getCurrentUser();
        setCurrentUser(updated);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error al actualizar usuario.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        users,
        roles,
        permissions,
        hasUsers,
        login,
        logout,
        resetPassword,
        createUser,
        toggleUserStatus,
        updateUserPermissions,
        updateUser,
        loadUsers,
        loadRoles,
        saveRole,
        deleteRole,
        loadPermissions,
        savePermission,
        deletePermission,
        seedSystemDefaults,
        setupInitialAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
