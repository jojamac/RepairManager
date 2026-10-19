import React, { useState } from 'react';
import { ServiceOrder } from '../../../../domain/entities/ServiceOrder';
import { 
  DigitalTwinInstance, 
  getOriginalDiagnosticStatus, 
  getWorkshopOutcome 
} from '../../../../domain/entities/DigitalTwin';
import { 
  Camera, 
  CameraOff, 
  Wrench, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  Inbox,
  ShieldCheck,
  Package
} from 'lucide-react';

interface DeliveryShowcasePanelProps {
  order: ServiceOrder;
  twin: DigitalTwinInstance;
  selectedComponentKey?: string | null;
  onSelectComponent?: (key: string) => void;
}

export const DeliveryShowcasePanel: React.FC<DeliveryShowcasePanelProps> = ({
  order,
  twin,
}) => {
  const [activeTab, setActiveTab] = useState<'evidences' | 'reception' | 'parts'>('evidences');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  const repairEvidences = order.repairMediaUrls || [];
  const receptionPhotos = order.mediaUrls || [];
  
  // Trazabilidad completa: Identificar todas las piezas intervenidas consultando estado, notas, costos y eventos
  const intervenedParts = twin.components.filter(c => {
    const outcome = getWorkshopOutcome(c, twin.events);
    const origDiag = getOriginalDiagnosticStatus(c, twin.events);
    return outcome === 'REPLACED' || 
           outcome === 'REPAIRED' || 
           origDiag === 'DAMAGED' || 
           origDiag === 'REPLACEMENT_REQUIRED' ||
           Boolean(c.diagnosisNote && c.diagnosisNote.trim().length > 0) ||
           Boolean((c.replacementCost ?? 0) > 0);
  });

  const openLightbox = (images: string[], index: number, title: string) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxTitle(title);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setLightboxImages([]);
    setLightboxTitle('');
  };

  const nextLightbox = () => {
    if (lightboxIndex === null || lightboxImages.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % lightboxImages.length);
  };

  const prevLightbox = () => {
    if (lightboxIndex === null || lightboxImages.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length);
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', minHeight: '480px' }}>
      
      {/* Selector de Pestañas Superior */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid var(--border-light)', 
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Tab 1: Evidencias de Reparación */}
          <button
            type="button"
            onClick={() => setActiveTab('evidences')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'evidences' ? 800 : 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: activeTab === 'evidences' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'evidences' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'evidences' ? 'var(--color-primary)' : 'var(--border-light)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Camera size={16} />
            <span>Evidencias de Reparación</span>
            <span 
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.1rem 0.45rem', 
                borderRadius: '10px', 
                backgroundColor: activeTab === 'evidences' ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
                fontWeight: 800
              }}
            >
              {repairEvidences.length}
            </span>
          </button>

          {/* Tab 2: Fotos de Recepción */}
          {receptionPhotos.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('reception')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.85rem',
                fontWeight: activeTab === 'reception' ? 800 : 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: activeTab === 'reception' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                color: activeTab === 'reception' ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${activeTab === 'reception' ? 'var(--color-primary)' : 'var(--border-light)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Inbox size={16} />
              <span>Fotos de Ingreso</span>
              <span 
                style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.1rem 0.45rem', 
                  borderRadius: '10px', 
                  backgroundColor: activeTab === 'reception' ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
                  fontWeight: 800
                }}
              >
                {receptionPhotos.length}
              </span>
            </button>
          )}

          {/* Tab 3: Repuestos y Piezas Intervenidas */}
          <button
            type="button"
            onClick={() => setActiveTab('parts')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'parts' ? 800 : 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: activeTab === 'parts' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
              color: activeTab === 'parts' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'parts' ? 'var(--color-primary)' : 'var(--border-light)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Wrench size={16} />
            <span>Repuestos y Trabajo Realizado</span>
            <span 
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.1rem 0.45rem', 
                borderRadius: '10px', 
                backgroundColor: activeTab === 'parts' ? 'rgba(255,255,255,0.25)' : 'var(--border-light)',
                fontWeight: 800
              }}
            >
              {intervenedParts.length}
            </span>
          </button>
        </div>

        {/* Indicador de Certificación */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 700 }}>
          <CheckCircle2 size={16} />
          <span>Pruebas Superadas</span>
        </div>
      </div>

      {/* CONTENIDO 1: Galería de Evidencias de Reparación */}
      {activeTab === 'evidences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Registro Fotográfico de Taller
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Fotografías tomadas por el técnico para certificar la intervención realizada y el funcionamiento del equipo.
            </p>
          </div>

          {repairEvidences.length > 0 ? (
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: '1rem' 
              }}
            >
              {repairEvidences.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => openLightbox(repairEvidences, idx, `Evidencia de Taller #${idx + 1}`)}
                  style={{
                    position: 'relative',
                    height: '240px',
                    borderRadius: 'var(--border-radius-sm)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <img
                    src={url}
                    alt={`Evidencia ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  
                  {/* Badge superior */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      left: '0.5rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Camera size={13} />
                    <span>Evidencia #{idx + 1}</span>
                  </div>

                  {/* Overlay inferior de ampliar */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.5rem 0.75rem',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 600
                    }}
                  >
                    <span>Click para ampliar</span>
                    <Maximize2 size={14} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              style={{ 
                padding: '3rem 1.5rem', 
                textAlign: 'center', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderRadius: 'var(--border-radius-sm)',
                border: '1px dashed var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div 
                style={{ 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                <CameraOff size={28} />
              </div>
              <div>
                <h5 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Sin registro fotográfico de taller
                </h5>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', maxWidth: '380px' }}>
                  El técnico completó la intervención sin adjuntar fotografías de evidencia. Las pruebas de calidad se registraron en el certificado adjunto.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO 2: Fotos de Ingreso / Recepción */}
      {activeTab === 'reception' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Registro Fotográfico de Ingreso
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Fotografías del estado estético y físico del dispositivo capturadas al momento de recibir la orden.
            </p>
          </div>

          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '1rem' 
            }}
          >
            {receptionPhotos.map((url, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(receptionPhotos, idx, `Foto de Ingreso #${idx + 1}`)}
                style={{
                  position: 'relative',
                  height: '240px',
                  borderRadius: 'var(--border-radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <img
                  src={url}
                  alt={`Ingreso ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px'
                  }}
                >
                  Ingreso #{idx + 1}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.5rem 0.75rem',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 600
                  }}
                >
                  <span>Click para ampliar</span>
                  <Maximize2 size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENIDO 3: Repuestos y Trabajo Realizado */}
      {activeTab === 'parts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Detalle de Repuestos y Trabajo Técnico
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Resumen de componentes sustituidos, reparaciones efectuadas y garantía aplicable.
            </p>
          </div>

          {/* Tarjeta de Diagnóstico Técnico */}
          {order.technicalDiagnosis && (
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', borderLeft: '4px solid var(--color-primary)' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                Diagnóstico Técnico de Cierre:
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {order.technicalDiagnosis}
              </p>
            </div>
          )}

          {/* Lista de Componentes Intervenidos con Trazabilidad Completa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {intervenedParts.length > 0 ? (
              intervenedParts.map((comp) => {
                const outcome = getWorkshopOutcome(comp, twin.events);
                const origDiag = getOriginalDiagnosticStatus(comp, twin.events);
                const isReplaced = outcome === 'REPLACED';
                const isRepaired = outcome === 'REPAIRED';
                const isDiagReplacement = origDiag === 'REPLACEMENT_REQUIRED';

                const themeColor = isReplaced ? 'var(--color-primary)' : 'var(--color-success)';
                const bgBadge = isReplaced ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)';
                const borderBadge = isReplaced ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)';

                return (
                  <div 
                    key={comp.key}
                    style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--border-radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    {/* Encabezado: Nombre del Componente y Badge de Intervención en Taller */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div 
                          style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '8px', 
                            backgroundColor: bgBadge,
                            color: themeColor,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {isReplaced ? <Package size={18} /> : <Wrench size={18} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
                            {comp.name}
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            Componente de hardware certificado
                          </span>
                        </div>
                      </div>

                      <span 
                        style={{ 
                          fontSize: '0.78rem', 
                          fontWeight: 800, 
                          padding: '0.3rem 0.75rem', 
                          borderRadius: '14px',
                          backgroundColor: bgBadge,
                          color: themeColor,
                          border: borderBadge,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {isReplaced ? '📦 Pieza Sustituida (Repuesto Nuevo)' : isRepaired ? '🛠️ Pieza Reparada en Laboratorio' : 'Avería Corregida'}
                      </span>
                    </div>

                    {/* Trazabilidad: Diagnóstico Inicial vs Trabajo Realizado */}
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '0.65rem', 
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.82rem'
                      }}
                    >
                      {/* Columna 1: Diagnóstico Inicial */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                          📋 Diagnóstico Inicial:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span 
                            style={{ 
                              color: isDiagReplacement ? 'var(--color-danger)' : '#f97316', 
                              fontWeight: 700 
                            }}
                          >
                            {isDiagReplacement ? '🔴 Requiere Cambio de Repuesto' : '🟠 Falla Técnica Reparable'}
                          </span>
                        </div>
                        {comp.diagnosisNote ? (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                            "{comp.diagnosisNote}"
                          </span>
                        ) : null}
                      </div>

                      {/* Columna 2: Acción en Taller y Costo */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                          ⚡ Trabajo en Taller:
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {isReplaced 
                            ? 'Instalación de repuesto nuevo certificado' 
                            : isRepaired 
                              ? 'Reparación de circuito / ajuste en laboratorio' 
                              : 'Intervención y calibración concluida'}
                        </span>
                        {(comp.replacementCost ?? 0) > 0 ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.78rem' }}>
                            Costo repuesto: ${(comp.replacementCost || 0).toLocaleString()} COP
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Sin costo de repuesto adicional (cubierto en mano de obra)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-secondary)' }}>
                No se registraron cambios de piezas físicas en el despiece.
              </div>
            )}
          </div>

          {/* Garantía */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <ShieldCheck size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Garantía técnica otorgada: <strong>{order.warrantyMonths > 0 ? `${order.warrantyMonths} meses` : 'Garantía estándar de taller'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX / VISOR EN PANTALLA COMPLETA */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <div 
          className="modal-backdrop"
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backdropFilter: 'blur(6px)'
          }}
        >
          {/* Barra superior de controles */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1.5rem',
              right: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fff'
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{lightboxTitle}</h4>
              <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                {lightboxIndex + 1} de {lightboxImages.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a
                href={lightboxImages[lightboxIndex]}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.2)'
                }}
              >
                <Download size={14} /> Abrir Original
              </a>
              <button
                type="button"
                onClick={closeLightbox}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Flecha Anterior */}
          {lightboxImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevLightbox();
              }}
              style={{
                position: 'absolute',
                left: '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#fff',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Imagen Principal */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <img
              src={lightboxImages[lightboxIndex]}
              alt={lightboxTitle}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            />
          </div>

          {/* Flecha Siguiente */}
          {lightboxImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextLightbox();
              }}
              style={{
                position: 'absolute',
                right: '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#fff',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
