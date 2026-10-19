import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServiceOrder } from '../../domain/entities/ServiceOrder';
import { ShopInfo } from '../../data/firebase/ShopConfigService';

export class PDFExportService {
  /**
   * Genera y descarga el Tiquete PDF de la Orden de Servicio
   */
  static exportOrderTicket(order: ServiceOrder, shopInfo?: ShopInfo | null): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 180], // Formato Ticket Térmico 80mm
    });

    const shopName = shopInfo?.name || 'EnTuCel Repair';
    const shopPhone = shopInfo?.phone || '315 765 4321';
    const shopAddress = shopInfo?.address || 'Calle Principal #10-20';
    const shopNit = shopInfo?.nit ? `NIT: ${shopInfo.nit}` : '';

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(shopName, 40, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (shopNit) doc.text(shopNit, 40, 15, { align: 'center' });
    doc.text(`${shopAddress} | Tel: ${shopPhone}`, 40, 19, { align: 'center' });

    doc.setLineWidth(0.3);
    doc.line(5, 23, 75, 23);

    // Datos del Tiquete
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TIQUETE DE RECEPCIÓN`, 40, 29, { align: 'center' });
    doc.text(`ORDEN: ${order.id}`, 40, 35, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const entryDateStr = new Date(order.entryDate).toLocaleString();
    doc.text(`Fecha Ingreso: ${entryDateStr}`, 5, 43);
    doc.text(`Cliente: ${order.clientName}`, 5, 48);
    doc.text(`Teléfono: ${order.clientPhone}`, 5, 53);

    doc.line(5, 56, 75, 56);

    // Detalles del Dispositivo
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL DISPOSITIVO:', 5, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`Marca/Modelo: ${order.brand} ${order.model}`, 5, 67);
    doc.text(`IMEI: ${order.imei}`, 5, 72);
    doc.text(`Serial: ${order.serial || 'N/A'}`, 5, 77);

    let lockText = 'Sin Clave';
    if (order.securityLockType === 'pin') {
      lockText = `PIN/Clave: ${order.securityLockCode || 'Registrada'}`;
    } else if (order.securityLockType === 'pattern' && order.securityLockPattern) {
      lockText = `Patrón: [${order.securityLockPattern.join('-')}]`;
    }
    doc.text(`Seguridad: ${lockText}`, 5, 82);

    doc.line(5, 85, 75, 85);

    // Falla Reportada
    doc.setFont('helvetica', 'bold');
    doc.text('FALLA REPORTADA:', 5, 90);
    doc.setFont('helvetica', 'normal');
    const splitFailure = doc.splitTextToSize(order.reportedFailure, 70);
    doc.text(splitFailure, 5, 95);

    const failureHeight = splitFailure.length * 4;
    const currentY = 95 + failureHeight + 2;

    doc.line(5, currentY, 75, currentY);

    // Presupuesto y Valores
    const formatCop = (val: number) => `$ ${val.toLocaleString('es-CO')}`;

    doc.setFont('helvetica', 'bold');
    doc.text(`Costo Total Estimado: ${formatCop(order.cost)}`, 5, currentY + 6);
    doc.text(`Abono Realizado: ${formatCop(order.paymentAdvance)}`, 5, currentY + 11);
    doc.text(`Saldo Restante: ${formatCop(order.balanceDue)}`, 5, currentY + 16);

    doc.line(5, currentY + 20, 75, currentY + 20);

    // Términos y Garantía
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`* Garantía: ${order.warrantyMonths} meses sobre el trabajo realizado.`, 5, currentY + 26);
    doc.text('* Conservar este tiquete para reclamar el equipo.', 5, currentY + 30);

    // Guardar archivo PDF
    doc.save(`Tiquete_${order.id}.pdf`);
  }

  /**
   * Genera y descarga un Reporte Financiero completo en PDF
   */
  static exportFinancialReport(records: any[], summary: any, title = 'Reporte Financiero de Caja'): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('EnTuCel Repair Manager', 14, 15);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 23);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 28);

    // Resumen KPI en Cajas
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 33, 55, 20, 'F');
    doc.rect(75, 33, 55, 20, 'F');
    doc.rect(136, 33, 60, 20, 'F');

    const formatCop = (val: number) => `$ ${val.toLocaleString('es-CO')}`;

    doc.setFontSize(8);
    doc.text('INGRESOS TOTALES', 18, 39);
    doc.text('GASTOS TOTALES', 79, 39);
    doc.text('BALANCE NETO', 140, 39);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatCop(summary.totalIncome), 18, 47);

    doc.setTextColor(239, 68, 68);
    doc.text(formatCop(summary.totalExpense), 79, 47);

    doc.setTextColor(59, 130, 246);
    doc.text(formatCop(summary.totalIncome - summary.totalExpense), 140, 47);

    // Tabla de Transacciones
    const tableData = records.map((r) => [
      new Date(r.date).toLocaleDateString(),
      r.type.toUpperCase(),
      r.category,
      r.description,
      formatCop(r.amount),
    ]);

    autoTable(doc, {
      startY: 58,
      head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    doc.save(`Reporte_Financiero_${Date.now()}.pdf`);
  }
}
