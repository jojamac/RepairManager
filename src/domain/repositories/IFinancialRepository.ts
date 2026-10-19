import { FinanceRecord } from '../entities/Finance';

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  dailyProfit: number;
  monthlyProfit: number;
}

export interface IFinancialRepository {
  listRecords(): Promise<FinanceRecord[]>;
  createRecord(recordData: Omit<FinanceRecord, 'id' | 'date'>): Promise<FinanceRecord>;
  deleteRecord(id: string): Promise<void>;
  getFinancialSummary(): Promise<FinancialSummary>;
  listQuotes(): Promise<FinanceRecord[]>;
}
