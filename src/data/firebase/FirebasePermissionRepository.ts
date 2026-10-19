import { IPermissionRepository } from '../../domain/repositories/IPermissionRepository';
import { PermissionDefinition, SYSTEM_PERMISSIONS_SEED } from '../../domain/entities/PermissionDefinition';
import { db } from './config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

export class FirebasePermissionRepository implements IPermissionRepository {
  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase Firestore no está inicializado.');
    }
  }

  async listPermissions(): Promise<PermissionDefinition[]> {
    this.checkFirebase();
    await this.seedDefaultPermissionsIfEmpty();

    const snapshot = await getDocs(collection(db!, 'app_permissions'));
    const perms: PermissionDefinition[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      perms.push({
        key: docSnap.id,
        label: data.label || docSnap.id,
        group: data.group || 'Otros',
        description: data.description || '',
        isSystem: data.isSystem ?? false,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    return perms;
  }

  async savePermission(perm: PermissionDefinition): Promise<PermissionDefinition> {
    this.checkFirebase();
    const docRef = doc(db!, 'app_permissions', perm.key);
    const payload = {
      label: perm.label,
      group: perm.group,
      description: perm.description,
      isSystem: perm.isSystem ?? false,
      createdAt: perm.createdAt || new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return {
      ...perm,
      createdAt: payload.createdAt,
    };
  }

  async deletePermission(key: string): Promise<void> {
    this.checkFirebase();
    await deleteDoc(doc(db!, 'app_permissions', key));
  }

  async seedDefaultPermissionsIfEmpty(force: boolean = false): Promise<PermissionDefinition[]> {
    this.checkFirebase();
    const snapshot = await getDocs(collection(db!, 'app_permissions'));
    const existingKeys = new Set(snapshot.docs.map(d => d.id));

    // Si no es forzado y todos los permisos semilla ya existen, no hacer nada
    const hasAllSeedPerms = SYSTEM_PERMISSIONS_SEED.every(p => existingKeys.has(p.key));
    if (!force && hasAllSeedPerms) {
      return [];
    }

    const seeded: PermissionDefinition[] = [];
    for (const p of SYSTEM_PERMISSIONS_SEED) {
      if (force || !existingKeys.has(p.key)) {
        const docRef = doc(db!, 'app_permissions', p.key);
        await setDoc(docRef, {
          label: p.label,
          group: p.group,
          description: p.description,
          isSystem: p.isSystem ?? true,
          createdAt: new Date().toISOString(),
        }, { merge: true });
        seeded.push(p);
      }
    }
    return seeded;
  }
}
