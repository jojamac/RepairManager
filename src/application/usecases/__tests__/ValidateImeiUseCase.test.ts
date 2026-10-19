import { describe, it, expect } from 'vitest';
import { ValidateImeiUseCase } from '../ValidateImeiUseCase';
import { ServiceOrder } from '../../../domain/entities/ServiceOrder';

describe('ValidateImeiUseCase', () => {
  const validator = new ValidateImeiUseCase();

  const mockOrders: ServiceOrder[] = [
    {
      id: 'OR-1001',
      clientId: 'CL-1',
      clientName: 'Juan Perez',
      clientPhone: '3001234567',
      imei: '123456789012345',
      serial: 'SN-001',
      brand: 'Samsung',
      model: 'Galaxy S21',
      reportedFailure: 'Pantalla rota',
      technicalDiagnosis: '',
      status: 'entregado',
      entryDate: '2026-01-01T00:00:00Z',
      warrantyMonths: 3,
      cost: 100000,
      paymentAdvance: 100000,
      balanceDue: 0,
      mediaUrls: [],
      statusHistory: [],
    },
    {
      id: 'OR-1002',
      clientId: 'CL-2',
      clientName: 'Maria Gomez',
      clientPhone: '3007654321',
      imei: '987654321098765',
      serial: 'SN-002',
      brand: 'Apple',
      model: 'iPhone 13',
      reportedFailure: 'Batería inflada',
      technicalDiagnosis: '',
      status: 'reparacion',
      entryDate: '2026-02-01T00:00:00Z',
      warrantyMonths: 6,
      cost: 200000,
      paymentAdvance: 50000,
      balanceDue: 150000,
      mediaUrls: [],
      statusHistory: [],
    },
  ];

  it('debe validar exitosamente cuando el IMEI está vacío o es nulo', () => {
    const result = validator.execute({ orders: mockOrders, imei: '' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('debe rechazar la creación si existe una orden ACTIVA no entregada con el mismo IMEI', () => {
    const result = validator.execute({
      orders: mockOrders,
      imei: '987654321098765',
      brand: 'Apple',
      model: 'iPhone 13',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('ya tiene una orden activa');
  });

  it('debe rechazar la creación si el IMEI fue registrado previamente con marca o modelo diferente', () => {
    const result = validator.execute({
      orders: mockOrders,
      imei: '123456789012345',
      brand: 'Xiaomi',
      model: 'Redmi Note 10',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('está registrado previamente con otra marca/modelo');
  });

  it('debe permitir la creación si la orden previa está entregada y la marca/modelo coinciden', () => {
    const result = validator.execute({
      orders: mockOrders,
      imei: '123456789012345',
      brand: 'Samsung',
      model: 'Galaxy S21',
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
