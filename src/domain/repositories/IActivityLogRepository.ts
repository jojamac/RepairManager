import { ActivityLog } from '../entities/Activity';

export interface IActivityLogRepository {
  listLogs(): Promise<ActivityLog[]>;
  logAction(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    details: string
  ): Promise<ActivityLog>;
}
