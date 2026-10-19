import { ServiceOrder } from '../../domain/entities/ServiceOrder';
import { FinanceRecord } from '../../domain/entities/Finance';

export class CSVExportService {
  /**
   * Helper para descargar archivo CSV en el navegador con codificación UTF-8 con BOM
   */
  private static downloadCSV(filename: string, csvContent: string): void {
    const bom = '\uFEFF'; // BOM para que Excel abra acentos y caracteres especiales correctamente
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta la lista de Órdenes de Servicio a CSV
   */
  static exportOrdersToCSV(orders: ServiceOrder[], filename = 'ordenes_servicio.csv'): void {
    const headers = [
      'ID Orden',
      'Cliente',
      'Teléfono Cliente',
      'Marca',
      'Modelo',
      'IMEI',
      'Serial',
      'Estado',
      'Falla Reportada',
      'Costo Total (COP)',
      'Abono (COP)',
      'Saldo Pendiente (COP)',
      'Garantía (Meses)',
      'Fecha Ingreso'
    ];

    const rows = orders.map(o => [
      `"${o.id}"`,
      `"${o.clientName.replace(/"/g, '""')}"`,
      `"${o.clientPhone}"`,
      `"${o.brand}"`,
      `"${o.model}"`,
      `"${o.imei}"`,
      `"${o.serial || ''}"`,
      `"${o.status}"`,
      `"${o.reportedFailure.replace(/"/g, '""')}"`,
      o.cost,
      o.paymentAdvance,
      o.balanceDue,
      o.warrantyMonths,
      `"${new Date(o.entryDate).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(filename, csvContent);
  }

  /**
   * Exporta los registros financieros a CSV
   */
  static exportFinanceToCSV(records: FinanceRecord[], filename = 'reporte_financiero.csv'): void {
    const headers = [
      'ID Transacción',
      'Fecha',
      'Tipo',
      'Categoría',
      'Descripción',
      'Cliente',
      'Monto (COP)',
      'ID Orden Asociada'
    ];

    const rows = records.map(r => [
      `"${r.id}"`,
      `"${new Date(r.date).toLocaleString()}"`,
      `"${r.type}"`,
      `"${r.category}"`,
      `"${r.description.replace(/"/g, '""')}"`,
      `"${(r.clientName || '').replace(/"/g, '""')}"`,
      r.amount,
      `"${r.orderId || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadCSV(filename, csvContent);
  }
}
