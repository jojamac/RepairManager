export type TwinComponentStatus = 
  | 'NORMAL' 
  | 'WARNING' 
  | 'DAMAGED' 
  | 'REPLACEMENT_REQUIRED' 
  | 'REMOVED' 
  | 'REPLACED' 
  | 'REPAIRED'
  | 'TESTING' 
  | 'VERIFIED';

export type TwinComponentKey = 
  | 'display' 
  | 'display_flex'
  | 'battery' 
  | 'motherboard' 
  | 'charging_port' 
  | 'rear_camera' 
  | 'front_camera' 
  | 'speaker' 
  | 'earpiece_speaker'
  | 'microphone' 
  | 'face_id' 
  | 'fingerprint'
  | 'vibration_motor'
  | 'nfc_antenna'
  | 'buttons' 
  | 'housing';

export interface DigitalTwinComponent {
  key: TwinComponentKey;
  name: string;
  status: TwinComponentStatus;
  diagnosisStatus?: TwinComponentStatus; // Estado inmutable fijado durante el diagnóstico
  diagnosisNote?: string;
  replacementCost?: number;
  evidencePhotoUrl?: string;
  coordinates: { x: number; y: number; z: number };
}

export interface DigitalTwinEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  componentKey?: TwinComponentKey;
  previousStatus?: TwinComponentStatus;
  newStatus?: TwinComponentStatus;
  authorName: string;
}

export interface DigitalTwinQualityCheck {
  componentKey: TwinComponentKey;
  componentName: string;
  passed: boolean;
  notes?: string;
  testedAt?: string;
  testedBy?: string;
}

export interface DigitalTwinInstance {
  id: string;
  orderId: string;
  deviceModel: string;
  components: DigitalTwinComponent[];
  events: DigitalTwinEvent[];
  qualityChecks: DigitalTwinQualityCheck[];
  isAuthorizedByClient: boolean;
  authorizedAt?: string;
  isCertified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Plantilla por defecto con los componentes estándar de un Smartphone
export const DEFAULT_DIGITAL_TWIN_COMPONENTS: DigitalTwinComponent[] = [
  { key: 'display', name: 'Pantalla / Display Touch', status: 'NORMAL', coordinates: { x: 0, y: 0, z: 0.35 } },
  { key: 'battery', name: 'Batería Principal', status: 'NORMAL', coordinates: { x: 0, y: -0.2, z: -0.1 } },
  { key: 'motherboard', name: 'Placa Madre / Lógica', status: 'NORMAL', coordinates: { x: 0, y: 0.6, z: -0.1 } },
  { key: 'charging_port', name: 'Puerto de Carga / Flex', status: 'NORMAL', coordinates: { x: 0, y: -1.2, z: 0 } },
  { key: 'rear_camera', name: 'Módulo Cámara Trasera', status: 'NORMAL', coordinates: { x: -0.3, y: 0.8, z: -0.25 } },
  { key: 'front_camera', name: 'Cámara Frontal / Lente', status: 'NORMAL', coordinates: { x: 0, y: 1.1, z: 0.25 } },
  { key: 'speaker', name: 'Altavoz / Parlante Inferior', status: 'NORMAL', coordinates: { x: 0.3, y: -1.25, z: 0 } },
  { key: 'microphone', name: 'Micrófono Principal', status: 'NORMAL', coordinates: { x: -0.3, y: -1.25, z: 0 } },
  { key: 'face_id', name: 'Sensor Biométrico / Face ID', status: 'NORMAL', coordinates: { x: 0.2, y: 1.1, z: 0.25 } },
  { key: 'buttons', name: 'Botones Volumen / Encendido', status: 'NORMAL', coordinates: { x: 0.75, y: 0.3, z: 0 } },
  { key: 'housing', name: 'Chasis / Carcasa Exterior', status: 'NORMAL', coordinates: { x: 0, y: 0, z: 0 } },
];

/**
 * Determina el estado diagnóstico original e inmutable de un componente.
 * Consulta la propiedad inmutable `diagnosisStatus`, el historial cronológico de `events` (previousStatus/newStatus),
 * y aplica deducción de respaldo si no existían datos previos.
 */
export function getOriginalDiagnosticStatus(
  comp: DigitalTwinComponent,
  events?: DigitalTwinEvent[]
): TwinComponentStatus {
  // 1. Si ya tiene el campo explícito de diagnóstico inmutable
  if (comp.diagnosisStatus) {
    return comp.diagnosisStatus;
  }

  // 2. Consultar eventos del gemelo digital asociados a este componente
  if (events && events.length > 0) {
    const compEvents = events.filter(e => e.componentKey === comp.key);
    
    // Buscar si algún evento registró el hallazgo original
    // Por ejemplo, al reparar, previousStatus fue DAMAGED o REPLACEMENT_REQUIRED
    const prevDamagedEvent = compEvents.find(e => e.previousStatus === 'DAMAGED' || e.previousStatus === 'REPLACEMENT_REQUIRED');
    if (prevDamagedEvent?.previousStatus) {
      return prevDamagedEvent.previousStatus;
    }

    // O si en la creación del diagnóstico newStatus fue DAMAGED o REPLACEMENT_REQUIRED
    const newDamagedEvent = compEvents.find(e => e.newStatus === 'DAMAGED' || e.newStatus === 'REPLACEMENT_REQUIRED');
    if (newDamagedEvent?.newStatus) {
      return newDamagedEvent.newStatus;
    }
  }

  // 3. Respaldo por estado y propiedades del componente
  if (comp.status === 'DAMAGED') return 'DAMAGED';
  if (comp.status === 'REPLACEMENT_REQUIRED') return 'REPLACEMENT_REQUIRED';
  if (comp.status === 'REPLACED') return 'REPLACEMENT_REQUIRED';
  if (comp.status === 'REPAIRED') {
    return (comp.replacementCost && comp.replacementCost > 0) ? 'REPLACEMENT_REQUIRED' : 'DAMAGED';
  }

  return comp.status;
}

/**
 * Determina el resultado final de la intervención técnica en taller:
 * - 'REPLACED': Pieza sustituida por repuesto nuevo
 * - 'REPAIRED': Pieza reparada en laboratorio (microelectrónica/ajuste)
 * - 'PENDING': Pieza diagnosticada aún pendiente de reparación
 * - 'NORMAL': Pieza sin intervención (operativa)
 */
export function getWorkshopOutcome(
  comp: DigitalTwinComponent,
  events?: DigitalTwinEvent[]
): 'REPLACED' | 'REPAIRED' | 'PENDING' | 'NORMAL' {
  if (comp.status === 'REPLACED') return 'REPLACED';
  if (comp.status === 'REPAIRED') return 'REPAIRED';

  if (events && events.length > 0) {
    const compEvents = events.filter(e => e.componentKey === comp.key);
    const replacedEvt = compEvents.find(e => e.newStatus === 'REPLACED');
    if (replacedEvt) return 'REPLACED';

    const repairedEvt = compEvents.find(e => e.newStatus === 'REPAIRED');
    if (repairedEvt) return 'REPAIRED';
  }

  const origDiag = getOriginalDiagnosticStatus(comp, events);
  if (origDiag === 'DAMAGED' || origDiag === 'REPLACEMENT_REQUIRED') {
    return 'PENDING';
  }

  return 'NORMAL';
}

/**
 * Reconstruye un clon inmutable del Gemelo Digital tal como fue diagnosticado inicialmente.
 * Restaura el estado de cada componente a su hallazgo de diagnóstico original (DAMAGED o REPLACEMENT_REQUIRED).
 */
export function createDiagnosticTwinSnapshot(twin: DigitalTwinInstance): DigitalTwinInstance {
  const diagnosticComponents = twin.components.map(comp => {
    const diagStatus = getOriginalDiagnosticStatus(comp, twin.events);
    return {
      ...comp,
      status: diagStatus,
      diagnosisStatus: diagStatus
    };
  });

  return {
    ...twin,
    components: diagnosticComponents
  };
}
