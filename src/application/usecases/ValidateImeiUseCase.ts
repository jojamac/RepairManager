import { ServiceOrder } from '../../domain/entities/ServiceOrder';

export interface ValidateImeiParams {
  orders: ServiceOrder[];
  imei: string;
  brand?: string;
  model?: string;
}

export interface ValidateImeiResult {
  valid: boolean;
  error?: string;
}

export class ValidateImeiUseCase {
  execute(params: ValidateImeiParams): ValidateImeiResult {
    const { orders, imei, brand, model } = params;

    if (!imei || !imei.trim()) {
      return { valid: true };
    }

    const cleanImei = imei.trim().toLowerCase();

    // Regla 1: Si existe orden con mismo IMEI y status !== 'entregado' -> error
    const activeOrder = orders.find(
      (order) => order.imei.trim().toLowerCase() === cleanImei && order.status !== 'entregado'
    );

    if (activeOrder) {
      return {
        valid: false,
        error: `El dispositivo con IMEI ${imei} ya tiene una orden activa (${activeOrder.id}) en estado ${activeOrder.status}.`,
      };
    }

    // Regla 2: Si existe orden previa con mismo IMEI y marca/modelo no coinciden -> error
    if (brand || model) {
      const mismatchedOrder = orders.find((order) => {
        if (order.imei.trim().toLowerCase() !== cleanImei) return false;
        const brandMismatch = brand && order.brand.trim().toLowerCase() !== brand.trim().toLowerCase();
        const modelMismatch = model && order.model.trim().toLowerCase() !== model.trim().toLowerCase();
        return brandMismatch || modelMismatch;
      });

      if (mismatchedOrder) {
        return {
          valid: false,
          error: `El IMEI ${imei} está registrado previamente con otra marca/modelo (${mismatchedOrder.brand} ${mismatchedOrder.model}).`,
        };
      }
    }

    return { valid: true };
  }
}
