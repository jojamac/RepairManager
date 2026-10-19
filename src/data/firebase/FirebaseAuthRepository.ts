import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User, UserRole, Permission } from '../../domain/entities/User';
import { auth, db } from './config';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { DEFAULT_SYSTEM_ROLES } from '../../domain/entities/Role';
import { SYSTEM_PERMISSIONS_SEED } from '../../domain/entities/PermissionDefinition';

export class FirebaseAuthRepository implements IAuthRepository {
  private checkFirebase() {
    if (!auth || !db) {
      throw new Error('Firebase no está configurado. Por favor define las variables de entorno en el archivo .env');
    }
  }

  async login(email: string, password: string): Promise<User> {
    this.checkFirebase();
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const firebaseUser = userCredential.user;
    
    // Buscar rol y nombre en Firestore
    const userDocRef = doc(db!, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('El usuario no está registrado en la base de datos de administración.');
    }
    
    const userData = userDoc.data();
    if (!userData.active) {
      await signOut(auth!);
      throw new Error('Su cuenta ha sido desactivada. Póngase en contacto con el administrador.');
    }
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: userData.name || '',
      role: userData.role as UserRole,
      active: userData.active,
      phone: userData.phone,
      gender: userData.gender,
      birthDate: userData.birthDate,
      customPermissions: userData.customPermissions || undefined,
      createdAt: userData.createdAt || new Date().toISOString(),
    };
  }

  async logout(): Promise<void> {
    this.checkFirebase();
    await signOut(auth!);
  }

  async getCurrentUser(): Promise<User | null> {
    this.checkFirebase();

    return new Promise((resolve) => {
      const unsubscribe = auth!.onAuthStateChanged(async (firebaseUser) => {
        unsubscribe();
        if (!firebaseUser) return resolve(null);
        try {
          const userDocRef = doc(db!, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) return resolve(null);
          const userData = userDoc.data();
          if (!userData.active) return resolve(null);
          resolve({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: userData.name || '',
            role: userData.role as UserRole,
            active: userData.active,
            phone: userData.phone,
            gender: userData.gender,
            birthDate: userData.birthDate,
            customPermissions: userData.customPermissions || undefined,
            createdAt: userData.createdAt || new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error al obtener perfil del usuario en Firestore:', err);
          resolve(null);
        }
      });
    });
  }

  async resetPassword(email: string): Promise<void> {
    this.checkFirebase();
    await sendPasswordResetEmail(auth!, email);
  }

  async hasUsers(): Promise<boolean> {
    this.checkFirebase();

    try {
      // 1. Consultar el documento público de estado neutro /system/status
      const statusDocRef = doc(db!, 'system', 'status');
      const statusDoc = await getDoc(statusDocRef);

      if (statusDoc.exists()) {
        const data = statusDoc.data();
        return !!data.initialized;
      }

      // 2. Si /system/status no existe, consultar la colección /users
      const querySnapshot = await getDocs(collection(db!, 'users'));
      const exists = !querySnapshot.empty;

      if (exists) {
        await setDoc(statusDocRef, { initialized: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }

      return exists;
    } catch (error: any) {
      console.warn('hasUsers: Error al consultar estado en Firestore:', error.message || error);
      // Si la colección o documento no existen o da permiso denegado en /users no autenticado,
      // retornamos false para permitir que el administrador inicial se registre.
      return false;
    }
  }

  async setupInitialAdmin(email: string, password: string, name: string): Promise<User> {
    this.checkFirebase();
    
    const usersExist = await this.hasUsers();
    if (usersExist) {
      throw new Error('El administrador inicial ya ha sido registrado.');
    }

    // Crear credenciales en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const newUid = userCredential.user.uid;

    const newUser: User = {
      id: newUid,
      email,
      name,
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString(),
    };

    // Registrar perfil del usuario en Firestore
    await setDoc(doc(db!, 'users', newUid), {
      email,
      name,
      role: 'admin',
      active: true,
      createdAt: newUser.createdAt,
    });

    // Marcar el sistema como inicializado en el documento neutro público /system/status
    const statusDocRef = doc(db!, 'system', 'status');
    await setDoc(statusDocRef, {
      initialized: true,
      initializedAt: new Date().toISOString(),
      initialAdminUid: newUid
    });

    // Sembrar automáticamente los roles por defecto en /roles
    try {
      for (const r of DEFAULT_SYSTEM_ROLES) {
        await setDoc(doc(db!, 'roles', r.id), {
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          permissions: r.permissions,
          createdAt: r.createdAt,
        }, { merge: true });
      }

      // Sembrar catálogo de permisos en /app_permissions
      for (const p of SYSTEM_PERMISSIONS_SEED) {
        await setDoc(doc(db!, 'app_permissions', p.key), {
          label: p.label,
          group: p.group,
          description: p.description,
          isSystem: p.isSystem ?? true,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (seedErr) {
      console.warn('Advertencia al sembrar roles y permisos iniciales:', seedErr);
    }

    return newUser;
  }

  async listUsers(): Promise<User[]> {
    this.checkFirebase();
    const querySnapshot = await getDocs(collection(db!, 'users'));
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        id: docSnap.id,
        email: data.email || '',
        name: data.name || '',
        role: data.role as UserRole,
        active: data.active,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate,
        customPermissions: data.customPermissions || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    return users;
  }

  async createUser(email: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string): Promise<User> {
    this.checkFirebase();
    
    const tempPassword = 'UserTemp2026!';
    const userCredential = await createUserWithEmailAndPassword(auth!, email, tempPassword);
    const newUid = userCredential.user.uid;
    
    const newUser: User = {
      id: newUid,
      email,
      name,
      role,
      phone,
      gender,
      birthDate,
      active: true,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(doc(db!, 'users', newUid), {
      email,
      name,
      role,
      phone: phone || '',
      gender: gender || '',
      birthDate: birthDate || '',
      active: true,
      createdAt: newUser.createdAt,
    });
    
    return newUser;
  }

  async toggleUserStatus(userId: string, active: boolean): Promise<void> {
    this.checkFirebase();
    const userDocRef = doc(db!, 'users', userId);
    await updateDoc(userDocRef, { active });
  }

  async updateUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
    this.checkFirebase();
    const userDocRef = doc(db!, 'users', userId);
    await updateDoc(userDocRef, { customPermissions: permissions });
  }

  async updateUser(userId: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string): Promise<void> {
    this.checkFirebase();
    const userDocRef = doc(db!, 'users', userId);
    const payload: Record<string, any> = { name, role };
    if (phone !== undefined) payload.phone = phone;
    if (gender !== undefined) payload.gender = gender;
    if (birthDate !== undefined) payload.birthDate = birthDate;
    await updateDoc(userDocRef, payload);
  }
}
