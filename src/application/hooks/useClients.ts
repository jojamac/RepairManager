import { useState, useEffect, useCallback } from 'react';
import { useRepositories } from '../../data/RepositoryContext';
import { Client } from '../../domain/entities/Client';
import { useAuth } from './useAuth';

export const useClients = () => {
  const { clientsRepo, logsRepo } = useRepositories();
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await clientsRepo.listClients();
      setClients(list);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  }, [clientsRepo]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const getClient = async (id: string): Promise<Client | null> => {
    setLoading(true);
    setError(null);
    try {
      return await clientsRepo.getClientById(id);
    } catch (err: any) {
      setError(err.message || 'Error al obtener cliente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    setLoading(true);
    setError(null);
    try {
      const newClient = await clientsRepo.createClient(clientData);

      if (currentUser) {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'CREACION_CLIENTE',
          `Se creó el cliente ${newClient.name} (Tlf: ${newClient.phone})`
        );
      }

      await loadClients();
      return newClient;
    } catch (err: any) {
      const errMsg = err.message || 'Error al registrar cliente.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (client: Client): Promise<Client> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await clientsRepo.updateClient(client);

      if (currentUser) {
        await logsRepo.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'MODIFICACION_CLIENTE',
          `Se modificaron los datos del cliente ${client.name} (ID: ${client.id})`
        );
      }

      await loadClients();
      return updated;
    } catch (err: any) {
      const errMsg = err.message || 'Error al actualizar cliente.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (queryStr: string): Promise<Client[]> => {
    if (!queryStr.trim()) {
      return clients;
    }
    return await clientsRepo.searchClients(queryStr);
  };

  return {
    clients,
    loading,
    error,
    getClient,
    createClient,
    updateClient,
    searchClients,
    loadClients,
  };
};
