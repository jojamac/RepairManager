import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}) => {
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Calcular rango de páginas visibles alrededor de la página actual
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-light)',
        borderRadius: '0 0 var(--border-radius-md) var(--border-radius-md)',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}
    >
      {/* Información del Rango de Resultados */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>
          Mostrando <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> - <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> registros
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Por página:</span>
            <select
              className="form-input"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.8rem',
                width: 'auto',
                height: 'auto',
                borderRadius: 'var(--border-radius-sm)',
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-light)'
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Navegación de Páginas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {/* Ir a la Primera Página */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{ padding: '0.35rem 0.5rem', minWidth: 'auto', borderRadius: 'var(--border-radius-sm)' }}
          title="Primera página"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Página Anterior */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '0.35rem 0.5rem', minWidth: 'auto', borderRadius: 'var(--border-radius-sm)' }}
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Botones Numerados */}
        {getPageNumbers().map((p, idx) => {
          if (typeof p === 'string') {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: '0 0.3rem', color: 'var(--text-muted)' }}>
                ...
              </span>
            );
          }
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: p === currentPage ? 700 : 500,
                borderRadius: 'var(--border-radius-sm)',
                border: p === currentPage ? '1px solid var(--color-primary)' : '1px solid var(--border-light)',
                backgroundColor: p === currentPage ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                color: p === currentPage ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Página Siguiente */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{ padding: '0.35rem 0.5rem', minWidth: 'auto', borderRadius: 'var(--border-radius-sm)' }}
          title="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>

        {/* Ir a la Última Página */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          style={{ padding: '0.35rem 0.5rem', minWidth: 'auto', borderRadius: 'var(--border-radius-sm)' }}
          title="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
