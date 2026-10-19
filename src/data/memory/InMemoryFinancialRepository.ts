import { IFinancialRepository, FinancialSummary } from '../../domain/repositories/IFinancialRepository';
import { FinanceRecord } from '../../domain/entities/Finance';

const TRANSACTIONS_KEY = 'entucel_transactions';

const DEFAULT_TRANSACTIONS: FinanceRecord[] = [
  {
    id: 'TR-1001',
    type: 'ingreso',
    category: 'abono',
    amount: 200000,
    description: 'Abono inicial orden OR-1001 - María Alejandra Gómez',
    date: '2026-06-01T10:05:00Z',
    createdBy: 'Lucía Fernández (Recepción)',
    orderId: 'OR-1001',
    clientName: 'María Alejandra Gómez'
  },
  {
    id: 'TR-1002',
    type: 'ingreso',
    category: 'reparacion',
    amount: 550000,
    description: 'Pago saldo de entrega orden OR-1001 - Display S21 Ultra',
    date: '2026-06-03T16:35:00Z',
    createdBy: 'Lucía Fernández (Recepción)',
    orderId: 'OR-1001',
    clientName: 'María Alejandra Gómez'
  },
  {
    id: 'TR-1003',
    type: 'egreso',
    category: 'repuesto',
    amount: 320000,
    description: 'Compra de módulo de pantalla Samsung S21 Ultra original',
    date: '2026-06-02T11:00:00Z',
    createdBy: 'Carlos Ruiz (Administrador)',
  },
  {
    id: 'TR-1004',
    type: 'egreso',
    category: 'alquiler',
    amount: 450000,
    description: 'Pago alquiler mensual de local - Local 104',
    date: '2026-06-05T09:00:00Z',
    createdBy: 'Carlos Ruiz (Administrador)',
  },
  {
    id: 'TR-1005',
    type: 'ingreso',
    category: 'abono',
    amount: 180000,
    description: 'Pago total batería orden OR-1004 - Roberto Carlos Díaz',
    date: '2026-06-15T16:50:00Z',
    createdBy: 'Lucía Fernández (Recepción)',
    orderId: 'OR-1004',
    clientName: 'Roberto Carlos Díaz'
  },
  {
    id: 'TR-1006',
    type: 'ingreso',
    category: 'servicio',
    amount: 50000,
    description: 'Mantenimiento preventivo general Xiaomi Redmi 9',
    date: '2026-06-16T12:00:00Z',
    createdBy: 'Jorge Mendoza (Técnico)',
    clientName: 'Pedro Nel Ospina'
  },
  {
    id: 'QT-2001',
    type: 'ingreso',
    category: 'reparacion',
    amount: 480000,
    description: 'Cotización: Cambio de batería y pin de carga iPhone 11',
    date: '2026-06-16T15:30:00Z',
    createdBy: 'Lucía Fernández (Recepción)',
    isQuote: true,
    clientName: 'Andrés Castro'
  },
  {
    id: 'QT-2002',
    type: 'ingreso',
    category: 'reparacion',
    amount: 120000,
    description: 'Cotización: Cambio de cristal trasero Huawei P30 Lite',
    date: '2026-06-16T16:00:00Z',
    createdBy: 'Lucía Fernández (Recepción)',
    isQuote: true,
    clientName: 'Luisa Fernanda Villegas'
  }
];

export class InMemoryFinancialRepository implements IFinancialRepository {
  constructor() {
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(DEFAULT_TRANSACTIONS));
    }
  }

  private getRecords(): FinanceRecord[] {
    return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
  }

  private saveRecords(records: FinanceRecord[]) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(records));
  }

  async listRecords(): Promise<FinanceRecord[]> {
    return this.getRecords();
  }

  async createRecord(recordData: Omit<FinanceRecord, 'id' | 'date'>): Promise<FinanceRecord> {
    const records = this.getRecords();
    const isQuote = recordData.isQuote || false;
    const prefix = isQuote ? 'QT' : 'TR';
    const recordId = `${prefix}-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const newRecord: FinanceRecord = {
      ...recordData,
      id: recordId,
      date: now,
    };

    records.push(newRecord);
    this.saveRecords(records);
    return newRecord;
  }

  async deleteRecord(id: string): Promise<void> {
    const records = this.getRecords();
    const updated = records.filter(r => r.id !== id);
    this.saveRecords(updated);
  }

  async getFinancialSummary(): Promise<FinancialSummary> {
    const records = this.getRecords();
    
    // Obtener fecha actual local
    const now = new Date();
    // Ajustar a zona horaria local para comparar con ISO
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - tzOffset);
    const todayStr = localNow.toISOString().slice(0, 10);
    const thisMonthStr = localNow.toISOString().slice(0, 7);

    let totalIncome = 0;
    let totalExpense = 0;
    let dailyIncome = 0;
    let dailyExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    // Solo transacciones reales
    const activeTransactions = records.filter(r => !r.isQuote);

    activeTransactions.forEach((r) => {
      const isIncome = r.type === 'ingreso';
      // Las fechas guardadas son UTC (ISO). Hacemos offset local para comparación de día/mes.
      const rDate = new Date(r.date);
      const rLocalDate = new Date(rDate.getTime() - tzOffset);
      const recordDateStr = rLocalDate.toISOString().slice(0, 10);
      const recordMonthStr = rLocalDate.toISOString().slice(0, 7);

      if (isIncome) {
        totalIncome += r.amount;
        if (recordDateStr === todayStr) {
          dailyIncome += r.amount;
        }
        if (recordMonthStr === thisMonthStr) {
          monthlyIncome += r.amount;
        }
      } else {
        totalExpense += r.amount;
        if (recordDateStr === todayStr) {
          dailyExpense += r.amount;
        }
        if (recordMonthStr === thisMonthStr) {
          monthlyExpense += r.amount;
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      dailyProfit: dailyIncome - dailyExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
    };
  }

  async listQuotes(): Promise<FinanceRecord[]> {
    const records = this.getRecords();
    return records.filter(r => r.isQuote);
  }
}
