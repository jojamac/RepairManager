import { IServiceOrderRepository } from '../../domain/repositories/IServiceOrderRepository';
import { ServiceOrder, OrderStatus } from '../../domain/entities/ServiceOrder';
import { ValidateImeiUseCase } from '../../application/usecases/ValidateImeiUseCase';
import { db, storage } from './config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { ImageCompressor } from '../../application/utils/ImageCompressor';

export class FirebaseServiceOrderRepository implements IServiceOrderRepository {
  private checkFirebase() {
    if (!db) {
      throw new Error('Firebase no está configurado. Por favor define las variables de entorno en el archivo .env');
    }
  }

  async getOrderById(id: string): Promise<ServiceOrder | null> {
    this.checkFirebase();
    const docRef = doc(db!, 'orders', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ServiceOrder;
  }

  async listOrders(): Promise<ServiceOrder[]> {
    this.checkFirebase();
    const querySnap = await getDocs(query(collection(db!, 'orders'), orderBy('entryDate', 'desc')));
    const orders: ServiceOrder[] = [];
    querySnap.forEach((docSnap) => {
      orders.push(docSnap.data() as ServiceOrder);
    });
    return orders;
  }

  async createOrder(orderData: Omit<ServiceOrder, 'id' | 'entryDate' | 'statusHistory' | 'status'>): Promise<ServiceOrder> {
    this.checkFirebase();

    // Validar IMEI si fue provisto
    if (orderData.imei && orderData.imei.trim()) {
      const orders = await this.listOrders();
      const validator = new ValidateImeiUseCase();
      const validation = validator.execute({
        orders,
        imei: orderData.imei,
        brand: orderData.brand,
        model: orderData.model,
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    // Generar un ID incremental o aleatorio secuencial
    const orderId = `OR-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // Subir fotografías de recepción a Firebase Storage si vienen en Base64 o File
    let finalMediaUrls: string[] = [];
    if (orderData.mediaUrls && orderData.mediaUrls.length > 0) {
      try {
        finalMediaUrls = await Promise.all(
          orderData.mediaUrls.map(photo => this.uploadMedia(orderId, photo))
        );
      } catch (err) {
        console.warn('Advertencia al subir fotos de recepción a Storage, usando originales:', err);
        finalMediaUrls = orderData.mediaUrls;
      }
    }
    
    const newOrder: ServiceOrder = {
      ...orderData,
      id: orderId,
      entryDate: now,
      status: 'ingresado',
      mediaUrls: finalMediaUrls,
      statusHistory: [
        {
          status: 'ingresado',
          date: now,
          updatedBy: orderData.technicianName || 'Sistema',
          notes: 'Registro inicial de la orden de servicio.',
        },
      ],
    };

    // Eliminar propiedades undefined ya que Firestore rechaza 'undefined'
    const firestoreData = JSON.parse(JSON.stringify(newOrder));

    await setDoc(doc(db!, 'orders', orderId), firestoreData);
    return newOrder;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, notes?: string, updaterName?: string): Promise<ServiceOrder> {
    this.checkFirebase();
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    const now = new Date().toISOString();
    const updatedHistory = [
      ...order.statusHistory,
      {
        status,
        date: now,
        updatedBy: updaterName || 'Técnico',
        notes: notes || `Cambio de estado a ${status}`,
      },
    ];

    const updatedOrder = {
      ...order,
      status,
      statusHistory: updatedHistory,
    };

    // Agregar fecha de entrega si se marca como entregado
    if (status === 'entregado') {
      updatedOrder.deliveryDate = now;
      if (order.warrantyMonths > 0) {
        const warrantyDate = new Date();
        warrantyDate.setMonth(warrantyDate.getMonth() + order.warrantyMonths);
        updatedOrder.warrantyEndDate = warrantyDate.toISOString();
      }
      updatedOrder.paymentAdvance = updatedOrder.cost;
      updatedOrder.balanceDue = 0;
    }

    await updateDoc(doc(db!, 'orders', orderId), updatedOrder);
    return updatedOrder;
  }

  async updateOrder(order: ServiceOrder): Promise<ServiceOrder> {
    this.checkFirebase();
    if (order.status === 'entregado') {
      order.paymentAdvance = order.cost;
      order.balanceDue = 0;
    } else {
      order.balanceDue = Math.max(0, (order.cost || 0) - (order.paymentAdvance || 0));
    }
    const cleanData = JSON.parse(JSON.stringify(order));
    await setDoc(doc(db!, 'orders', order.id), cleanData);
    return order;
  }

  async uploadMedia(orderId: string, file: File | string): Promise<string> {
    const fileId = Math.random().toString(36).substring(7);

    // 1. Preparar archivo comprimido o DataURL Base64
    let compressedFile: File | Blob | null = null;
    let base64Fallback = '';

    if (typeof file === 'string') {
      base64Fallback = file;
    } else {
      compressedFile = await ImageCompressor.compressImage(file);
      base64Fallback = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile!);
      });
    }

    // 2. Intentar subir a Firebase Storage si está configurado
    if (storage) {
      try {
        const storageRef = ref(storage!, `orders/${orderId}/${fileId}.jpg`);
        if (typeof file === 'string') {
          const uploadResult = await uploadString(storageRef, file, 'data_url');
          return await getDownloadURL(uploadResult.ref);
        } else {
          const uploadResult = await uploadBytes(storageRef, compressedFile!);
          return await getDownloadURL(uploadResult.ref);
        }
      } catch (err: any) {
        console.warn('Firebase Storage rechazó la subida (403 u otro error). Utilizando respaldo en Base64 comprimido:', err);
        if (base64Fallback) {
          return base64Fallback;
        }
        throw err;
      }
    }

    // 3. Fallback directo si Storage no está disponible
    if (base64Fallback) {
      return base64Fallback;
    }
    throw new Error('No se pudo procesar la fotografía.');
  }

  async searchOrders(queryStr: string): Promise<ServiceOrder[]> {
    this.checkFirebase();
    const orders = await this.listOrders();
    const lowerQuery = queryStr.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(lowerQuery) ||
        o.clientName.toLowerCase().includes(lowerQuery) ||
        o.clientPhone.toLowerCase().includes(lowerQuery) ||
        o.brand.toLowerCase().includes(lowerQuery) ||
        o.model.toLowerCase().includes(lowerQuery) ||
        o.imei.toLowerCase().includes(lowerQuery) ||
        o.serial.toLowerCase().includes(lowerQuery)
    );
  }
}
