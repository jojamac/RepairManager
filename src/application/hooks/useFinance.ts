import { useState, useEffect, useCallback } from 'react';
import { useRepositories } from '../../data/RepositoryContext';
import { FinanceRecord, FinanceType, FinanceCategory } from '../../domain/entities/Finance';
import { FinancialSummary } from '../../domain/repositories/IFinancialRepository';
import { useAuth } from './useAuth';

export const useFinance = () => {
  const { financeRepo, logsRepo } = useRepositories();
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [quotes, setQuotes] = useState<FinanceRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpense: 0,
    dailyProfit: 0,
    monthlyProfit: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allRecords = await financeRepo.listRecords();
      // Filtrar transacciones reales
      const realTx = allRecords.filter(r => !r.isQuote);
      setRecords(realTx);

      // Filtrar cotizaciones
      const allQuotes = allRecords.filter(r => r.isQuote);
      setQuotes(allQuotes);

      // Cargar resumen de ganancias/gastos
      const sum = await financeRepo.getFinancialSummary();
      setSummary(sum);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos financieros.');
    } finally {
      setLoading(false);
    }
  }, [financeRepo]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const createTransaction = async (
    type: FinanceType,
    category: FinanceCategory,
    amount: number,
    description: string,
    orderId?: string,
    clientName?: string
  ): Promise<FinanceRecord> => {
    setLoading(true);
    setError(null);
    try {
      const createdBy = currentUser ? currentUser.name : 'Usuario Sistema';
      const record = await financeRepo.createRecord({
        type,
        category,
        amount,
        description,
        createdBy,
        orderId,
        clientName,
        isQuote: false,
      });

      if (currentUser) {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'REGISTRO_FINANCIERO',
          `Se registró un ${type} de $${amount} por concepto de ${category} (${description})`
        );
      }

      await loadFinancialData();
      return record;
    } catch (err: any) {
      const errMsg = err.message || 'Error al registrar transacción.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async (
    amount: number,
    description: string,
    clientName: string
  ): Promise<FinanceRecord> => {
    setLoading(true);
    setError(null);
    try {
      const createdBy = currentUser ? currentUser.name : 'Usuario Sistema';
      const record = await financeRepo.createRecord({
        type: 'ingreso',
        category: 'reparacion',
        amount,
        description,
        createdBy,
        clientName,
        isQuote: true,
      });

      if (currentUser) {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'REGISTRO_COTIZACION',
          `Se registró cotización por $${amount} para el cliente ${clientName}: ${description}`
        );
      }

      await loadFinancialData();
      return record;
    } catch (err: any) {
      const errMsg = err.message || 'Error al registrar cotización.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await financeRepo.deleteRecord(id);

      if (currentUser) {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'ELIMINACION_FINANCIERA',
          `Se eliminó el registro financiero ID: ${id}`
        );
      }

      await loadFinancialData();
    } catch (err: any) {
      const errMsg = err.message || 'Error al eliminar transacción.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    records,
    quotes,
    summary,
    loading,
    error,
    createTransaction,
    createQuote,
    deleteTransaction,
    loadFinancialData,
  };
};
