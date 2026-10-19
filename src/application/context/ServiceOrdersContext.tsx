import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRepositories } from '../../data/RepositoryContext';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { useAuth } from '../hooks/useAuth';
import { 
  CreateServiceOrderUseCase, 
  UpdateOrderStatusUseCase, 
  UpdateServiceOrderUseCase 
} from '../usecases/ServiceOrderUseCases';
import { OrderFinancialHooks } from '../services/OrderFinancialHooks';

interface ServiceOrdersContextContainer {
  orders: ServiceOrder[];
  loading: boolean;
  error: string | null;
  getOrder: (id: string) => Promise<ServiceOrder | null>;
  createOrder: (orderData: Omit<ServiceOrder, 'id' | 'entryDate' | 'statusHistory' | 'status'>) => Promise<ServiceOrder>;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<ServiceOrder>;
  updateOrder: (order: ServiceOrder) => Promise<ServiceOrder>;
  uploadOrderMedia: (orderId: string, file: File | string) => Promise<string>;
  searchOrders: (queryStr: string) => Promise<ServiceOrder[]>;
  loadOrders: (forceRefresh?: boolean) => Promise<void>;
}

const ServiceOrdersContext = createContext<ServiceOrdersContextContainer | null>(null);

export const ServiceOrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ordersRepo, logsRepo, financeRepo, clientsRepo } = useRepositories();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  const financialHooks = useMemo(
    () => new OrderFinancialHooks(financeRepo, clientsRepo),
    [financeRepo, clientsRepo]
  );

  const createOrderUseCase = useMemo(
    () => new CreateServiceOrderUseCase(ordersRepo, logsRepo, financialHooks),
    [ordersRepo, logsRepo, financialHooks]
  );
  const updateStatusUseCase = useMemo(
    () => new UpdateOrderStatusUseCase(ordersRepo, logsRepo, financialHooks),
    [ordersRepo, logsRepo, financialHooks]
  );
  const updateOrderUseCase = useMemo(
    () => new UpdateServiceOrderUseCase(ordersRepo, logsRepo),
    [ordersRepo, logsRepo]
  );

  const loadOrders = useCallback(async (forceRefresh = false) => {
    // Si ya fueron cargadas en memoria y no es un refresco forzado, evitar consultar a BD nuevamente
    if (hasLoaded && !forceRefresh) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = await ordersRepo.listOrders();
      setOrders(list.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()));
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Error al listar órdenes.');
    } finally {
      setLoading(false);
    }
  }, [ordersRepo, hasLoaded]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getOrder = async (id: string): Promise<ServiceOrder | null> => {
    // Buscar primero en la lista en memoria si ya fue cargada
    const cached = orders.find(o => o.id === id);
    if (cached) return cached;

    setLoading(true);
    setError(null);
    try {
      return await ordersRepo.getOrderById(id);
    } catch (err: any) {
      setError(err.message || 'Error al obtener orden de servicio.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (
    orderData: Omit<ServiceOrder, 'id' | 'entryDate' | 'statusHistory' | 'status'>
  ): Promise<ServiceOrder> => {
    setLoading(true);
    setError(null);
    try {
      const newOrder = await createOrderUseCase.execute(orderData, currentUser);
      await loadOrders(true);
      return newOrder;
    } catch (err: any) {
      const errMsg = err.message || 'Error al registrar la orden.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    notes?: string
  ): Promise<ServiceOrder> => {
    setLoading(true);
    setError(null);
    try {
      const updatedOrder = await updateStatusUseCase.execute(orderId, status, notes, currentUser);
      await loadOrders(true);
      return updatedOrder;
    } catch (err: any) {
      const errMsg = err.message || 'Error al actualizar estado.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (order: ServiceOrder): Promise<ServiceOrder> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateOrderUseCase.execute(order, currentUser);
      await loadOrders(true);
      return updated;
    } catch (err: any) {
      const errMsg = err.message || 'Error al modificar orden.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const uploadOrderMedia = async (orderId: string, file: File | string): Promise<string> => {
    try {
      return await ordersRepo.uploadMedia(orderId, file);
    } catch (err: any) {
      throw new Error(err.message || 'Error al subir archivo de medios.');
    }
  };

  const searchOrders = async (queryStr: string): Promise<ServiceOrder[]> => {
    if (!queryStr.trim()) {
      return orders;
    }
    return await ordersRepo.searchOrders(queryStr);
  };

  return (
    <ServiceOrdersContext.Provider
      value={{
        orders,
        loading,
        error,
        getOrder,
        createOrder,
        updateOrderStatus,
        updateOrder,
        uploadOrderMedia,
        searchOrders,
        loadOrders,
      }}
    >
      {children}
    </ServiceOrdersContext.Provider>
  );
};

export const useServiceOrders = () => {
  const context = useContext(ServiceOrdersContext);
  if (!context) {
    throw new Error('useServiceOrders debe usarse dentro de un ServiceOrdersProvider');
  }
  return context;
};
