import { IFinancialRepository, FinancialSummary } from '../../domain/repositories/IFinancialRepository';
import { FinanceRecord } from '../../domain/entities/Finance';
import { db } from './config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

export class FirebaseFinancialRepository implements IFinancialRepository {
  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase no está configurado. Por favor define las variables de entorno en el archivo .env');
    }
  }

  async listRecords(): Promise<FinanceRecord[]> {
    this.checkFirebase();
    const querySnap = await getDocs(query(collection(db!, 'transactions'), orderBy('date', 'desc')));
    const records: FinanceRecord[] = [];
    querySnap.forEach((docSnap) => {
      records.push(docSnap.data() as FinanceRecord);
    });
    return records;
  }

  async createRecord(recordData: Omit<FinanceRecord, 'id' | 'date'>): Promise<FinanceRecord> {
    this.checkFirebase();
    const recordId = `TR-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const newRecord: FinanceRecord = {
      ...recordData,
      id: recordId,
      date: now,
    };

    await setDoc(doc(db!, 'transactions', recordId), newRecord);
    return newRecord;
  }

  async deleteRecord(id: string): Promise<void> {
    this.checkFirebase();
    await deleteDoc(doc(db!, 'transactions', id));
  }

  async getFinancialSummary(): Promise<FinancialSummary> {
    this.checkFirebase();
    const records = await this.listRecords();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7);

    let totalIncome = 0;
    let totalExpense = 0;
    let dailyIncome = 0;
    let dailyExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    // Filtrar solo transacciones reales (no cotizaciones)
    const activeTransactions = records.filter(r => !r.isQuote);

    activeTransactions.forEach((r) => {
      const isIncome = r.type === 'ingreso';
      const recordDateStr = r.date.slice(0, 10);
      const recordMonthStr = r.date.slice(0, 7);

      if (isIncome) {
        totalIncome += r.amount;
        if (recordDateStr === todayStr) dailyIncome += r.amount;
        if (recordMonthStr === thisMonthStr) monthlyIncome += r.amount;
      } else {
        totalExpense += r.amount;
        if (recordDateStr === todayStr) dailyExpense += r.amount;
        if (recordMonthStr === thisMonthStr) monthlyExpense += r.amount;
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
    this.checkFirebase();
    const records = await this.listRecords();
    return records.filter((r) => r.isQuote);
  }
}
