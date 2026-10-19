import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { RoleDefinition, DEFAULT_SYSTEM_ROLES } from '../../domain/entities/Role';

const STORAGE_KEY = 'entucel_roles';

export class InMemoryRoleRepository implements IRoleRepository {
  private getStoredRoles(): RoleDefinition[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_ROLES));
      return [...DEFAULT_SYSTEM_ROLES];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...DEFAULT_SYSTEM_ROLES];
    }
  }

  private saveStoredRoles(roles: RoleDefinition[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  }

  async listRoles(): Promise<RoleDefinition[]> {
    return this.getStoredRoles();
  }

  async getRoleById(roleId: string): Promise<RoleDefinition | null> {
    const roles = this.getStoredRoles();
    return roles.find(r => r.id === roleId) || null;
  }

  async saveRole(role: RoleDefinition): Promise<RoleDefinition> {
    const roles = this.getStoredRoles();
    const idx = roles.findIndex(r => r.id === role.id);
    const updated = { ...role, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      roles[idx] = updated;
    } else {
      roles.push(updated);
    }
    this.saveStoredRoles(roles);
    return updated;
  }

  async deleteRole(roleId: string): Promise<void> {
    const roles = this.getStoredRoles();
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      throw new Error('No se pueden eliminar los roles base del sistema.');
    }
    const filtered = roles.filter(r => r.id !== roleId);
    this.saveStoredRoles(filtered);
  }

  async seedDefaultRolesIfEmpty(force: boolean = false): Promise<RoleDefinition[]> {
    const roles = this.getStoredRoles();
    if (force || roles.length === 0) {
      this.saveStoredRoles(DEFAULT_SYSTEM_ROLES);
      return DEFAULT_SYSTEM_ROLES;
    }
    return [];
  }
}
