import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAuthRepository } from '../InMemoryAuthRepository';

describe('InMemoryAuthRepository', () => {
  let repo: InMemoryAuthRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new InMemoryAuthRepository();
  });

  it('debe permitir iniciar sesión con credenciales demo en desarrollo', async () => {
    const user = await repo.login('admin@entucel.com', 'admin123');
    expect(user).toBeDefined();
    expect(user.email).toBe('admin@entucel.com');
    expect(user.role).toBe('admin');
  });

  it('debe lanzar un error si la contraseña es incorrecta', async () => {
    await expect(repo.login('admin@entucel.com', 'wrongpassword')).rejects.toThrow('Contraseña incorrecta.');
  });

  it('debe lanzar un error si el usuario no existe', async () => {
    await expect(repo.login('nonexistent@entucel.com', '123456')).rejects.toThrow('Usuario no registrado.');
  });

  it('debe registrar el administrador inicial solo si no hay usuarios admin previamente', async () => {
    localStorage.clear(); // Simular base de datos vacía
    const freshRepo = new InMemoryAuthRepository();
    localStorage.setItem('entucel_users', JSON.stringify([]));

    const newAdmin = await freshRepo.setupInitialAdmin('newadmin@entucel.com', 'SecurePass123!', 'Nuevo Admin');
    expect(newAdmin.email).toBe('newadmin@entucel.com');

    // Intento secundario debe ser rechazado
    await expect(
      freshRepo.setupInitialAdmin('anotheradmin@entucel.com', 'SecurePass123!', 'Otro Admin')
    ).rejects.toThrow('El administrador inicial ya ha sido registrado.');
  });
});
