import React, { useMemo } from 'react';

interface ChartDataItem {
  label: string;
  value: number;
}

interface CustomChartProps {
  data: ChartDataItem[];
  type: 'bar' | 'line' | 'donut';
  height?: number;
  color?: string;
}

export const CustomChart: React.FC<CustomChartProps> = ({
  data,
  type,
  height = 200,
  color = 'var(--color-primary)'
}) => {
  // Resolver color CSS dinámico var(...) a un valor resuelto en caliente
  const resolvedColor = useMemo(() => {
    if (color.startsWith('var(')) {
      const varName = color.replace(/^var\((--[\w-]+)\)$/, '$1');
      if (typeof window !== 'undefined') {
        const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (computed) return computed;
      }
      return '#3b82f6'; // Fallback a azul primario
    }
    return color;
  }, [color]);

  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No hay datos para mostrar
      </div>
    );
  }

  const values = data.map(d => d.value);
  const maxValue = Math.max(...values, 100); // Evitar división por cero

  // RENDER: GRÁFICO DE BARRAS
  if (type === 'bar') {
    const paddingLeft = 40;
    const paddingRight = 10;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const chartWidth = 500;
    const chartHeight = height;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const barWidth = (graphWidth / data.length) * 0.6;
    const gap = (graphWidth / data.length) * 0.4;

    return (
      <div style={{ width: '100%' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={height}>
          {/* Ejes y líneas de cuadrícula */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + graphHeight * (1 - ratio);
            const gridVal = Math.round(maxValue * ratio);
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={chartWidth - paddingRight} 
                  y2={y} 
                  stroke="var(--border-light)" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 4} 
                  fill="var(--text-secondary)" 
                  fontSize="10" 
                  textAnchor="end"
                >
                  {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : gridVal}
                </text>
              </g>
            );
          })}

          {/* Barras */}
          {data.map((item, index) => {
            const x = paddingLeft + index * (barWidth + gap) + gap / 2;
            const barHeight = (item.value / maxValue) * graphHeight;
            const y = paddingTop + graphHeight - barHeight;

            return (
              <g key={index}>
                {/* Barra */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx="4"
                  fill={resolvedColor}
                  opacity="0.85"
                  style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                />
                {/* Valor al hover */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  fill="var(--text-primary)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                </text>
                {/* Etiqueta Eje X */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 8}
                  fill="var(--text-secondary)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // RENDER: GRÁFICO DE LÍNEAS
  if (type === 'line') {
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = 500;
    const chartHeight = height;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const points = data.map((item, index) => {
      const x = paddingLeft + (index / (data.length - 1 || 1)) * graphWidth;
      const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;
      return { x, y, ...item };
    });

    const pathData = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaData = points.length > 0 
      ? `${pathData} L ${points[points.length - 1].x} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`
      : '';

    const gradId = `line-grad-${resolvedColor.replace(/[^\w]/g, '')}`;

    return (
      <div style={{ width: '100%' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={height}>
          {/* Cuadrícula horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + graphHeight * (1 - ratio);
            const gridVal = Math.round(maxValue * ratio);
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={chartWidth - paddingRight} 
                  y2={y} 
                  stroke="var(--border-light)" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 4} 
                  fill="var(--text-secondary)" 
                  fontSize="10" 
                  textAnchor="end"
                >
                  {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : gridVal}
                </text>
              </g>
            );
          })}

          {/* Área sombreada */}
          {areaData && (
            <path
              d={areaData}
              fill={`url(#${gradId})`}
              opacity="0.15"
            />
          )}

          {/* Línea de datos */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke={resolvedColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos y etiquetas */}
          {points.map((p, index) => (
            <g key={index}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--bg-secondary)"
                stroke={resolvedColor}
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={chartHeight - 8}
                fill="var(--text-secondary)"
                fontSize="10"
                textAnchor="middle"
              >
                {p.label}
              </text>
            </g>
          ))}

          {/* Definición de degradado para la línea */}
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={resolvedColor} />
              <stop offset="100%" stopColor={resolvedColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // RENDER: GRÁFICO DONUT / ROSCA
  if (type === 'donut') {
    const total = values.reduce((sum, v) => sum + v, 0);
    const radius = 50;
    const strokeWidth = 14;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerRadius;
    const center = 70;
    let accumulatedAngle = 0;

    const colors = [
      '#3b82f6',
      '#8b5cf6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#d946ef',
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
        <svg viewBox="0 0 140 140" width={height - 40} height={height - 40}>
          {total === 0 ? (
            <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="var(--border-light)" strokeWidth={strokeWidth} />
          ) : (
            data.map((item, index) => {
              const sliceShare = item.value / total;
              const strokeDasharray = `${sliceShare * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += sliceShare * circumference;

              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={innerRadius}
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                />
              );
            })
          )}
          {/* Círculo central */}
          <text x={center} y={center + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700">
            Total
          </text>
          <text x={center} y={center + 16} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">
            {total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}
          </text>
        </svg>

        {/* Leyenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: colors[index % colors.length]
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                {item.label}: <strong>{item.value}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
