import { IDigitalTwinRepository } from '../../domain/repositories/IDigitalTwinRepository';
import { 
  DigitalTwinInstance, 
  DEFAULT_DIGITAL_TWIN_COMPONENTS, 
  TwinComponentKey, 
  TwinComponentStatus 
} from '../../domain/entities/DigitalTwin';
import { db } from './config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export class FirebaseDigitalTwinRepository implements IDigitalTwinRepository {
  private collectionName = 'digital_twins';

  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase no está configurado.');
    }
  }

  private localStorageKey = 'entucel_digital_twins';

  private getTwinsFromLocalStorage(): DigitalTwinInstance[] {
    const data = localStorage.getItem(this.localStorageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveTwinToLocalStorage(twin: DigitalTwinInstance): void {
    const twins = this.getTwinsFromLocalStorage();
    const index = twins.findIndex(t => t.orderId === twin.orderId);
    if (index !== -1) {
      twins[index] = twin;
    } else {
      twins.push(twin);
    }
    localStorage.setItem(this.localStorageKey, JSON.stringify(twins));
  }

  async getTwinByOrderId(orderId: string): Promise<DigitalTwinInstance | null> {
    const cleanId = orderId.trim().toUpperCase();
    const localTwins = this.getTwinsFromLocalStorage();
    const localFound = localTwins.find(t => t.orderId.trim().toUpperCase() === cleanId);
    const isDev = Boolean(import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development');

    try {
      this.checkFirebase();
      const docRef = doc(db!, this.collectionName, cleanId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const firestoreTwin = snap.data() as DigitalTwinInstance;
        // En desarrollo o cuando Firestore responde, la base de datos oficial es la autoridad
        this.saveTwinToLocalStorage(firestoreTwin);
        return firestoreTwin;
      }

      // Si el documento NO existe en Firestore (ej. fue eliminado manualmente en la consola para pruebas):
      // Purgar de inmediato la copia en localStorage para que no persista ni resucite en el navegador
      if (localFound) {
        const remaining = localTwins.filter(t => t.orderId.trim().toUpperCase() !== cleanId);
        localStorage.setItem(this.localStorageKey, JSON.stringify(remaining));
        if (isDev) {
          console.info(`[EnTuCel DEV] Gemelo digital de la orden ${cleanId} no existe en Firestore. Memoria local purgada automáticamente.`);
        }
      }
      return null;
    } catch (error) {
      console.warn('Firebase / Firestore denegó permiso o falló la consulta de digital_twins. Usando respaldo LocalStorage:', error);
      return localFound || null;
    }
  }

  async createTwinForOrder(orderId: string, deviceModel: string, _reportedFailure?: string): Promise<DigitalTwinInstance> {
    this.checkFirebase();
    const existing = await this.getTwinByOrderId(orderId);
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
      id: `twin-${orderId}`,
      orderId,
      deviceModel,
      components: initialComponents,
      events: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
          title: 'Recepción y Creación del Gemelo Digital',
          description: `Dispositivo ${deviceModel} registrado. Gemelo Digital generado.`,
          authorName: 'Sistema EnTuCel'
        }
      ],
      qualityChecks: initialQualityChecks,
      isAuthorizedByClient: false,
      isCertified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = doc(db!, this.collectionName, orderId);
    try {
      await setDoc(docRef, newTwin);
    } catch (e) {
      console.warn('No se pudo guardar digital_twin en Firestore por permisos. Guardando en LocalStorage:', e);
    }
    this.saveTwinToLocalStorage(newTwin);
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
    let twin = await this.getTwinByOrderId(orderId);
    if (!twin) {
      twin = await this.createTwinForOrder(orderId, 'Smartphone');
    }

    const compIndex = twin.components.findIndex(c => c.key === key);
    if (compIndex !== -1) {
      const prevStatus = twin.components[compIndex].status;
      twin.components[compIndex].status = status;
      if (diagnosisNote !== undefined) twin.components[compIndex].diagnosisNote = diagnosisNote;
      if (replacementCost !== undefined) twin.components[compIndex].replacementCost = replacementCost;
      if (evidencePhotoUrl !== undefined) twin.components[compIndex].evidencePhotoUrl = evidencePhotoUrl;

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

      twin.isCertified = twin.qualityChecks.every(q => q.passed) && twin.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED');
      twin.updatedAt = new Date().toISOString();

      const docRef = doc(db!, this.collectionName, orderId);
      try {
        await setDoc(docRef, twin, { merge: true });
      } catch (e) {
        console.warn('No se pudo actualizar digital_twin en Firestore por permisos. Guardando en LocalStorage:', e);
      }
      this.saveTwinToLocalStorage(twin);
    }

    return twin;
  }

  async authorizeRepair(orderId: string): Promise<DigitalTwinInstance> {
    const twin = await this.getTwinByOrderId(orderId);
    if (!twin) throw new Error('Gemelo Digital no encontrado.');

    twin.isAuthorizedByClient = true;
    twin.authorizedAt = new Date().toISOString();
    twin.events.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
      title: 'Reparación Autorizada por el Cliente',
      description: 'El cliente ha aprobado el diagnóstico y presupuesto de repuestos.',
      authorName: 'Cliente'
    });

    const docRef = doc(db!, this.collectionName, orderId);
    await updateDoc(docRef, {
      isAuthorizedByClient: true,
      authorizedAt: twin.authorizedAt,
      events: twin.events,
      updatedAt: new Date().toISOString()
    });

    return twin;
  }

  async updateQualityCheck(
    orderId: string, 
    componentKey: TwinComponentKey, 
    passed: boolean, 
    notes?: string, 
    testerName = 'Técnico Control de Calidad'
  ): Promise<DigitalTwinInstance> {
    const cleanId = orderId.trim().toUpperCase();
    let twin = await this.getTwinByOrderId(cleanId);
    if (!twin) {
      twin = await this.createTwinForOrder(cleanId, 'Smartphone');
    }

    const qIndex = twin.qualityChecks.findIndex(q => q.componentKey === componentKey);
    if (qIndex !== -1) {
      twin.qualityChecks[qIndex].passed = passed;
      twin.qualityChecks[qIndex].notes = notes;
      twin.qualityChecks[qIndex].testedAt = new Date().toISOString();
      twin.qualityChecks[qIndex].testedBy = testerName;

      twin.isCertified = twin.qualityChecks.every(q => q.passed) && twin.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED');
      twin.updatedAt = new Date().toISOString();

      twin.events.unshift({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('es-CO'),
        title: `Prueba de Calidad: ${twin.qualityChecks[qIndex].componentName}`,
        description: passed ? '✅ Prueba APROBADA satisfactoriamente.' : '❌ Prueba FALLIDA - Requiere revisión.',
        componentKey,
        authorName: testerName
      });

      // 1. Persistir siempre de forma síncrona en LocalStorage
      this.saveTwinToLocalStorage(twin);

      // 2. Intentar guardar en Firestore de forma segura
      try {
        this.checkFirebase();
        const docRef = doc(db!, this.collectionName, cleanId);
        await setDoc(docRef, twin, { merge: true });
      } catch (e) {
        console.warn('No se pudo actualizar quality check en Firestore por permisos. Usando LocalStorage:', e);
      }
    }

    return twin;
  }

  async saveFullTwin(twin: DigitalTwinInstance): Promise<DigitalTwinInstance> {
    const cleanTwin: DigitalTwinInstance = JSON.parse(JSON.stringify(twin));
    cleanTwin.updatedAt = new Date().toISOString();
    cleanTwin.isCertified = cleanTwin.qualityChecks.every(q => q.passed) && cleanTwin.components.every(c => c.status !== 'DAMAGED' && c.status !== 'REPLACEMENT_REQUIRED');

    // 1. Guardar SIEMPRE primero en LocalStorage para asegurar persistencia síncrona
    this.saveTwinToLocalStorage(cleanTwin);

    // 2. Intentar guardar en Firestore con el ID limpio
    try {
      this.checkFirebase();
      const docRef = doc(db!, this.collectionName, cleanTwin.orderId.trim().toUpperCase());
      await setDoc(docRef, cleanTwin);
    } catch (e) {
      console.warn('No se pudo guardar digital_twin completo en Firestore por permisos. Usando respaldo LocalStorage:', e);
    }

    return cleanTwin;
  }

  async getTwinHistoryByImeiOrModel(imeiOrModel: string): Promise<DigitalTwinInstance[]> {
    // Por simplicidad, retornará el twin del id actual
    const twin = await this.getTwinByOrderId(imeiOrModel);
    return twin ? [twin] : [];
  }
}
