import { IServiceOrderRepository } from '../../domain/repositories/IServiceOrderRepository';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { ValidateImeiUseCase } from '../../application/usecases/ValidateImeiUseCase';

const ORDERS_KEY = 'entucel_orders';

const DEFAULT_ORDERS: ServiceOrder[] = [
  {
    id: 'OR-1001',
    clientId: 'CL-88392',
    clientName: 'María Alejandra Gómez',
    clientPhone: '3157654321',
    imei: '862948078392019',
    serial: 'SN-SAM-S21U-8823',
    brand: 'Samsung',
    model: 'Galaxy S21 Ultra',
    reportedFailure: 'Pantalla completamente rota tras caída, no da imagen pero vibra al conectar cargador.',
    technicalDiagnosis: 'Se reemplazó módulo de pantalla AMOLED original y marco intermedio. Se limpiaron residuos internos.',
    status: 'entregado',
    entryDate: '2026-06-01T10:00:00Z',
    deliveryDate: '2026-06-03T16:30:00Z',
    warrantyMonths: 3,
    warrantyEndDate: '2026-09-03T16:30:00Z',
    cost: 750000,
    paymentAdvance: 200000,
    balanceDue: 550000,
    mediaUrls: [
      'https://images.unsplash.com/photo-1601784551144-4b92afef225c?w=500&auto=format&fit=crop&q=60'
    ],
    technicianId: 'usr-tecnico',
    technicianName: 'Jorge Mendoza (Técnico)',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><path d="M 10 15 Q 30 5 50 15 T 90 15" stroke="black" fill="none"/></svg>',
    statusHistory: [
      { status: 'ingresado', date: '2026-06-01T10:00:00Z', updatedBy: 'Lucía Fernández (Recepción)', notes: 'Equipo ingresado con pantalla rota.' },
      { status: 'diagnostico', date: '2026-06-01T14:30:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Se confirma daño de display. Requiere cambio de pantalla original.' },
      { status: 'espera_aprobacion', date: '2026-06-01T15:00:00Z', updatedBy: 'Lucía Fernández (Recepción)', notes: 'Cliente aprueba presupuesto de $750.000 y abona $200.000.' },
      { status: 'reparacion', date: '2026-06-02T09:00:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Inicia instalación del repuesto original.' },
      { status: 'listo', date: '2026-06-02T17:00:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Pruebas táctiles y de brillo superadas con éxito.' },
      { status: 'entregado', date: '2026-06-03T16:30:00Z', updatedBy: 'Lucía Fernández (Recepción)', notes: 'Entrega finalizada. Cliente cancela saldo pendiente y firma garantía.' }
    ]
  },
  {
    id: 'OR-1002',
    clientId: 'CL-39201',
    clientName: 'Juan Fernando Restrepo',
    clientPhone: '3009876543',
    imei: '359182039485762',
    serial: 'SN-APL-IP13-9901',
    brand: 'Apple',
    model: 'iPhone 13 Pro',
    reportedFailure: 'El teléfono no reconoce el cargador ni carga de forma inalámbrica. Sin golpes recientes.',
    technicalDiagnosis: 'Pin de carga sulfatado por humedad. Requiere limpieza química o reemplazo del flex de carga.',
    status: 'reparacion',
    entryDate: '2026-06-14T08:30:00Z',
    warrantyMonths: 6,
    cost: 320000,
    paymentAdvance: 0,
    balanceDue: 320000,
    mediaUrls: [],
    technicianId: 'usr-tecnico',
    technicianName: 'Jorge Mendoza (Técnico)',
    statusHistory: [
      { status: 'ingresado', date: '2026-06-14T08:30:00Z', updatedBy: 'Lucía Fernández (Recepción)', notes: 'Equipo no carga.' },
      { status: 'diagnostico', date: '2026-06-14T11:00:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Pin de carga obstruido y sulfatado. Se intentará limpieza primero.' },
      { status: 'reparacion', date: '2026-06-15T09:30:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Se realiza limpieza química, pero el pin de carga interno está dañado físicamente. Se procederá al reemplazo del flex.' }
    ]
  },
  {
    id: 'OR-1003',
    clientId: 'CL-11029',
    clientName: 'Diana Carolina Hoyos',
    clientPhone: '3124445566',
    imei: '869038291038472',
    serial: 'SN-XIA-RN11-3829',
    brand: 'Xiaomi',
    model: 'Redmi Note 11',
    reportedFailure: 'Se cayó en agua de piscina hace 24 horas. El cliente lo metió en arroz. No enciende.',
    technicalDiagnosis: 'Cortocircuito en la placa principal en la línea de alimentación de la pantalla. Humedad severa.',
    status: 'diagnostico',
    entryDate: '2026-06-15T15:00:00Z',
    warrantyMonths: 0,
    cost: 0,
    paymentAdvance: 0,
    balanceDue: 0,
    mediaUrls: [],
    technicianId: 'usr-tecnico',
    technicianName: 'Jorge Mendoza (Técnico)',
    statusHistory: [
      { status: 'ingresado', date: '2026-06-15T15:00:00Z', updatedBy: 'Lucía Fernández (Recepción)', notes: 'Ingreso por mojado.' },
      { status: 'diagnostico', date: '2026-06-16T10:00:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Equipo desarmado y sumergido en alcohol isopropílico para retirar corrosión. Se detecta corto en placa.' }
    ]
  },
  {
    id: 'OR-1004',
    clientId: 'CL-55428',
    clientName: 'Roberto Carlos Díaz',
    clientPhone: '3205556677',
    imei: '354892019384729',
    serial: 'SN-MOT-E30-1122',
    brand: 'Motorola',
    model: 'Moto Edge 30',
    reportedFailure: 'La batería dura menos de 4 horas de uso continuo y se apaga aleatoriamente en 20%.',
    technicalDiagnosis: 'Desgaste de vida útil de batería (salud al 68%). Se efectúa cambio por batería homologada AAA.',
    status: 'listo',
    entryDate: '2026-06-15T16:45:00Z',
    warrantyMonths: 3,
    cost: 180000,
    paymentAdvance: 180000,
    balanceDue: 0,
    mediaUrls: [],
    technicianId: 'usr-tecnico',
    technicianName: 'Jorge Mendoza (Técnico)',
    statusHistory: [
      { status: 'ingresado', date: '2026-06-15T16:45:00Z', updatedBy: 'Lucía Fernández (Recepción)', notes: 'Cambio de batería solicitado.' },
      { status: 'diagnostico', date: '2026-06-16T08:30:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Se confirma degradación de batería. Repuesto disponible en stock.' },
      { status: 'reparacion', date: '2026-06-16T09:00:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Instalación de batería completada con éxito.' },
      { status: 'listo', date: '2026-06-16T12:00:00Z', updatedBy: 'Jorge Mendoza (Técnico)', notes: 'Pruebas de ciclos de carga y descarga correctas. Listo para entrega.' }
    ]
  }
];

export class InMemoryServiceOrderRepository implements IServiceOrderRepository {
  constructor() {
    if (!localStorage.getItem(ORDERS_KEY)) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(DEFAULT_ORDERS));
    }
  }

  private getOrders(): ServiceOrder[] {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  }

  private saveOrders(orders: ServiceOrder[]) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  async getOrderById(id: string): Promise<ServiceOrder | null> {
    const orders = this.getOrders();
    const order = orders.find(o => o.id.toUpperCase() === id.toUpperCase());
    return order || null;
  }

  async listOrders(): Promise<ServiceOrder[]> {
    return this.getOrders();
  }

  async createOrder(orderData: Omit<ServiceOrder, 'id' | 'entryDate' | 'statusHistory' | 'status'>): Promise<ServiceOrder> {
    const orders = this.getOrders();

    // Validar IMEI si fue provisto
    if (orderData.imei && orderData.imei.trim()) {
      const validator = new ValidateImeiUseCase();
      const validation = validator.execute({
        orders,
        imei: orderData.imei,
        brand: orderData.brand,
        model: orderData.model,
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    // Encontrar número de orden secuencial más alto
    let nextNum = 1005;
    if (orders.length > 0) {
      const nums = orders.map(o => parseInt(o.id.replace('OR-', ''), 10)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }

    const orderId = `OR-${nextNum}`;
    const now = new Date().toISOString();

    const newOrder: ServiceOrder = {
      ...orderData,
      id: orderId,
      entryDate: now,
      status: 'ingresado',
      statusHistory: [
        {
          status: 'ingresado',
          date: now,
          updatedBy: orderData.technicianName || 'Recepción',
          notes: 'Registro inicial del equipo.',
        }
      ]
    };

    orders.push(newOrder);
    this.saveOrders(orders);

    return newOrder;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, notes?: string, updaterName?: string): Promise<ServiceOrder> {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error('Orden de servicio no encontrada.');

    const order = orders[orderIndex];
    const now = new Date().toISOString();

    const updatedHistory = [
      ...order.statusHistory,
      {
        status,
        date: now,
        updatedBy: updaterName || 'Técnico',
        notes: notes || `Cambio de estado a ${status.toUpperCase()}`,
      }
    ];

    const updatedOrder = {
      ...order,
      status,
      statusHistory: updatedHistory
    };

    if (status === 'entregado') {
      updatedOrder.deliveryDate = now;
      if (order.warrantyMonths > 0) {
        const warrantyDate = new Date();
        warrantyDate.setMonth(warrantyDate.getMonth() + order.warrantyMonths);
        updatedOrder.warrantyEndDate = warrantyDate.toISOString();
      }

      updatedOrder.paymentAdvance = order.cost;
      updatedOrder.balanceDue = 0;
    }

    orders[orderIndex] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  }

  async updateOrder(order: ServiceOrder): Promise<ServiceOrder> {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(o => o.id === order.id);
    if (orderIndex === -1) throw new Error('Orden no encontrada');
    
    // Recalcular saldo pendiente
    order.balanceDue = order.cost - order.paymentAdvance;
    
    orders[orderIndex] = order;
    this.saveOrders(orders);
    return order;
  }

  async uploadMedia(_orderId: string, file: File | string): Promise<string> {
    // Si es File (de input), simular la carga y retornar un base64 ficticio o URL estática
    if (typeof file === 'string') {
      return file; // Es dataURI de la firma o foto precargada
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  async searchOrders(queryStr: string): Promise<ServiceOrder[]> {
    const orders = this.getOrders();
    const lowerQuery = queryStr.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(lowerQuery) ||
        o.clientName.toLowerCase().includes(lowerQuery) ||
        o.clientPhone.toLowerCase().includes(lowerQuery) ||
        o.brand.toLowerCase().includes(lowerQuery) ||
        o.model.toLowerCase().includes(lowerQuery) ||
        o.imei.toLowerCase().includes(lowerQuery) ||
        o.serial.toLowerCase().includes(lowerQuery)
    );
  }
}
