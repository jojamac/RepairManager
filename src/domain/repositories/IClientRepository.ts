import { Client } from '../entities/Client';

export interface IClientRepository {
  getClientById(id: string): Promise<Client | null>;
  listClients(): Promise<Client[]>;
  createClient(clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client>;
  updateClient(client: Client): Promise<Client>;
  searchClients(query: string): Promise<Client[]>;
}
