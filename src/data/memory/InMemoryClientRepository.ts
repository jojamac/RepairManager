import { IClientRepository } from '../../domain/repositories/IClientRepository';
import { Client } from '../../domain/entities/Client';

const CLIENTS_KEY = 'entucel_clients';

const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'CL-88392',
    name: 'María Alejandra Gómez',
    phone: '3157654321',
    email: 'maria.gomez@email.com',
    documentId: '1020304050',
    devices: [
      { brand: 'Samsung', model: 'Galaxy S21 Ultra', imei: '862948078392019' }
    ],
    createdAt: '2026-05-15T09:00:00Z',
  },
  {
    id: 'CL-39201',
    name: 'Juan Fernando Restrepo',
    phone: '3009876543',
    email: 'juan.restrepo@email.com',
    documentId: '987654321',
    devices: [
      { brand: 'Apple', model: 'iPhone 13 Pro', imei: '359182039485762' }
    ],
    createdAt: '2026-05-20T11:30:00Z',
  },
  {
    id: 'CL-11029',
    name: 'Diana Carolina Hoyos',
    phone: '3124445566',
    email: 'diana.hoyos@email.com',
    documentId: '1122334455',
    devices: [
      { brand: 'Xiaomi', model: 'Redmi Note 11', imei: '869038291038472' }
    ],
    createdAt: '2026-06-02T14:15:00Z',
  },
  {
    id: 'CL-55428',
    name: 'Roberto Carlos Díaz',
    phone: '3205556677',
    email: 'roberto.diaz@email.com',
    documentId: '7766554433',
    devices: [
      { brand: 'Motorola', model: 'Moto Edge 30', imei: '354892019384729' }
    ],
    createdAt: '2026-06-10T16:00:00Z',
  }
];

export class InMemoryClientRepository implements IClientRepository {
  constructor() {
    if (!localStorage.getItem(CLIENTS_KEY)) {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(DEFAULT_CLIENTS));
    }
  }

  private getClients(): Client[] {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
  }

  private saveClients(clients: Client[]) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  }

  async getClientById(id: string): Promise<Client | null> {
    const clients = this.getClients();
    return clients.find(c => c.id === id) || null;
  }

  async listClients(): Promise<Client[]> {
    return this.getClients();
  }

  async createClient(clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const clients = this.getClients();
    
    // Validar teléfono duplicado
    if (clients.some(c => c.phone === clientData.phone)) {
      throw new Error('Ya existe un cliente registrado con ese número de teléfono.');
    }

    const clientId = `CL-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const newClient: Client = {
      ...clientData,
      id: clientId,
      createdAt: now,
    };

    clients.push(newClient);
    this.saveClients(clients);
    return newClient;
  }

  async updateClient(client: Client): Promise<Client> {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index === -1) throw new Error('Cliente no encontrado.');

    clients[index] = client;
    this.saveClients(clients);
    return client;
  }

  async searchClients(queryStr: string): Promise<Client[]> {
    const clients = this.getClients();
    const lowerQuery = queryStr.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.phone.toLowerCase().includes(lowerQuery) ||
        c.email?.toLowerCase().includes(lowerQuery) ||
        c.documentId?.toLowerCase().includes(lowerQuery)
    );
  }
}
