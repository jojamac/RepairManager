export interface ClientDevice {
  brand: string;
  model: string;
  imei?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  documentId?: string; // Cédula o identificación
  devices: ClientDevice[];
  createdAt: string;
}
