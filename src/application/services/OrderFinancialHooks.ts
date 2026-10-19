import { IFinancialRepository } from '../../domain/repositories/IFinancialRepository';
import { IClientRepository } from '../../domain/repositories/IClientRepository';
import { ServiceOrder } from '../../domain/entities/ServiceOrder';

export class OrderFinancialHooks {
  constructor(
    private financeRepo: IFinancialRepository,
    private clientsRepo: IClientRepository
  ) {}

  async onOrderCreated(order: ServiceOrder, createdBy: string): Promise<void> {
    // 1. Registrar abono financiero si existe
    if (order.paymentAdvance > 0) {
      await this.financeRepo.createRecord({
        type: 'ingreso',
        category: 'abono',
        amount: order.paymentAdvance,
        description: `Abono inicial orden ${order.id} - ${order.clientName}`,
        createdBy,
        orderId: order.id,
        clientName: order.clientName,
      });
    }

    // 2. Asociar el equipo al cliente si no existe en su perfil
    try {
      const client = await this.clientsRepo.getClientById(order.clientId);
      if (client) {
        const hasDevice = client.devices.some(
          (d) =>
            d.model.trim().toLowerCase() === order.model.trim().toLowerCase() &&
            d.brand.trim().toLowerCase() === order.brand.trim().toLowerCase()
        );

        if (!hasDevice) {
          const updatedDevices = [
            ...client.devices,
            {
              brand: order.brand,
              model: order.model,
              imei: order.imei,
            },
          ];
          await this.clientsRepo.updateClient({
            ...client,
            devices: updatedDevices,
          });
        }
      }
    } catch {
      // Ignorar si el cliente no existe o falla la actualización
    }
  }

  async onOrderDelivered(order: ServiceOrder, previousBalanceDue: number, updatedBy: string): Promise<void> {
    if (previousBalanceDue > 0) {
      await this.financeRepo.createRecord({
        type: 'ingreso',
        category: 'reparacion',
        amount: previousBalanceDue,
        description: `Pago saldo entrega orden ${order.id} - ${order.clientName}`,
        createdBy: updatedBy,
        orderId: order.id,
        clientName: order.clientName,
      });
    }
  }
}
