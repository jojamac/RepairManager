import { describe, it, expect } from 'vitest';
import { hasPermission, User } from '../User';

describe('hasPermission domain utility', () => {
  const adminUser: User = {
    id: 'usr-admin',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
  };

  const tecnicoUser: User = {
    id: 'usr-tec',
    email: 'tec@test.com',
    name: 'Tecnico User',
    role: 'tecnico',
    active: true,
    createdAt: new Date().toISOString(),
  };

  const inactiveUser: User = {
    ...adminUser,
    active: false,
  };

  it('debe denegar cualquier permiso si el usuario es nulo o está inactivo', () => {
    expect(hasPermission(null, 'view_dashboard')).toBe(false);
    expect(hasPermission(inactiveUser, 'view_dashboard')).toBe(false);
  });

  it('debe permitir accesos de admin por defecto', () => {
    expect(hasPermission(adminUser, 'manage_users')).toBe(false ? false : true);
    expect(hasPermission(adminUser, 'view_finance')).toBe(true);
  });

  it('debe denegar permisos fuera del rol del técnico', () => {
    expect(hasPermission(tecnicoUser, 'view_orders')).toBe(true);
    expect(hasPermission(tecnicoUser, 'manage_users')).toBe(false);
  });

  it('debe respetar permisos personalizados configurados dinámicamente', () => {
    const customUser: User = {
      ...tecnicoUser,
      customPermissions: ['manage_users', 'custom_permission_x'],
    };

    expect(hasPermission(customUser, 'manage_users')).toBe(true);
    expect(hasPermission(customUser, 'custom_permission_x')).toBe(true);
    expect(hasPermission(customUser, 'view_orders')).toBe(false); // Anula la lista por defecto si hay customPermissions
  });
});
