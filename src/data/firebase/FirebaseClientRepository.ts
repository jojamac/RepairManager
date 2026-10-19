import { IClientRepository } from '../../domain/repositories/IClientRepository';
import { Client } from '../../domain/entities/Client';
import { db } from './config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';

export class FirebaseClientRepository implements IClientRepository {
  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase no está configurado. Por favor define las variables de entorno en el archivo .env');
    }
  }

  async getClientById(id: string): Promise<Client | null> {
    this.checkFirebase();
    const docRef = doc(db!, 'clients', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as Client;
  }

  async listClients(): Promise<Client[]> {
    this.checkFirebase();
    const querySnap = await getDocs(query(collection(db!, 'clients'), orderBy('createdAt', 'desc')));
    const clients: Client[] = [];
    querySnap.forEach((docSnap) => {
      clients.push(docSnap.data() as Client);
    });
    return clients;
  }

  async createClient(clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    this.checkFirebase();
    const clientId = `CL-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const newClient: Client = {
      ...clientData,
      id: clientId,
      createdAt: now,
    };

    await setDoc(doc(db!, 'clients', clientId), newClient);
    return newClient;
  }

  async updateClient(client: Client): Promise<Client> {
    this.checkFirebase();
    await setDoc(doc(db!, 'clients', client.id), client);
    return client;
  }

  async searchClients(queryStr: string): Promise<Client[]> {
    this.checkFirebase();
    const clients = await this.listClients();
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
