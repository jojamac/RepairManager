export type UserRole = string;

export type Permission = string;

export interface CustomPermissionDefinition {
  key: string;
  label: string;
  group: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  phone?: string;
  gender?: 'masculino' | 'femenino' | 'otro' | '';
  birthDate?: string;
  customPermissions?: Permission[];
}

// Configuración de Permisos por Defecto para cada Rol
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_dashboard',
    'view_dashboard_metrics',
    'view_technician_kanban',
    'view_reception_dashboard',
    'view_orders',
    'create_order',
    'update_order_status',
    'edit_order_details',
    'deliver_order',
    'view_clients',
    'manage_clients',
    'view_users',
    'manage_users',
    'view_finance',
    'manage_finance',
    'manage_settings',
  ],
  tecnico: [
    'view_dashboard',
    'view_technician_kanban',
    'view_orders',
    'update_order_status',
    'edit_order_details',
    'view_clients',
  ],
  recepcion: [
    'view_dashboard',
    'view_reception_dashboard',
    'view_orders',
    'create_order',
    'update_order_status',
    'deliver_order',
    'view_clients',
    'manage_clients',
  ],
};

// Función de Utilidad de Dominio para verificar si un usuario tiene un permiso específico
export const hasPermission = (
  user: User | null, 
  permission: Permission, 
  dynamicRolePermissions?: Record<string, Permission[]>
): boolean => {
  if (!user || !user.active) return false;
  
  // Si el usuario es admin y no tiene restricciones explícitas, tiene acceso total
  if (user.role === 'admin' && (!user.customPermissions || user.customPermissions.length === 0)) {
    return true;
  }

  // Si tiene permisos personalizados asignados explícitamente, evaluarlos primero
  if (user.customPermissions && user.customPermissions.length > 0) {
    return user.customPermissions.includes(permission);
  }
  
  // Si no, tomar la lista de permisos asignada a su Rol dinámico o por defecto
  const roleMap = dynamicRolePermissions || DEFAULT_ROLE_PERMISSIONS;
  const rolePerms = roleMap[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  return rolePerms.includes(permission);
};
