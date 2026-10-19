import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryServiceOrderRepository } from '../InMemoryServiceOrderRepository';

describe('InMemoryServiceOrderRepository', () => {
  let repo: InMemoryServiceOrderRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new InMemoryServiceOrderRepository();
  });

  it('debe listar la lista por defecto de órdenes', async () => {
    const orders = await repo.listOrders();
    expect(orders.length).toBeGreaterThan(0);
  });

  it('debe crear una nueva orden de servicio secuencial', async () => {
    const newOrder = await repo.createOrder({
      clientId: 'CL-999',
      clientName: 'Pedro Infante',
      clientPhone: '3000000000',
      imei: '888888888888888',
      serial: 'SN-TEST',
      brand: 'Motorola',
      model: 'Moto G50',
      reportedFailure: 'Batería inflada',
      technicalDiagnosis: 'Revision requerida',
      cost: 150000,
      paymentAdvance: 50000,
      balanceDue: 100000,
      warrantyMonths: 3,
      mediaUrls: [],
    });

    expect(newOrder.id).toMatch(/^OR-\d+/);
    expect(newOrder.status).toBe('ingresado');
    expect(newOrder.statusHistory.length).toBe(1);
  });

  it('debe actualizar el estado de la orden y calcular garantía si es entregado', async () => {
    const orders = await repo.listOrders();
    const targetOrder = orders[0];

    const updated = await repo.updateOrderStatus(targetOrder.id, 'entregado', 'Entregado a conformidad');
    expect(updated.status).toBe('entregado');
    expect(updated.deliveryDate).toBeDefined();
    if (targetOrder.warrantyMonths > 0) {
      expect(updated.warrantyEndDate).toBeDefined();
    }
  });
});
