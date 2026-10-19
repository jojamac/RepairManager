export type FinanceType = 'ingreso' | 'egreso';
export type FinanceCategory = 'reparacion' | 'abono' | 'repuesto' | 'servicio' | 'otros' | 'nomina' | 'alquiler';

export interface FinanceRecord {
  id: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  orderId?: string; // Vinculación a orden de servicio si aplica
  isQuote?: boolean; // True si es una cotización y no una transacción real
  clientName?: string; // Para cotizaciones o abonos
}
