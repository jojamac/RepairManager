import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { RoleDefinition, DEFAULT_SYSTEM_ROLES } from '../../domain/entities/Role';
import { db } from './config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

export class FirebaseRoleRepository implements IRoleRepository {
  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase Firestore no está inicializado.');
    }
  }

  async listRoles(): Promise<RoleDefinition[]> {
    this.checkFirebase();
    // Primero garantizar que existan los roles semilla si la colección está vacía
    await this.seedDefaultRolesIfEmpty();

    const snapshot = await getDocs(collection(db!, 'roles'));
    const roles: RoleDefinition[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      roles.push({
        id: docSnap.id,
        name: data.name || docSnap.id,
        description: data.description || '',
        isSystem: data.isSystem ?? false,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });

    return roles;
  }

  async getRoleById(roleId: string): Promise<RoleDefinition | null> {
    this.checkFirebase();
    const docRef = doc(db!, 'roles', roleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name || snap.id,
      description: data.description || '',
      isSystem: data.isSystem ?? false,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
    };
  }

  async saveRole(role: RoleDefinition): Promise<RoleDefinition> {
    this.checkFirebase();
    const docRef = doc(db!, 'roles', role.id);
    const payload = {
      name: role.name,
      description: role.description,
      isSystem: role.isSystem ?? false,
      permissions: role.permissions,
      createdAt: role.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return {
      ...role,
      updatedAt: payload.updatedAt,
    };
  }

  async deleteRole(roleId: string): Promise<void> {
    this.checkFirebase();
    const roleDoc = await this.getRoleById(roleId);
    if (roleDoc?.isSystem) {
      throw new Error('No se pueden eliminar los roles base del sistema.');
    }
    await deleteDoc(doc(db!, 'roles', roleId));
  }

  async seedDefaultRolesIfEmpty(force: boolean = false): Promise<RoleDefinition[]> {
    this.checkFirebase();
    const snapshot = await getDocs(collection(db!, 'roles'));
    const existingIds = new Set(snapshot.docs.map(d => d.id));

    // Si no es forzado y ya existen los 3 roles del sistema (admin, tecnico, recepcion), no sobreescribir
    const hasAllSystemRoles = ['admin', 'tecnico', 'recepcion'].every(id => existingIds.has(id));
    if (!force && hasAllSystemRoles) {
      return [];
    }

    const seeded: RoleDefinition[] = [];
    for (const role of DEFAULT_SYSTEM_ROLES) {
      if (force || !existingIds.has(role.id)) {
        const docRef = doc(db!, 'roles', role.id);
        await setDoc(docRef, {
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          permissions: role.permissions,
          createdAt: role.createdAt,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        seeded.push(role);
      }
    }
    return seeded;
  }
}
