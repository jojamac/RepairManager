import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const STORAGE_KEY = 'entucel_custom_brands';
const DEFAULT_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Realme', 'Honor', 'Infinix'];

export class BrandService {
  /**
   * Obtiene la lista de marcas combinando caché local y Cloud Firestore.
   */
  static async getBrands(): Promise<string[]> {
    // 1. Obtener primero de localStorage para carga instantánea
    let localBrands: string[] = [];
    const savedLocal = localStorage.getItem(STORAGE_KEY);
    if (savedLocal) {
      try {
        localBrands = JSON.parse(savedLocal);
      } catch (e) {
        localBrands = [];
      }
    }

    if (!localBrands || localBrands.length === 0) {
      localBrands = [...DEFAULT_BRANDS];
    }

    // 2. Si Firebase está activo, sincronizar con Firestore (colección 'app_settings/brands')
    if (isFirebaseConfigured && db) {
      try {
        const brandRef = doc(db, 'app_settings', 'brands');
        const snap = await getDoc(brandRef);

        if (snap.exists()) {
          const remoteBrands: string[] = snap.data()?.list || [];
          const combined = Array.from(new Set([...localBrands, ...remoteBrands]));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
          return combined;
        } else {
          await setDoc(brandRef, { list: localBrands });
        }
      } catch (err) {
        console.warn('Nota: Usando caché local de marcas (sin permisos de escritura en app_settings/brands).');
      }
    }

    return localBrands;
  }

  /**
   * Agrega una nueva marca de teléfono en Firestore y en localStorage.
   */
  static async addBrand(newBrand: string): Promise<string[]> {
    const cleanBrand = newBrand.trim();
    if (!cleanBrand) return await this.getBrands();

    const currentBrands = await this.getBrands();
    if (!currentBrands.includes(cleanBrand)) {
      const updated = [...currentBrands, cleanBrand];

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Guardar en Firestore si hay permisos configurados
      if (isFirebaseConfigured && db) {
        try {
          const brandRef = doc(db, 'app_settings', 'brands');
          await setDoc(brandRef, { list: updated }, { merge: true });
        } catch (err) {
          console.warn('Nota: La marca se guardó en localStorage. Para sincronizarla en la nube, asegúrate de permitir escritura en la colección "app_settings" en Firebase Security Rules.');
        }
      }
      return updated;
    }

    return currentBrands;
  }
}
