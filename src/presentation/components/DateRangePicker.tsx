import React from 'react';
import { Calendar } from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset: DatePreset;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const handlePresetChange = (preset: DatePreset) => {
    const today = new Date();
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    if (preset === 'today') {
      startDate = endDate;
    } else if (preset === 'this_week') {
      const firstDayOfWeek = new Date(today);
      const day = today.getDay() || 7; // Ajustar domingo = 7
      firstDayOfWeek.setDate(today.getDate() - day + 1);
      startDate = firstDayOfWeek.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = firstDayOfMonth.toISOString().split('T')[0];
    } else if (preset === 'all') {
      startDate = '';
      endDate = '';
    }

    onChange({
      preset,
      startDate,
      endDate
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <Calendar size={15} /> Rango de Fechas:
      </span>
      
      <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-tertiary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
        {[
          { key: 'all', label: 'Todo' },
          { key: 'today', label: 'Hoy' },
          { key: 'this_week', label: 'Esta Semana' },
          { key: 'this_month', label: 'Este Mes' },
          { key: 'custom', label: 'Personalizado' },
        ].map((p) => (
          <button
            key={p.key}
            type="button"
            className="btn"
            onClick={() => handlePresetChange(p.key as DatePreset)}
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.78rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: value.preset === p.key ? 'var(--color-primary)' : 'transparent',
              color: value.preset === p.key ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: value.preset === p.key ? 700 : 500
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
          <input
            type="date"
            className="form-input"
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
            value={value.startDate}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>a</span>
          <input
            type="date"
            className="form-input"
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
            value={value.endDate}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Función utilitaria para verificar si una fecha ISO/string cae dentro del rango seleccionado
 */
export function isDateInRange(dateStr: string | Date, range: DateRange): boolean {
  if (range.preset === 'all' || (!range.startDate && !range.endDate)) {
    return true;
  }
  const dateVal = new Date(dateStr).getTime();
  if (isNaN(dateVal)) return true;

  if (range.startDate) {
    const start = new Date(`${range.startDate}T00:00:00`).getTime();
    if (dateVal < start) return false;
  }

  if (range.endDate) {
    const end = new Date(`${range.endDate}T23:59:59.999`).getTime();
    if (dateVal > end) return false;
  }

  return true;
}
