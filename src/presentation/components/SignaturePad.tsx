import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  defaultValue?: string;
  readOnly?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onClear,
  defaultValue = '',
  readOnly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar contexto de dibujo
    ctx.strokeStyle = '#3b82f6'; // Color primario
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Cargar firma predeterminada si existe
    if (defaultValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = defaultValue;
      setHasSigned(true);
    }
  }, [defaultValue]);

  // Obtener coordenadas corregidas para touch/mouse
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | TouchEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Si es evento touch
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    // Si es evento mouse
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas && hasSigned) {
      onSave(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    if (onClear) onClear();
    onSave('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '180px', 
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-sm)',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block', 
            cursor: readOnly ? 'default' : 'crosshair',
            touchAction: 'none'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {readOnly && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px', 
              fontSize: '0.7rem', 
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 700
            }}
          >
            Solo Lectura
          </div>
        )}
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Dibuje su firma con el dedo o mouse dentro del recuadro
          </span>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
            onClick={clearCanvas}
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
};
