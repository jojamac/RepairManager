export type OrderStatus = 'ingresado' | 'diagnostico' | 'espera_aprobacion' | 'reparacion' | 'listo' | 'entregado';

export interface StatusHistoryEntry {
  status: OrderStatus;
  date: string;
  updatedBy: string;
  notes?: string;
}

export interface ServiceOrder {
  id: string; // Código único de orden (ej. OR-1001)
  clientId: string;
  clientName: string;
  clientPhone: string;
  imei: string;
  serial: string;
  brand: string;
  model: string;
  reportedFailure: string;
  technicalDiagnosis: string;
  laborCost?: number;
  status: OrderStatus;
  entryDate: string;
  deliveryDate?: string;
  warrantyMonths: number;
  warrantyEndDate?: string;
  cost: number;
  paymentAdvance: number; // Abono realizado
  balanceDue: number; // Resto por pagar
  signatureUrl?: string; // Firma digital del cliente
  mediaUrls: string[]; // Registro fotográfico/video inicial de recepción
  repairMediaUrls?: string[]; // Evidencias fotográficas de reparación y funcionamiento (máx 3)
  technicianId?: string;
  technicianName?: string;
  statusHistory: StatusHistoryEntry[];
  securityLockType?: 'none' | 'pin' | 'pattern';
  securityLockCode?: string;
  securityLockPattern?: number[]; // Secuencia de nodos del patrón 3x3 (ej. [0, 1, 2, 4, 6, 7, 8])
}
