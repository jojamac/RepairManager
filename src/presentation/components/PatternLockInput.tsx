import React, { useState, useRef, useEffect } from 'react';

interface PatternLockInputProps {
  value?: number[];
  onChange: (pattern: number[]) => void;
  readOnly?: boolean;
  size?: number;
}

export const PatternLockInput: React.FC<PatternLockInputProps> = ({
  value = [],
  onChange,
  readOnly = false,
  size = 220
}) => {
  const [selectedNodes, setSelectedNodes] = useState<number[]>(value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTouchPos, setCurrentTouchPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setSelectedNodes(value);
  }, [value]);

  const gap = size / 4;
  const nodeRadius = 14;

  const getNodeCoords = (index: number) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: gap + col * gap,
      y: gap + row * gap
    };
  };

  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const checkNodeIntersection = (pos: { x: number; y: number }) => {
    for (let i = 0; i < 9; i++) {
      const coords = getNodeCoords(i);
      const dist = Math.hypot(pos.x - coords.x, pos.y - coords.y);
      if (dist <= nodeRadius + 12) {
        return i;
      }
    }
    return null;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const pos = getPointFromEvent(e);
    if (!pos) return;
    const hitNode = checkNodeIntersection(pos);
    setIsDrawing(true);
    setCurrentTouchPos(pos);
    if (hitNode !== null) {
      const newPattern = [hitNode];
      setSelectedNodes(newPattern);
      onChange(newPattern);
    } else {
      setSelectedNodes([]);
      onChange([]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !isDrawing) return;
    const pos = getPointFromEvent(e);
    if (!pos) return;
    setCurrentTouchPos(pos);

    const hitNode = checkNodeIntersection(pos);
    if (hitNode !== null && !selectedNodes.includes(hitNode)) {
      const newPattern = [...selectedNodes, hitNode];
      setSelectedNodes(newPattern);
      onChange(newPattern);
    }
  };

  const handleEnd = () => {
    if (readOnly) return;
    setIsDrawing(false);
    setCurrentTouchPos(null);
  };

  const handleReset = () => {
    if (readOnly) return;
    setSelectedNodes([]);
    onChange([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{
          touchAction: 'none',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--border-light)',
          cursor: readOnly ? 'default' : 'pointer',
          userSelect: 'none'
        }}
      >
        {selectedNodes.map((nodeIdx, i) => {
          if (i === 0) return null;
          const prevCoords = getNodeCoords(selectedNodes[i - 1]);
          const currCoords = getNodeCoords(nodeIdx);
          return (
            <line
              key={`line-${i}`}
              x1={prevCoords.x}
              y1={prevCoords.y}
              x2={currCoords.x}
              y2={currCoords.y}
              stroke="var(--color-primary)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}

        {isDrawing && selectedNodes.length > 0 && currentTouchPos && (
          <line
            x1={getNodeCoords(selectedNodes[selectedNodes.length - 1]).x}
            y1={getNodeCoords(selectedNodes[selectedNodes.length - 1]).y}
            x2={currentTouchPos.x}
            y2={currentTouchPos.y}
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}

        {Array.from({ length: 9 }).map((_, i) => {
          const coords = getNodeCoords(i);
          const isSelected = selectedNodes.includes(i);
          const orderIndex = selectedNodes.indexOf(i);

          return (
            <g key={`node-${i}`}>
              <circle
                cx={coords.x}
                cy={coords.y}
                r={nodeRadius}
                fill={isSelected ? 'var(--color-primary)' : 'var(--bg-secondary)'}
                stroke={isSelected ? 'var(--color-primary-hover)' : 'var(--border-medium)'}
                strokeWidth="2.5"
              />
              {isSelected && (
                <text
                  x={coords.x}
                  y={coords.y + 4}
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {orderIndex + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selectedNodes.length > 0 ? `Patrón: [ ${selectedNodes.join(' ➔ ')} ]` : 'Dibuja el patrón en la matriz 3x3'}
          </span>
          {selectedNodes.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
};
