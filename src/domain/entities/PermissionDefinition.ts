export interface PermissionDefinition {
  key: string; // ej. 'view_orders', 'export_reports'
  label: string; // ej. 'Consultar Órdenes de Servicio'
  group: string; // ej. 'Taller & Órdenes', 'Reportes'
  description: string;
  isSystem?: boolean; // true si es permiso nativo del sistema
  createdAt?: string;
}

// Catálogo semilla por defecto para inicializar la colección /app_permissions
export const SYSTEM_PERMISSIONS_SEED: PermissionDefinition[] = [
  // Dashboard & Vistas
  {
    key: 'view_dashboard',
    label: 'Acceso General al Panel',
    group: 'Dashboard',
    description: 'Permite ingresar al módulo del panel principal de control.',
    isSystem: true,
  },
  {
    key: 'view_reception_dashboard',
    label: 'Panel Operativo de Mostrador',
    group: 'Dashboard',
    description: 'Vista de mostrador: equipos por retirar, cobros pendientes y cotizaciones WhatsApp.',
    isSystem: true,
  },
  {
    key: 'view_dashboard_metrics',
    label: 'Métricas y Gráficos Financieros',
    group: 'Dashboard',
    description: 'Visualizar balances de caja, facturación histórica y métricas globales del taller.',
    isSystem: true,
  },
  {
    key: 'view_technician_kanban',
    label: 'Tablero Kanban de Taller',
    group: 'Dashboard',
    description: 'Gestión visual de equipos en diagnóstico, reparación y listos para técnicos.',
    isSystem: true,
  },

  // Taller & Órdenes
  {
    key: 'view_orders',
    label: 'Consultar Órdenes de Servicio',
    group: 'Taller & Órdenes',
    description: 'Ver el listado de reparaciones y fichas de recepción de clientes.',
    isSystem: true,
  },
  {
    key: 'create_order',
    label: 'Crear Nuevas Órdenes',
    group: 'Taller & Órdenes',
    description: 'Ingresar nuevos equipos al taller y emitir tiquetes físicos o digitales.',
    isSystem: true,
  },
  {
    key: 'update_order_status',
    label: 'Cambiar Estados de Reparación',
    group: 'Taller & Órdenes',
    description: 'Mover órdenes entre diagnóstico, reparación y listo en laboratorio.',
    isSystem: true,
  },
  {
    key: 'edit_order_details',
    label: 'Modificar Presupuestos y Diagnósticos',
    group: 'Taller & Órdenes',
    description: 'Asignar costos, editar componentes 3D y piezas dañadas del equipo.',
    isSystem: true,
  },
  {
    key: 'deliver_order',
    label: 'Liquidar y Entregar al Cliente',
    group: 'Taller & Órdenes',
    description: 'Entregar el dispositivo al cliente en mostrador y registrar cobro/liquidación final.',
    isSystem: true,
  },

  // Clientes (CRM)
  {
    key: 'view_clients',
    label: 'Consultar Clientes (Directorio)',
    group: 'CRM Clientes',
    description: 'Buscar clientes del taller, ver sus teléfonos y su historial de equipos reparados.',
    isSystem: true,
  },
  {
    key: 'manage_clients',
    label: 'Registrar y Editar Clientes',
    group: 'CRM Clientes',
    description: 'Crear fichas de nuevos clientes y modificar sus datos de contacto.',
    isSystem: true,
  },

  // Finanzas & Caja
  {
    key: 'view_finance',
    label: 'Consultar Módulo Financiero',
    group: 'Finanzas',
    description: 'Ver ingresos, gastos y movimientos de caja diaria del negocio.',
    isSystem: true,
  },
  {
    key: 'manage_finance',
    label: 'Registrar Ingresos y Egresos',
    group: 'Finanzas',
    description: 'Crear transacciones financieras y arqueos de caja diaria.',
    isSystem: true,
  },

  // Personal & Accesos
  {
    key: 'view_users',
    label: 'Ver Nómina de Empleados',
    group: 'Personal & Accesos',
    description: 'Consultar la lista del personal interno (técnicos, recepcionistas, administradores).',
    isSystem: true,
  },
  {
    key: 'manage_users',
    label: 'Gestionar Cuentas y Permisos',
    group: 'Personal & Accesos',
    description: 'Crear empleados, otorgar accesos al sistema, cambiar contraseñas y asignar roles.',
    isSystem: true,
  },
  {
    key: 'manage_settings',
    label: 'Configuración del Taller',
    group: 'Personal & Accesos',
    description: 'Editar logotipo, NIT, nombre comercial y preferencias globales del sistema.',
    isSystem: true,
  },
];
