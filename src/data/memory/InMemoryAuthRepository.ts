import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User, UserRole, Permission } from '../../domain/entities/User';

const USERS_KEY = 'entucel_users';
const SESSION_KEY = 'entucel_session';

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin',
    email: 'admin@entucel.com',
    name: 'Carlos Ruiz (Administrador)',
    role: 'admin',
    active: true,
    createdAt: new Date('2026-01-10').toISOString(),
  },
  {
    id: 'usr-tecnico',
    email: 'tecnico@entucel.com',
    name: 'Jorge Mendoza (Técnico)',
    role: 'tecnico',
    active: true,
    createdAt: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'usr-recepcion',
    email: 'recepcion@entucel.com',
    name: 'Lucía Fernández (Recepción)',
    role: 'recepcion',
    active: true,
    createdAt: new Date('2026-03-20').toISOString(),
  }
];

const PASSWORDS: Record<string, string> = import.meta.env.DEV
  ? {
      'admin@entucel.com': 'admin123',
      'tecnico@entucel.com': 'tecnico123',
      'recepcion@entucel.com': 'recepcion123',
    }
  : {};

export class InMemoryAuthRepository implements IAuthRepository {
  constructor() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }

  private getUsers(): User[] {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  private saveUsers(users: User[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async login(email: string, password: string): Promise<User> {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('Usuario no registrado.');
    }

    if (!user.active) {
      throw new Error('Esta cuenta ha sido desactivada.');
    }

    // Validación de contraseñas ficticias
    const expectedPassword = PASSWORDS[user.email] || '123456';
    if (password !== expectedPassword) {
      throw new Error('Contraseña incorrecta.');
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    return JSON.parse(session);
  }

  async resetPassword(email: string): Promise<void> {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Correo no registrado.');
    }
    // Simular envío de correo
    console.log(`Correo de recuperación enviado a: ${email}`);
  }

  async hasUsers(): Promise<boolean> {
    return this.getUsers().length > 0;
  }

  async setupInitialAdmin(email: string, password: string, name: string): Promise<User> {
    const users = this.getUsers();
    
    // Si ya hay usuarios, bloquear setup
    if (users.length > 0 && users.some(u => u.role === 'admin')) {
      throw new Error('El administrador inicial ya ha sido registrado.');
    }

    const newUser: User = {
      id: `usr-${Math.random().toString(36).substring(7)}`,
      email,
      name,
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString(),
    };

    PASSWORDS[email] = password;
    users.push(newUser);
    this.saveUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  }

  async listUsers(): Promise<User[]> {
    return this.getUsers();
  }

  async createUser(email: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string): Promise<User> {
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    const newUser: User = {
      id: `usr-${Math.random().toString(36).substring(7)}`,
      email,
      name,
      role,
      phone,
      gender,
      birthDate,
      active: true,
      createdAt: new Date().toISOString(),
    };

    PASSWORDS[email] = '123456';
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  async toggleUserStatus(userId: string, active: boolean): Promise<void> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const activeUser = await this.getCurrentUser();
      if (activeUser && activeUser.id === userId && !active) {
        throw new Error('No puedes desactivar tu propia cuenta activa.');
      }
      users[userIndex].active = active;
      this.saveUsers(users);
    }
  }

  async updateUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].customPermissions = permissions;
      this.saveUsers(users);
      
      const activeUser = await this.getCurrentUser();
      if (activeUser && activeUser.id === userId) {
        activeUser.customPermissions = permissions;
        localStorage.setItem(SESSION_KEY, JSON.stringify(activeUser));
      }
    }
  }

  async updateUser(userId: string, name: string, role: UserRole, phone?: string, gender?: 'masculino' | 'femenino' | 'otro' | '', birthDate?: string): Promise<void> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].name = name;
      users[userIndex].role = role;
      if (phone !== undefined) users[userIndex].phone = phone;
      if (gender !== undefined) users[userIndex].gender = gender;
      if (birthDate !== undefined) users[userIndex].birthDate = birthDate;
      this.saveUsers(users);

      const activeUser = await this.getCurrentUser();
      if (activeUser && activeUser.id === userId) {
        activeUser.name = name;
        activeUser.role = role;
        if (phone !== undefined) activeUser.phone = phone;
        if (gender !== undefined) activeUser.gender = gender;
        if (birthDate !== undefined) activeUser.birthDate = birthDate;
        localStorage.setItem(SESSION_KEY, JSON.stringify(activeUser));
      }
    }
  }
}
