import { Permission } from './User';

export interface RoleDefinition {
  id: string; // ej. 'admin', 'tecnico', 'recepcion', o slug personalizado 'cajero'
  name: string; // ej. 'Administrador', 'Técnico de Laboratorio'
  description: string;
  isSystem: boolean; // true si es rol base del sistema (no eliminable)
  permissions: Permission[];
  createdAt: string;
  updatedAt?: string;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  group: string;
  description: string;
}

// Semilla inicial obligatoria para el primer inicio / reseteo
export const DEFAULT_SYSTEM_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso total y control maestro de todos los módulos, finanzas, personal y configuración.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: [
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
  },
  {
    id: 'tecnico',
    name: 'Técnico de Taller',
    description: 'Diagnóstico técnico, actualización de gemelo digital, pruebas de calidad y reparación de equipos hasta estado listo.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: [
      'view_dashboard',
      'view_technician_kanban',
      'view_orders',
      'update_order_status',
      'edit_order_details',
      'view_clients',
    ],
  },
  {
    id: 'recepcion',
    name: 'Recepcionista',
    description: 'Atención en mostrador, recepción de nuevos equipos, contacto WhatsApp con clientes y liquidación/entrega final.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    permissions: [
      'view_dashboard',
      'view_reception_dashboard',
      'view_orders',
      'create_order',
      'update_order_status',
      'deliver_order',
      'view_clients',
      'manage_clients',
    ],
  },
];
