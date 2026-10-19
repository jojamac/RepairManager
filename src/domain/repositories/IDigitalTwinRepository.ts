import { DigitalTwinInstance, TwinComponentKey, TwinComponentStatus } from '../entities/DigitalTwin';

export interface IDigitalTwinRepository {
  getTwinByOrderId(orderId: string): Promise<DigitalTwinInstance | null>;
  createTwinForOrder(orderId: string, deviceModel: string, reportedFailure?: string): Promise<DigitalTwinInstance>;
  updateComponentStatus(
    orderId: string, 
    key: TwinComponentKey, 
    status: TwinComponentStatus, 
    diagnosisNote?: string,
    replacementCost?: number,
    evidencePhotoUrl?: string,
    authorName?: string
  ): Promise<DigitalTwinInstance>;
  saveFullTwin(twin: DigitalTwinInstance): Promise<DigitalTwinInstance>;
  authorizeRepair(orderId: string): Promise<DigitalTwinInstance>;
  updateQualityCheck(
    orderId: string, 
    componentKey: TwinComponentKey, 
    passed: boolean, 
    notes?: string, 
    testerName?: string
  ): Promise<DigitalTwinInstance>;
  getTwinHistoryByImeiOrModel(imeiOrModel: string): Promise<DigitalTwinInstance[]>;
}
