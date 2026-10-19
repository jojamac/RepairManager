import { IPermissionRepository } from '../../domain/repositories/IPermissionRepository';
import { PermissionDefinition, SYSTEM_PERMISSIONS_SEED } from '../../domain/entities/PermissionDefinition';

const STORAGE_KEY = 'entucel_app_permissions';

export class InMemoryPermissionRepository implements IPermissionRepository {
  private getStored(): PermissionDefinition[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SYSTEM_PERMISSIONS_SEED));
      return [...SYSTEM_PERMISSIONS_SEED];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...SYSTEM_PERMISSIONS_SEED];
    }
  }

  private saveStored(perms: PermissionDefinition[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
  }

  async listPermissions(): Promise<PermissionDefinition[]> {
    return this.getStored();
  }

  async savePermission(perm: PermissionDefinition): Promise<PermissionDefinition> {
    const perms = this.getStored();
    const idx = perms.findIndex(p => p.key === perm.key);
    if (idx >= 0) {
      perms[idx] = perm;
    } else {
      perms.push(perm);
    }
    this.saveStored(perms);
    return perm;
  }

  async deletePermission(key: string): Promise<void> {
    const perms = this.getStored();
    const filtered = perms.filter(p => p.key !== key);
    this.saveStored(filtered);
  }

  async seedDefaultPermissionsIfEmpty(force: boolean = false): Promise<PermissionDefinition[]> {
    const perms = this.getStored();
    if (force || perms.length === 0) {
      this.saveStored(SYSTEM_PERMISSIONS_SEED);
      return SYSTEM_PERMISSIONS_SEED;
    }
    return [];
  }
}
