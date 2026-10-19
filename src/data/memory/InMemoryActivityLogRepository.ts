import { IActivityLogRepository } from '../../domain/repositories/IActivityLogRepository';
import { ActivityLog } from '../../domain/entities/Activity';

const LOGS_KEY = 'entucel_activity_logs';

const DEFAULT_LOGS: ActivityLog[] = [
  {
    id: 'LOG-1001',
    userId: 'usr-admin',
    userName: 'Carlos Ruiz (Administrador)',
    userRole: 'admin',
    action: 'CREACION_USUARIO',
    details: 'Se creó el usuario técnico: Jorge Mendoza (tecnico@entucel.com)',
    date: '2026-06-15T08:00:00Z',
  },
  {
    id: 'LOG-1002',
    userId: 'usr-recepcion',
    userName: 'Lucía Fernández (Recepción)',
    userRole: 'recepcion',
    action: 'CREACION_ORDEN',
    details: 'Se creó la orden OR-1004 para Roberto Carlos Díaz (Moto Edge 30)',
    date: '2026-06-15T16:45:00Z',
  },
  {
    id: 'LOG-1003',
    userId: 'usr-tecnico',
    userName: 'Jorge Mendoza (Técnico)',
    userRole: 'tecnico',
    action: 'ACTUALIZACION_ESTADO_ORDEN',
    details: 'Se actualizó la orden OR-1004 a estado LISTO (reparación terminada)',
    date: '2026-06-16T12:00:00Z',
  },
  {
    id: 'LOG-1004',
    userId: 'usr-admin',
    userName: 'Carlos Ruiz (Administrador)',
    userRole: 'admin',
    action: 'REGISTRO_TRANSACCION',
    details: 'Se registró un egreso de $320.000 por compra de repuesto pantalla S21 Ultra',
    date: '2026-06-16T13:30:00Z',
  }
];

export class InMemoryActivityLogRepository implements IActivityLogRepository {
  constructor() {
    if (!localStorage.getItem(LOGS_KEY)) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(DEFAULT_LOGS));
    }
  }

  private getLogs(): ActivityLog[] {
    return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
  }

  private saveLogs(logs: ActivityLog[]) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }

  async listLogs(): Promise<ActivityLog[]> {
    return this.getLogs().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async logAction(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    details: string
  ): Promise<ActivityLog> {
    const logs = this.getLogs();
    const logId = `LOG-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const newLog: ActivityLog = {
      id: logId,
      userId,
      userName,
      userRole,
      action,
      details,
      date: now,
    };

    logs.push(newLog);
    this.saveLogs(logs);
    return newLog;
  }
}
