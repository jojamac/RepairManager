import { PermissionDefinition } from '../entities/PermissionDefinition';

export interface IPermissionRepository {
  listPermissions(): Promise<PermissionDefinition[]>;
  savePermission(permission: PermissionDefinition): Promise<PermissionDefinition>;
  deletePermission(key: string): Promise<void>;
  seedDefaultPermissionsIfEmpty(force?: boolean): Promise<PermissionDefinition[]>;
}
