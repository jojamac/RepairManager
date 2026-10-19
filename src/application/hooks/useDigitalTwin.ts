import { useState, useCallback, useRef, useEffect } from 'react';
import { useRepositories } from '../../data/RepositoryContext';
import { 
  DigitalTwinInstance, 
  TwinComponentKey, 
  TwinComponentStatus 
} from '../../domain/entities/DigitalTwin';

export function useDigitalTwin() {
  const { digitalTwinRepo } = useRepositories();
  const [twin, setTwin] = useState<DigitalTwinInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Control para prevenir setTwin tras desmontar el componente o responder peticiones obsoletas
  const isMountedRef = useRef(true);
  const currentOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadTwinForOrder = useCallback(async (orderId: string, deviceModel = 'Smartphone', reportedFailure?: string) => {
    currentOrderIdRef.current = orderId;
    setLoading(true);
    setError(null);
    try {
      let instance = await digitalTwinRepo.getTwinByOrderId(orderId);
      if (!instance) {
        instance = await digitalTwinRepo.createTwinForOrder(orderId, deviceModel, reportedFailure);
      }
      
      // Solo actualizar estado si la orden sigue siendo la misma y el hook está montado
      if (isMountedRef.current && currentOrderIdRef.current === orderId) {
        setTwin(instance);
      }
      return instance;
    } catch (err: any) {
      if (isMountedRef.current && currentOrderIdRef.current === orderId) {
        setError(err.message || 'Error al cargar Gemelo Digital');
      }
      return null;
    } finally {
      if (isMountedRef.current && currentOrderIdRef.current === orderId) {
        setLoading(false);
      }
    }
  }, [digitalTwinRepo]);

  const updateComponent = useCallback(async (
    orderId: string,
    key: TwinComponentKey,
    status: TwinComponentStatus,
    diagnosisNote?: string,
    replacementCost?: number,
    evidencePhotoUrl?: string,
    authorName?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await digitalTwinRepo.updateComponentStatus(
        orderId, 
        key, 
        status, 
        diagnosisNote, 
        replacementCost, 
        evidencePhotoUrl,
        authorName
      );
      if (isMountedRef.current) {
        setTwin(updated);
      }
      return updated;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al actualizar componente del Gemelo Digital');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [digitalTwinRepo]);

  const authorizeRepair = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await digitalTwinRepo.authorizeRepair(orderId);
      if (isMountedRef.current) {
        setTwin(updated);
      }
      return updated;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al autorizar reparación');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [digitalTwinRepo]);

  const toggleQualityCheck = useCallback(async (
    orderId: string, 
    componentKey: TwinComponentKey, 
    passed: boolean, 
    notes?: string,
    testerName?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await digitalTwinRepo.updateQualityCheck(orderId, componentKey, passed, notes, testerName);
      if (isMountedRef.current) {
        setTwin(updated);
      }
      return updated;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al actualizar control de calidad');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [digitalTwinRepo]);

  const saveFullTwin = useCallback(async (twinToSave: DigitalTwinInstance) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await digitalTwinRepo.saveFullTwin(twinToSave);
      if (isMountedRef.current) {
        setTwin(updated);
      }
      return updated;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al guardar el Gemelo Digital');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [digitalTwinRepo]);

  return {
    twin,
    loading,
    error,
    loadTwinForOrder,
    updateComponent,
    saveFullTwin,
    authorizeRepair,
    toggleQualityCheck
  };
}
