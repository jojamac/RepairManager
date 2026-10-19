import { IActivityLogRepository } from '../../domain/repositories/IActivityLogRepository';
import { ActivityLog } from '../../domain/entities/Activity';
import { db } from './config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

export class FirebaseActivityLogRepository implements IActivityLogRepository {
  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase no está configurado. Por favor define las variables de entorno en el archivo .env');
    }
  }

  async listLogs(): Promise<ActivityLog[]> {
    this.checkFirebase();
    // Limitar a los últimos 200 registros de actividad por desempeño y legibilidad
    const querySnap = await getDocs(
      query(collection(db!, 'activity_logs'), orderBy('date', 'desc'), limit(200))
    );
    const logs: ActivityLog[] = [];
    querySnap.forEach((docSnap) => {
      logs.push(docSnap.data() as ActivityLog);
    });
    return logs;
  }

  async logAction(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    details: string
  ): Promise<ActivityLog> {
    this.checkFirebase();
    const logId = `LOG-${Date.now().toString().slice(-6)}`;
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

    await setDoc(doc(db!, 'activity_logs', logId), newLog);
    return newLog;
  }
}
