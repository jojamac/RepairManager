import { ServiceOrder, OrderStatus } from '../entities/ServiceOrder';

export interface IServiceOrderRepository {
  getOrderById(id: string): Promise<ServiceOrder | null>;
  listOrders(): Promise<ServiceOrder[]>;
  createOrder(orderData: Omit<ServiceOrder, 'id' | 'entryDate' | 'statusHistory' | 'status'>): Promise<ServiceOrder>;
  updateOrderStatus(orderId: string, status: OrderStatus, notes?: string, updaterName?: string): Promise<ServiceOrder>;
  updateOrder(order: ServiceOrder): Promise<ServiceOrder>;
  uploadMedia(orderId: string, file: File | string): Promise<string>; // Soporta File de input o base64
  searchOrders(query: string): Promise<ServiceOrder[]>;
}
