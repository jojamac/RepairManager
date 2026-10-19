import { IServiceOrderRepository } from '../../domain/repositories/IServiceOrderRepository';
import { IActivityLogRepository } from '../../domain/repositories/IActivityLogRepository';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { User } from '../../domain/entities/User';
import { ValidateImeiUseCase } from './ValidateImeiUseCase';
import { OrderFinancialHooks } from '../services/OrderFinancialHooks';

export class CreateServiceOrderUseCase {
  constructor(
    private ordersRepo: IServiceOrderRepository,
    private logsRepo: IActivityLogRepository,
    private financialHooks?: OrderFinancialHooks
  ) {}

  async execute(
    orderData: Omit<ServiceOrder, 'id' | 'entryDate' | 'statusHistory' | 'status'>,
    currentUser: User | null
  ): Promise<ServiceOrder> {
    // Validar IMEI explícitamente antes de crear
    if (orderData.imei && orderData.imei.trim()) {
      const existingOrders = await this.ordersRepo.listOrders();
      const validator = new ValidateImeiUseCase();
      const validation = validator.execute({
        orders: existingOrders,
        imei: orderData.imei,
        brand: orderData.brand,
        model: orderData.model,
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    const newOrder = await this.ordersRepo.createOrder(orderData);

    const createdBy = currentUser ? currentUser.name : (orderData.technicianName || 'Recepción');
    if (this.financialHooks) {
      await this.financialHooks.onOrderCreated(newOrder, createdBy);
    }

    if (currentUser) {
      await this.logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREACION_ORDEN',
        `Se registró orden ${newOrder.id} para el cliente ${newOrder.clientName} (Equipo: ${newOrder.brand} ${newOrder.model})`
      );
    }

    return newOrder;
  }
}

export class UpdateOrderStatusUseCase {
  constructor(
    private ordersRepo: IServiceOrderRepository,
    private logsRepo: IActivityLogRepository,
    private financialHooks?: OrderFinancialHooks
  ) {}

  async execute(
    orderId: string,
    status: OrderStatus,
    notes: string | undefined,
    currentUser: User | null
  ): Promise<ServiceOrder> {
    const updaterName = currentUser ? currentUser.name : 'Usuario Técnico';
    const previousOrder = await this.ordersRepo.getOrderById(orderId);
    const previousBalanceDue = previousOrder
      ? (typeof previousOrder.balanceDue === 'number' && previousOrder.balanceDue > 0
          ? previousOrder.balanceDue
          : Math.max(0, (previousOrder.cost || 0) - (previousOrder.paymentAdvance || 0)))
      : 0;

    const updatedOrder = await this.ordersRepo.updateOrderStatus(orderId, status, notes, updaterName);

    if (status === 'entregado' && this.financialHooks) {
      await this.financialHooks.onOrderDelivered(updatedOrder, previousBalanceDue, updaterName);
    }

    if (currentUser) {
      await this.logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'ACTUALIZACION_ESTADO_ORDEN',
        `Orden ${orderId} actualizada a ${status.toUpperCase()}. Notas: ${notes || 'Ninguna'}`
      );
    }

    return updatedOrder;
  }
}

export class UpdateServiceOrderUseCase {
  constructor(
    private ordersRepo: IServiceOrderRepository,
    private logsRepo: IActivityLogRepository
  ) {}

  async execute(order: ServiceOrder, currentUser: User | null): Promise<ServiceOrder> {
    const updated = await this.ordersRepo.updateOrder(order);

    if (currentUser) {
      await this.logsRepo.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'MODIFICACION_ORDEN',
        `Se modificaron detalles técnicos/costo de la orden ${order.id}`
      );
    }

    return updated;
  }
}
