import { IDigitalTwinRepository } from '../../domain/repositories/IDigitalTwinRepository';
import { 
  DigitalTwinInstance, 
  DEFAULT_DIGITAL_TWIN_COMPONENTS, 
  TwinComponentKey, 
  TwinComponentStatus 
} from '../../domain/entities/DigitalTwin';

export class InMemoryDigitalTwinRepository implements IDigitalTwinRepository {
  private storageKey = 'entucel_digital_twins';

  private getTwinsFromStorage(): DigitalTwinInstance[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveTwinsToStorage(twins: DigitalTwinInstance[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(twins));
  }

  async getTwinByOrderId(orderId: string): Promise<DigitalTwinInstance | null> {
    const twins = this.getTwinsFromStorage();
    const cleanId = orderId.trim().toUpperCase();
    return twins.find(t => t.orderId.trim().toUpperCase() === cleanId) || null;
  }

  async createTwinForOrder(orderId: string, deviceModel: string, reportedFailure?: string): Promise<DigitalTwinInstance> {
    const twins = this.getTwinsFromStorage();
    const existing = twins.find(t => t.orderId === orderId);
    if (existing) return existing;

    // Todos los componentes inician en estado NORMAL hasta que el técnico realice la inspección
    const initialComponents = DEFAULT_DIGITAL_TWIN_COMPONENTS.map(c => ({
      ...c,
      status: 'NORMAL' as const,
      diagnosisNote: '',
      replacementCost: 0
    }));

    const initialQualityChecks = DEFAULT_DIGITAL_TWIN_COMPONENTS.map(c => ({
      componentKey: c.key,
      componentName: c.name,
      passed: false
    }));

    const newTwin: DigitalTwinInstance = {
      id: `twin-${Date.now()}`,
      orderId,
      deviceModel,
      components: initialComponents,
      events: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
          title: 'Recepción y Creación del Gemelo Digital',
          description: `Dispositivo ${deviceModel} registrado en el sistema. Gemelo Digital generado con diagnóstico de ingreso: "${reportedFailure || 'Revisión técnica'}".`,
          authorName: 'Sistema EnTuCel'
        }
      ],
      qualityChecks: initialQualityChecks,
      isAuthorizedByClient: false,
      isCertified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    twins.push(newTwin);
    this.saveTwinsToStorage(twins);
    return newTwin;
  }

  async updateComponentStatus(
    orderId: string,
    key: TwinComponentKey,
    status: TwinComponentStatus,
    diagnosisNote?: string,
    replacementCost?: number,
    evidencePhotoUrl?: string,
    authorName = 'Técnico'
  ): Promise<DigitalTwinInstance> {
    const twins = this.getTwinsFromStorage();
    const index = twins.findIndex(t => t.orderId === orderId);
    
    let twin = index !== -1 ? twins[index] : await this.createTwinForOrder(orderId, 'Smartphone');

    const compIndex = twin.components.findIndex(c => c.key === key);
    if (compIndex !== -1) {
      const prevStatus = twin.components[compIndex].status;
      twin.components[compIndex].status = status;
      if (diagnosisNote !== undefined) twin.components[compIndex].diagnosisNote = diagnosisNote;
      if (replacementCost !== undefined) twin.components[compIndex].replacementCost = replacementCost;
      if (evidencePhotoUrl !== undefined) twin.components[compIndex].evidencePhotoUrl = evidencePhotoUrl;

      // Registrar Evento en Timeline
      twin.events.unshift({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
        title: `Actualización: ${twin.components[compIndex].name}`,
        description: diagnosisNote ? `Estado: ${status}. Nota: "${diagnosisNote}"` : `Estado cambiado de ${prevStatus} a ${status}`,
        componentKey: key,
        previousStatus: prevStatus,
        newStatus: status,
        authorName
      });

      // Actualizar estado global de certificación
      twin.isCertified = twin.qualityChecks.every(q => q.passed) && twin.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED');
      twin.updatedAt = new Date().toISOString();

      if (index !== -1) {
        twins[index] = twin;
      } else {
        twins.push(twin);
      }
      this.saveTwinsToStorage(twins);
    }

    return twin;
  }

  async authorizeRepair(orderId: string): Promise<DigitalTwinInstance> {
    const twins = this.getTwinsFromStorage();
    const index = twins.findIndex(t => t.orderId === orderId);
    if (index === -1) throw new Error('Gemelo Digital no encontrado.');

    twins[index].isAuthorizedByClient = true;
    twins[index].authorizedAt = new Date().toISOString();
    twins[index].events.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
      title: 'Reparación Autorizada por el Cliente',
      description: 'El cliente ha aprobado el diagnóstico y presupuesto de repuestos.',
      authorName: 'Cliente'
    });

    this.saveTwinsToStorage(twins);
    return twins[index];
  }

  async updateQualityCheck(
    orderId: string, 
    componentKey: TwinComponentKey, 
    passed: boolean, 
    notes?: string, 
    testerName = 'Técnico Control de Calidad'
  ): Promise<DigitalTwinInstance> {
    const twins = this.getTwinsFromStorage();
    const cleanId = orderId.trim().toUpperCase();
    const index = twins.findIndex(t => t.orderId.trim().toUpperCase() === cleanId);
    if (index === -1) {
      // Si no existe, crear
      await this.createTwinForOrder(cleanId, 'Smartphone');
      return this.updateQualityCheck(cleanId, componentKey, passed, notes, testerName);
    }

    const twin = twins[index];
    const qIndex = twin.qualityChecks.findIndex(q => q.componentKey === componentKey);
    if (qIndex !== -1) {
      twin.qualityChecks[qIndex].passed = passed;
      twin.qualityChecks[qIndex].notes = notes;
      twin.qualityChecks[qIndex].testedAt = new Date().toISOString();
      twin.qualityChecks[qIndex].testedBy = testerName;

      twin.isCertified = twin.qualityChecks.every(q => q.passed) && twin.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED');

      twin.events.unshift({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
        title: `Prueba de Calidad: ${twin.qualityChecks[qIndex].componentName}`,
        description: passed ? '✅ Prueba APROBADA satisfactoriamente.' : '❌ Prueba FALLIDA - Requiere revisión.',
        componentKey,
        authorName: testerName
      });

      twins[index] = twin;
      this.saveTwinsToStorage(twins);
    }

    return twin;
  }

  async saveFullTwin(twin: DigitalTwinInstance): Promise<DigitalTwinInstance> {
    const twins = this.getTwinsFromStorage();
    const cleanTwin: DigitalTwinInstance = JSON.parse(JSON.stringify(twin));
    cleanTwin.updatedAt = new Date().toISOString();
    cleanTwin.isCertified = cleanTwin.qualityChecks.every(q => q.passed) && cleanTwin.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED');

    const index = twins.findIndex(t => t.orderId.trim().toUpperCase() === cleanTwin.orderId.trim().toUpperCase());
    if (index !== -1) {
      twins[index] = cleanTwin;
    } else {
      twins.push(cleanTwin);
    }
    this.saveTwinsToStorage(twins);
    return cleanTwin;
  }

  async getTwinHistoryByImeiOrModel(imeiOrModel: string): Promise<DigitalTwinInstance[]> {
    const twins = this.getTwinsFromStorage();
    return twins.filter(t => t.deviceModel.toLowerCase().includes(imeiOrModel.toLowerCase()));
  }
}
