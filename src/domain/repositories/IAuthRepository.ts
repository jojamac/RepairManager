import { User, UserRole, Permission } from '../entities/User';

export interface LoginResponse {
  user: User;
  token?: string;
}

export interface IAuthRepository {
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  resetPassword(email: string): Promise<void>;
  hasUsers(): Promise<boolean>;
  setupInitialAdmin(email: string, password: string, name: string): Promise<User>;
  
  // Gestión de usuarios y permisos (Admin only)
  listUsers(): Promise<User[]>;
  createUser(email: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string): Promise<User>;
  toggleUserStatus(userId: string, active: boolean): Promise<void>;
  updateUserPermissions(userId: string, permissions: Permission[]): Promise<void>;
  updateUser(userId: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string): Promise<void>;
}
