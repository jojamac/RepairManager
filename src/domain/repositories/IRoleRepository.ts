import { RoleDefinition } from '../entities/Role';

export interface IRoleRepository {
  listRoles(): Promise<RoleDefinition[]>;
  getRoleById(roleId: string): Promise<RoleDefinition | null>;
  saveRole(role: RoleDefinition): Promise<RoleDefinition>;
  deleteRole(roleId: string): Promise<void>;
  seedDefaultRolesIfEmpty(force?: boolean): Promise<RoleDefinition[]>;
}
