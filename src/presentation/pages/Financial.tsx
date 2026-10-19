import React, { useState } from 'react';
import { useFinance } from '../../application/hooks/useFinance';
import { DollarSign, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, X, FileText, Trash2, Download } from 'lucide-react';
import { FinanceType, FinanceCategory } from '../../domain/entities/Finance';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { PDFExportService } from '../../application/services/PDFExportService';
import { CSVExportService } from '../../application/services/CSVExportService';
import { DateRangePicker, DateRange, isDateInRange } from '../components/DateRangePicker';

interface FinancialProps {
  onPromoteQuoteToOrder: (clientName: string, description: string, amount: number) => void;
}

export const Financial: React.FC<FinancialProps> = ({ onPromoteQuoteToOrder }) => {
  const { records, quotes, summary, createTransaction, createQuote, deleteTransaction } = useFinance();
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: '',
    endDate: ''
  });

  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);

  // Form states for transaction
  const [txType, setTxType] = useState<FinanceType>('ingreso');
  const [txCategory, setTxCategory] = useState<FinanceCategory>('reparacion');
  const [txAmount, setTxAmount] = useState(0);
  const [txDescription, setTxDescription] = useState('');
  const [txClientName, setTxClientName] = useState('');

  // Form states for quote
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteClientName, setQuoteClientName] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!txAmount || !txDescription) {
      setError('Monto y Descripción son campos obligatorios.');
      return;
    }

    try {
      await createTransaction(
        txType,
        txCategory,
        Number(txAmount),
        txDescription,
        undefined, // Sin ID de orden directo desde finanzas generales
        txClientName || undefined
      );

      // Limpiar y cerrar modal
      setTxAmount(0);
      setTxDescription('');
      setTxClientName('');
      setShowAddTxModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la transacción.');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!quoteAmount || !quoteDescription || !quoteClientName) {
      setError('Todos los campos son obligatorios para cotizaciones.');
      return;
    }

    try {
      await createQuote(Number(quoteAmount), quoteDescription, quoteClientName);
      
      // Limpiar y cerrar modal
      setQuoteAmount(0);
      setQuoteDescription('');
      setQuoteClientName('');
      setShowAddQuoteModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la cotización.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const categoryLabels: Record<string, string> = {
    reparacion: 'Reparación Técnica',
    abono: 'Abono Inicial',
    repuesto: 'Compra de Repuesto',
    servicio: 'Mantenimiento / Software',
    nomina: 'Nómina Personal',
    alquiler: 'Alquiler / Servicios Públicos',
    otros: 'Otros Conceptos'
  };

  // Filtrar registros financieros según el rango seleccionado
  const filteredRecords = records.filter(r => isDateInRange(r.date, dateRange));

  const filteredIncome = filteredRecords
    .filter(r => r.type === 'ingreso')
    .reduce((sum, r) => sum + r.amount, 0);

  const filteredExpense = filteredRecords
    .filter(r => r.type === 'egreso')
    .reduce((sum, r) => sum + r.amount, 0);

  const filteredProfit = filteredIncome - filteredExpense;

  const filteredSummary = {
    totalIncome: filteredIncome,
    totalExpense: filteredExpense,
    netProfit: filteredProfit
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Control Financiero</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Flujo de caja, cotizaciones para clientes, egresos operativos y balances de taller.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => PDFExportService.exportFinancialReport(filteredRecords, filteredSummary)}>
            <Download size={18} /> Exportar PDF
          </button>
          <button className="btn btn-secondary" onClick={() => CSVExportService.exportFinanceToCSV(filteredRecords)}>
            <Download size={18} /> Exportar CSV
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAddQuoteModal(true)}>
            <FileText size={18} /> Nueva Cotización
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddTxModal(true)}>
            <Plus size={18} /> Registrar Transacción
          </button>
        </div>
      </div>

      {/* Selector de Rango de Fechas para Finanzas */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem' }}>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Tarjetas de Resumen Financiero */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <span className="kpi-title">Ingresos Totales</span>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(filteredIncome)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowUpRight size={14} /> Entradas en período seleccionado
          </div>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <span className="kpi-title">Gastos Totales</span>
          <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(filteredExpense)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowDownRight size={14} /> Egresos en período seleccionado
          </div>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <span className="kpi-title">Balance Operativo</span>
          <div className="kpi-value">{formatCurrency(filteredProfit)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={14} /> Flujo de caja neto en período
          </div>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <span className="kpi-title">Ganancia Neta (Mes)</span>
          <div className="kpi-value" style={{ color: 'var(--color-accent)' }}>{formatCurrency(summary.monthlyProfit)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Rendimiento histórico del mes
          </div>
        </div>
      </div>

      {/* Grid Principal: Transacciones y Cotizaciones */}
      <div className="content-grid">
        
        {/* Historial Financiero (Izquierda) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} className="text-secondary" /> Historial de Caja
          </h3>

          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto / Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td>
                      <div>
                        <strong>{categoryLabels[rec.category]}</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem' }} className={rec.type === 'ingreso' ? 'badge-listo' : 'badge-espera_aprobacion'}>
                          {rec.type.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{rec.description}</td>
                    <td style={{ fontWeight: 600, color: rec.type === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {rec.type === 'ingreso' ? '+' : '-'}{formatCurrency(rec.amount)}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', borderColor: 'var(--color-danger)' }}
                        onClick={async () => {
                          const isConfirmed = await confirmDialog.confirm({
                            title: 'Eliminar transacción',
                            message: '¿Está seguro de que desea eliminar este registro financiero de la caja?',
                            type: 'danger',
                            confirmText: 'Eliminar',
                          });
                          if (isConfirmed) {
                            try {
                              await deleteTransaction(rec.id);
                              toast.success('Transacción eliminada.');
                            } catch (err: any) {
                              toast.error(err.message || 'Error al eliminar transacción.');
                            }
                          }
                        }}
                      >
                        <Trash2 size={12} className="text-danger" />
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
                      No hay transacciones de caja registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cotizaciones Activas (Derecha) */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-secondary" /> Cotizaciones Activas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
            {quotes.map((quote) => (
              <div 
                key={quote.id}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-tertiary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{quote.id}</span>
                  <strong style={{ color: 'var(--color-accent)' }}>{formatCurrency(quote.amount)}</strong>
                </div>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{quote.description}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                  Cliente: {quote.clientName}
                </span>

                <button 
                  className="btn btn-primary w-full"
                  style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                  onClick={() => onPromoteQuoteToOrder(quote.clientName || '', quote.description, quote.amount)}
                >
                  Promover a Orden de Trabajo
                </button>
              </div>
            ))}

            {quotes.length === 0 && (
              <div className="text-center" style={{ color: 'var(--text-muted)', padding: '2rem' }}>
                No hay cotizaciones activas pendientes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Registrar Transacción */}
      {showAddTxModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Transacción de Caja</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowAddTxModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTx}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {error && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-danger)' }}>
                    {error}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Movimiento</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="radio" 
                        name="txType" 
                        checked={txType === 'ingreso'} 
                        onChange={() => { setTxType('ingreso'); setTxCategory('reparacion'); }} 
                      /> Ingreso
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="radio" 
                        name="txType" 
                        checked={txType === 'egreso'} 
                        onChange={() => { setTxType('egreso'); setTxCategory('repuesto'); }} 
                      /> Gasto / Egreso
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Categoría</label>
                  <select 
                    className="form-select"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as FinanceCategory)}
                  >
                    {txType === 'ingreso' ? (
                      <>
                        <option value="reparacion">Reparación Técnica</option>
                        <option value="abono">Abono Inicial</option>
                        <option value="servicio">Mantenimiento / Software</option>
                        <option value="otros">Otros Ingresos</option>
                      </>
                    ) : (
                      <>
                        <option value="repuesto">Compra de Repuesto</option>
                        <option value="nomina">Nómina Personal</option>
                        <option value="alquiler">Alquiler / Servicios Públicos</option>
                        <option value="otros">Otros Gastos</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Monto de la transacción"
                    value={txAmount || ''}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Descripción / Detalle *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Detalles de la transacción..."
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre del Cliente (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Para asociar ingreso a cliente..."
                    value={txClientName}
                    onChange={(e) => setTxClientName(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTxModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Cotización */}
      {showAddQuoteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Nueva Cotización</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowAddQuoteModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {error && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-danger)' }}>
                    {error}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre del Cliente *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nombre completo del cliente interesado..."
                    value={quoteClientName}
                    onChange={(e) => setQuoteClientName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto Presupuestado ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Monto cotizado..."
                    value={quoteAmount || ''}
                    onChange={(e) => setQuoteAmount(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Detalles del Presupuesto (Trabajo a realizar) *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="ej. Cambio de pantalla original iPhone X y limpieza interna..."
                    value={quoteDescription}
                    onChange={(e) => setQuoteDescription(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddQuoteModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
