import { ServiceOrder } from '../../domain/entities/ServiceOrder';
import { FinanceRecord } from '../../domain/entities/Finance';
import { Client } from '../../domain/entities/Client';

const BACKUP_KEY = 'entucel_auto_backup_v1';
const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 Minutos

export interface BackupData {
  timestamp: string;
  version: string;
  serviceOrders: ServiceOrder[];
  financeRecords: FinanceRecord[];
  clients: Client[];
}

export class AutoBackupService {
  /**
   * Genera un paquete JSON de datos completo
   */
  static createBackupPayload(): BackupData {
    const ordersStr = localStorage.getItem('entucel_orders_db');
    const financeStr = localStorage.getItem('entucel_finance_db');
    const clientsStr = localStorage.getItem('entucel_clients_db');

    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      serviceOrders: ordersStr ? JSON.parse(ordersStr) : [],
      financeRecords: financeStr ? JSON.parse(financeStr) : [],
      clients: clientsStr ? JSON.parse(clientsStr) : []
    };
  }

  /**
   * Guarda automáticamente una copia local en LocalStorage
   */
  static saveAutoBackup(): boolean {
    try {
      const payload = this.createBackupPayload();
      localStorage.setItem(BACKUP_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('Error al realizar auto-backup en LocalStorage:', err);
      return false;
    }
  }

  /**
   * Obtiene la información del último backup automático realizado
   */
  static getLastBackup(): BackupData | null {
    try {
      const backupStr = localStorage.getItem(BACKUP_KEY);
      if (!backupStr) return null;
      return JSON.parse(backupStr);
    } catch (err) {
      console.error('Error al leer el backup de LocalStorage:', err);
      return null;
    }
  }

  /**
   * Descarga el backup completo como archivo .json en el cliente
   */
  static downloadBackupFile(): void {
    const payload = this.createBackupPayload();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const dateFormatted = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `entucel_backup_${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  }

  /**
   * Restaura datos desde un objeto BackupData
   */
  static restoreBackup(backup: BackupData): void {
    if (backup.serviceOrders) {
      localStorage.setItem('entucel_orders_db', JSON.stringify(backup.serviceOrders));
    }
    if (backup.financeRecords) {
      localStorage.setItem('entucel_finance_db', JSON.stringify(backup.financeRecords));
    }
    if (backup.clients) {
      localStorage.setItem('entucel_clients_db', JSON.stringify(backup.clients));
    }
  }

  /**
   * Inicia el temporizador de auto-respaldo en segundo plano
   */
  static initAutoBackupScheduler(): () => void {
    // Ejecutar respaldo inicial a los 10 segundos
    const initialTimer = setTimeout(() => {
      this.saveAutoBackup();
    }, 10000);

    // Ejecutar respaldo cada 5 minutos
    const interval = setInterval(() => {
      this.saveAutoBackup();
    }, AUTO_BACKUP_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }
}
