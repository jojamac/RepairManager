import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './config';

export interface ShopInfo {
  name: string;
  subtitle: string;
  nit: string;
  phone: string;
  address: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  maxPinAttempts?: number;
}

const STORAGE_KEY = 'entucel_shop_info';
const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'EnTuCel',
  subtitle: 'Servicio Técnico Especializado & Gemelo Digital 3D',
  nit: '900.123.456-7',
  phone: '300 000 0000',
  address: 'Centro Comercial Local 102',
  email: 'contacto@entucel.com',
  website: 'https://entucel.com',
  logoUrl: '',
  maxPinAttempts: 3
};

export class ShopConfigService {
  /**
   * Obtiene la información del taller desde la caché local o Firestore.
   */
  static async getShopInfo(): Promise<ShopInfo> {
    let localInfo: ShopInfo | null = null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        localInfo = JSON.parse(saved);
      } catch (e) {
        localInfo = null;
      }
    }

    if (!localInfo) {
      localInfo = { ...DEFAULT_SHOP_INFO };
    }

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'app_settings', 'shop_info');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const remoteInfo = snap.data() as ShopInfo;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteInfo));
          return remoteInfo;
        } else {
          await setDoc(docRef, localInfo);
        }
      } catch (err) {
        console.warn('Nota: Usando configuración local de taller.');
      }
    }

    return localInfo;
  }

  /**
   * Actualiza la información del taller en Firestore y localStorage.
   */
  static async saveShopInfo(info: Partial<ShopInfo>): Promise<ShopInfo> {
    const current = await this.getShopInfo();
    const updated: ShopInfo = { ...current, ...info };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'app_settings', 'shop_info');
        await setDoc(docRef, updated, { merge: true });
      } catch (err) {
        console.warn('Nota: La información se guardó localmente.');
      }
    }

    // Notificar a toda la aplicación para actualización inmediata (ej. Sidebar)
    try {
      window.dispatchEvent(new CustomEvent('entucel_shop_info_updated', { detail: updated }));
    } catch (e) {
      // Ignorar en entornos sin DOM
    }

    return updated;
  }

  /**
   * Sube un archivo de imagen como logo del taller.
   * Intenta subirlo a Firebase Storage. Si no está configurado o falla, lo convierte a DataURL Base64 optimizado.
   */
  static async uploadLogo(file: File): Promise<string> {
    if (!file) throw new Error('No se seleccionó ningún archivo de imagen.');

    // Validar tipo de imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo seleccionado debe ser una imagen válida (PNG, JPG, SVG, WebP).');
    }

    // Si Firebase Storage está activo, intentar subir a Cloud Storage
    if (isFirebaseConfigured && storage) {
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const storageRef = ref(storage, `branding/shop_logo_${Date.now()}.${fileExt}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        await this.saveShopInfo({ logoUrl: downloadUrl });
        return downloadUrl;
      } catch (error) {
        console.warn('Firebase Storage no disponible o sin permisos. Usando almacenamiento Base64 local:', error);
      }
    }

    // Alternativa: Convertir a Base64 Data URL (funciona siempre)
    const base64Url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    await this.saveShopInfo({ logoUrl: base64Url });
    return base64Url;
  }

  /**
   * Elimina el logo actual del taller
   */
  static async removeLogo(): Promise<void> {
    const current = await this.getShopInfo();
    if (current.logoUrl && current.logoUrl.includes('firebasestorage.googleapis.com') && storage) {
      try {
        const logoRef = ref(storage, current.logoUrl);
        await deleteObject(logoRef);
      } catch (e) {
        console.warn('No se pudo borrar el archivo anterior de Storage:', e);
      }
    }

    await this.saveShopInfo({ logoUrl: '' });
  }
}

