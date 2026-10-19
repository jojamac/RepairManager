import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF, useAnimations, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { DigitalTwinComponent, TwinComponentStatus } from '../../domain/entities/DigitalTwin';
import { ErrorBoundary } from './ErrorBoundary';

interface DeviceTwinViewer3DProps {
  components: DigitalTwinComponent[];
  selectedComponentKey: string | null;
  onSelectComponent: (key: string, newStatus?: TwinComponentStatus) => void;
  isXRayMode: boolean;
  onToggleXRayMode: () => void;
  interactive?: boolean;
  readOnly?: boolean;
  customModelUrl?: string;
  hideActionPanel?: boolean;
  onlyDamagedMarkers?: boolean;
}

// FASE C.1 — Materiales completos específicos por estado del Gemelo Digital 3D
const STATUS_MATERIALS: Record<string, { color: string; roughness: number; metalness: number; emissive: string; emissiveIntensity: number }> = {
  NORMAL: { color: '#94a3b8', roughness: 0.4, metalness: 0.6, emissive: '#000000', emissiveIntensity: 0 },
  WARNING: { color: '#f59e0b', roughness: 0.4, metalness: 0.5, emissive: '#f59e0b', emissiveIntensity: 0.2 },
  DAMAGED: { color: '#f97316', roughness: 0.35, metalness: 0.4, emissive: '#ea580c', emissiveIntensity: 0.35 },
  REPLACEMENT_REQUIRED: { color: '#ef4444', roughness: 0.3, metalness: 0.4, emissive: '#ef4444', emissiveIntensity: 0.45 },
  REPAIRED: { color: '#06b6d4', roughness: 0.3, metalness: 0.6, emissive: '#06b6d4', emissiveIntensity: 0.3 },
  REPLACED: { color: '#06b6d4', roughness: 0.3, metalness: 0.6, emissive: '#06b6d4', emissiveIntensity: 0.3 },
  VERIFIED: { color: '#10b981', roughness: 0.3, metalness: 0.6, emissive: '#10b981', emissiveIntensity: 0.35 },
};

// Paleta de colores REALISTAS fotorrealistas por tipo de componente mecánico
const COMPONENT_REALISTIC_COLORS: Record<string, { base: string; roughness: number; metalness: number }> = {
  display: { base: '#1e293b', roughness: 0.1, metalness: 0.9 },       // Cristal OLED negro profundo con reflejo
  housing: { base: '#475569', roughness: 0.3, metalness: 0.7 },       // Carcasa Aluminio Gris Espacial
  motherboard: { base: '#065f46', roughness: 0.5, metalness: 0.4 },   // Verde PCB Electrónico Clásico
  battery: { base: '#1c1917', roughness: 0.4, metalness: 0.2 },       // Negro Grafito / Mate Batería Litio
  charging_port: { base: '#b45309', roughness: 0.3, metalness: 0.95 }, // Cobre / Bronce Puerto USB C
  rear_camera: { base: '#0f172a', roughness: 0.1, metalness: 0.95 },  // Lente Vidrio Oscuro + Anillo de Acero
  front_camera: { base: '#0f172a', roughness: 0.1, metalness: 0.95 }, // Lente Cámara Frontal
  speaker: { base: '#334155', roughness: 0.6, metalness: 0.5 },       // Malla de Altavoz / Polímero
  microphone: { base: '#d97706', roughness: 0.2, metalness: 0.9 },    // Dorado / Cobre Micrófono MEMS
  face_id: { base: '#4338ca', roughness: 0.2, metalness: 0.8 },       // Cristal Azul Infrarrojo Biométrico
  buttons: { base: '#64748b', roughness: 0.2, metalness: 0.9 },      // Botones Metálicos Lateral
};

const getStatusBorderColor = (status: TwinComponentStatus): string => {
  switch (status) {
    case 'REPLACEMENT_REQUIRED':
      return '#ef4444'; // Rojo Falla Cambio Repuesto
    case 'DAMAGED':
      return '#f97316'; // Naranja Falla Reparable en Lab
    case 'WARNING':
      return '#f59e0b'; // Amarillo
    case 'REPAIRED':
    case 'REPLACED':
      return '#06b6d4'; // Cyan Reparado
    case 'VERIFIED':
      return '#10b981'; // Verde Verificado
    case 'NORMAL':
    default:
      return '#38bdf8'; // Azul Neón Normal
  }
};

// Componente 3D individual para cada pieza despiezada del teléfono con geometría interna realista
const SmartphoneComponentMesh: React.FC<{
  compKey: string;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  status: TwinComponentStatus;
  isSelected: boolean;
  selectedComponentKey: string | null;
  isXRayMode: boolean;
  onSelect: () => void;
}> = ({ compKey, label, position, size, status, isSelected, selectedComponentKey, isXRayMode, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const statusColor = getStatusBorderColor(status);
  const realistic = COMPONENT_REALISTIC_COLORS[compKey] || { base: '#475569', roughness: 0.3, metalness: 0.5 };
  const isScreenOrHousing = compKey === 'display' || compKey === 'housing';

  // FASE C.3 — Atenuación de opacidad para componentes no enfocados
  const isDimmed = Boolean(selectedComponentKey && selectedComponentKey !== compKey);
  const baseOpacity = isDimmed ? 0.35 : (isXRayMode ? (isScreenOrHousing ? 0.2 : 0.95) : 0.95);

  // FASE C.1 — Material de estado
  const statusMatConfig = STATUS_MATERIALS[status] || STATUS_MATERIALS['NORMAL'];

  // Si la pieza está dañada o seleccionada, el color base resalta en su material de estado
  const finalColor = (status === 'DAMAGED' || status === 'REPLACEMENT_REQUIRED')
    ? '#ef4444'
    : (hovered ? '#38bdf8' : (status !== 'NORMAL' ? statusMatConfig.color : realistic.base));

  // Animación de levitación suave si está seleccionado
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 4) * 0.05;
    }
  });

  // Renderizador específico por tipo de pieza
  const renderDetailedGeometry = () => {
    switch (compKey) {
      case 'display':
        return (
          <group>
            <mesh>
              <boxGeometry args={[size[0], size[1], size[2]]} />
              {isXRayMode ? (
                <meshPhysicalMaterial
                  transparent
                  opacity={0.2}
                  transmission={0.9}
                  thickness={0.5}
                  ior={1.5}
                  color="#a5d8f3"
                />
              ) : (
                <meshPhysicalMaterial color={finalColor} roughness={0.1} metalness={0.9} transparent opacity={baseOpacity} />
              )}
              {hovered && <Outlines thickness={0.03} color="#38bdf8" />}
              {isSelected && <Outlines thickness={0.06} color="#00f0ff" />}
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <boxGeometry args={[size[0] - 0.15, size[1] - 0.25, 0.02]} />
              <meshPhysicalMaterial color={status === 'DAMAGED' ? '#ef4444' : '#020617'} roughness={0.05} metalness={0.95} clearcoat={1.0} emissive={isSelected ? '#38bdf8' : statusMatConfig.emissive} emissiveIntensity={isSelected ? 0.8 : (statusMatConfig.emissiveIntensity || 0.2)} />
            </mesh>
            <mesh position={[0, size[1] / 2 - 0.25, 0.07]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
          </group>
        );

      case 'housing':
        return (
          <group>
            <mesh>
              <boxGeometry args={size} />
              {isXRayMode ? (
                <meshPhysicalMaterial
                  transparent
                  opacity={0.2}
                  transmission={0.9}
                  thickness={0.5}
                  ior={1.5}
                  color="#a5d8f3"
                />
              ) : (
                <meshPhysicalMaterial color="#475569" roughness={0.25} metalness={0.8} clearcoat={0.6} transparent={baseOpacity < 1} opacity={baseOpacity} />
              )}
              {hovered && <Outlines thickness={0.03} color="#38bdf8" />}
              {isSelected && <Outlines thickness={0.06} color="#00f0ff" />}
            </mesh>
          </group>
        );

      default:
        return (
          <mesh>
            <boxGeometry args={size} />
            <meshPhysicalMaterial
              color={finalColor}
              roughness={statusMatConfig.roughness}
              metalness={statusMatConfig.metalness}
              clearcoat={0.6}
              transparent={baseOpacity < 1}
              opacity={baseOpacity}
              emissive={isSelected ? '#00f0ff' : statusMatConfig.emissive}
              emissiveIntensity={isSelected ? 0.9 : statusMatConfig.emissiveIntensity}
            />
            {hovered && <Outlines thickness={0.03} color="#38bdf8" />}
            {isSelected && <Outlines thickness={0.06} color="#00f0ff" />}
          </mesh>
        );
    }
  };

  return (
    <group position={position}>
      <group
        ref={meshRef as any}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {renderDetailedGeometry()}
      </group>

      {/* Etiqueta 3D Inteligente destacada en la pieza seleccionada o en hover */}
      {(hovered || isSelected || status !== 'NORMAL') && (
        <Html position={[0, size[1] / 2 + 0.25, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            backgroundColor: isSelected ? '#0284c7' : (status === 'DAMAGED' || status === 'REPLACEMENT_REQUIRED' ? '#dc2626' : (status === 'VERIFIED' ? '#059669' : '#0f172a')),
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            border: isSelected ? '2px solid #38bdf8' : `2px solid ${statusColor}`,
            boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.9), 0 6px 16px rgba(0,0,0,0.6)' : '0 6px 16px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isSelected && <span>🎯 </span>}
            {status === 'DAMAGED' || status === 'REPLACEMENT_REQUIRED' ? '⚠️ ' : (status === 'VERIFIED' ? '✓ ' : '')}
            {label} {status !== 'NORMAL' ? `(${status})` : ''}
          </div>
        </Html>
      )}
    </group>
  );
};

const getMarkerConfig = (status: TwinComponentStatus) => {
  switch (status) {
    case 'REPLACEMENT_REQUIRED':
      return { text: '🔴 REQUIERE REPUESTO', color: '#ef4444', bgColor: '#dc2626', shadow: 'rgba(239, 68, 68, 0.9)' };
    case 'DAMAGED':
      return { text: '🟠 REPARABLE EN LAB', color: '#f97316', bgColor: '#ea580c', shadow: 'rgba(249, 115, 22, 0.9)' };
    case 'REPAIRED':
      return { text: '🛠️ REPARADO', color: '#06b6d4', bgColor: '#0891b2', shadow: 'rgba(6, 182, 212, 0.9)' };
    case 'REPLACED':
      return { text: '🔄 REEMPLAZADO', color: '#06b6d4', bgColor: '#0891b2', shadow: 'rgba(6, 182, 212, 0.9)' };
    case 'WARNING':
      return { text: '⚡ REVISIÓN', color: '#f59e0b', bgColor: '#d97706', shadow: 'rgba(245, 158, 11, 0.9)' };
    case 'VERIFIED':
      return { text: '✓ VERIFICADO', color: '#10b981', bgColor: '#059669', shadow: 'rgba(16, 185, 129, 0.9)' };
    case 'NORMAL':
    default:
      return { text: '✓ OPERATIVO', color: '#38bdf8', bgColor: '#0284c7', shadow: 'rgba(56, 189, 248, 0.7)' };
  }
};

// Marcador 3D Neón compacto con línea direccional 3D y etiqueta desfasada sin colisión
const SelectedComponentMarker3D: React.FC<{
  label: string;
  position: [number, number, number];
  status: TwinComponentStatus;
  labelOffset?: [number, number, number];
}> = ({ label, position, status, labelOffset = [0, 0.4, 0] }) => {
  const markerRef = useRef<THREE.Group>(null);
  const config = getMarkerConfig(status);
  const color = config.color;
  const bgColor = config.bgColor;

  useFrame((state) => {
    if (markerRef.current) {
      markerRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 3) * 0.02;
    }
  });

  const targetPoint = new THREE.Vector3(0, 0, 0);
  const endPoint = new THREE.Vector3(labelOffset[0], labelOffset[1], labelOffset[2]);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([targetPoint, endPoint]);

  return (
    <group ref={markerRef} position={position}>
      {/* Pequeño punto objetivo 3D en la pieza */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Línea 3D de conexión hacia el desfase de la etiqueta */}
      <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }))} />

      {/* Nodo final en el extremo de la línea */}
      <mesh position={labelOffset}>
        <sphereGeometry args={[0.03, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Insignia Flotante HTML en la posición desfasada */}
      <Html position={labelOffset} center zIndexRange={[200, 0]}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          <div style={{
            backgroundColor: bgColor,
            color: '#ffffff',
            padding: '4px 9px',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            boxShadow: `0 0 12px ${config.shadow}`,
            border: '1.5px solid rgba(255,255,255,0.95)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            lineHeight: '1.2'
          }}>
            <span>{config.text}</span>
            <span>{label.split('/')[0].trim()}</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

// Componente para cargar modelos GLTF / GLB externos fotorrealistas con soporte de animaciones de despiece
const ExternalGLTFModel: React.FC<{
  url: string;
  explodedView: boolean;
  selectedComponentKey: string | null;
  components: DigitalTwinComponent[];
  spatialLayout: Record<string, { label: string; pos: [number, number, number]; explodedPos: [number, number, number]; size: [number, number, number]; labelOffset?: [number, number, number] }>;
  onSelectComponent: (key: string) => void;
  readOnly?: boolean;
  onlyDamagedMarkers?: boolean;
}> = ({ url, explodedView, selectedComponentKey, components, spatialLayout, onSelectComponent, readOnly = false, onlyDamagedMarkers = false }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);
  const [nodeMap, setNodeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/models/node-map.json')
      .then(res => res.json())
      .then(data => setNodeMap(data))
      .catch(() => console.log('node-map.json no presente, utilizando heurística de raycasting'));
  }, []);

  const [autoScale, setAutoScale] = useState(1);
  const [autoCenter, setAutoCenter] = useState<[number, number, number]>([0, -0.1, 0]);

  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const TARGET_SIZE = 2.85; // Tamaño óptimo de exhibición (ocupa ~75% del visor)
        const calculatedScale = TARGET_SIZE / maxDim;
        setAutoScale(calculatedScale);
        setAutoCenter([
          -center.x * calculatedScale,
          -center.y * calculatedScale - 0.1,
          -center.z * calculatedScale
        ]);
      }
    }
  }, [scene]);

  useEffect(() => {
    // Reproducir la animación hasta la pose final despiezada y pausarla ahí (LoopOnce + clampWhenFinished)
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = Object.values(actions)[0];
      if (firstAction) {
        firstAction.setLoop(THREE.LoopOnce, 1);
        firstAction.clampWhenFinished = true;
        if (explodedView) {
          firstAction.reset().fadeIn(0.3).play();
        } else {
          firstAction.fadeOut(0.3);
        }
      }
    }
  }, [explodedView, actions]);

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={autoScale}
        position={autoCenter}
        rotation={[0.1, -0.2, 0]}
        onClick={(e: any) => {
          if (readOnly) return;
          e.stopPropagation();
          const meshName = (e.object?.name || '').toLowerCase();
          const parentName = (e.object?.parent?.name || '').toLowerCase();

          // 1. Mapeo directo vía node-map.json si coincide
          for (const [domainKey, nodeName] of Object.entries(nodeMap)) {
            const target = nodeName.toLowerCase();
            if (meshName.includes(target) || parentName.includes(target)) {
              onSelectComponent(domainKey);
              return;
            }
          }

          const fullName = `${meshName} ${parentName}`;

          // 1. Detección por nombre de nodo estructurado si aplica
          if (fullName.includes('frontglass') || fullName.includes('screen') || fullName.includes('display')) {
            onSelectComponent('display');
            return;
          } else if (fullName.includes('battery')) {
            onSelectComponent('battery');
            return;
          } else if (fullName.includes('mainboard') || fullName.includes('circuitboard') || fullName.includes('pcb')) {
            onSelectComponent('motherboard');
            return;
          } else if (fullName.includes('camera') || fullName.includes('flashlight')) {
            onSelectComponent('rear_camera');
            return;
          } else if (fullName.includes('simcard') || fullName.includes('lautst') || fullName.includes('onoff')) {
            onSelectComponent('buttons');
            return;
          }

          // 2. Detección por Raycasting 3D con zonas calibradas en espacio del mundo
          if (e.point) {
            const point = e.point;
            const x = point.x;
            const y = point.y;

            if (y > 0.45) {
              onSelectComponent('display');
            } else if (y >= -0.25 && y <= 0.45 && x <= 0.3 && x >= -0.7) {
              onSelectComponent('motherboard');
            } else if (y >= -0.75 && y <= 0.3 && x > 0.3) {
              onSelectComponent('battery');
            } else if (x < -0.7 && y > 0.1) {
              onSelectComponent('rear_camera');
            } else if (y < -0.75) {
              onSelectComponent('charging_port');
            } else {
              onSelectComponent('housing');
            }
          } else {
            onSelectComponent('housing');
          }
        }}
      />

      {/* Marcadores Neón 3D para la pieza seleccionada Y todas las piezas dañadas/reparadas en el diagnóstico */}
      <group scale={autoScale} position={autoCenter} rotation={[0.1, -0.2, 0]}>
        {components.map((c) => {
          const isSelected = selectedComponentKey === c.key;
          const isDamaged = c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED';
          const isRepaired = c.status === 'REPAIRED' || c.status === 'REPLACED';

          const shouldShow = onlyDamagedMarkers
            ? (isDamaged || isRepaired)
            : (isSelected || isDamaged || isRepaired);

          if (shouldShow && spatialLayout[c.key]) {
            return (
              <SelectedComponentMarker3D
                key={c.key}
                label={spatialLayout[c.key].label}
                position={explodedView ? spatialLayout[c.key].explodedPos : spatialLayout[c.key].pos}
                status={c.status}
                labelOffset={spatialLayout[c.key].labelOffset}
              />
            );
          }
          return null;
        })}
      </group>
    </group>
  );
};

// Escena Principal 3D Three.js
export const DeviceTwinViewer3D: React.FC<DeviceTwinViewer3DProps> = ({
  components,
  selectedComponentKey,
  onSelectComponent,
  isXRayMode,
  interactive = true,
  readOnly = false,
  customModelUrl,
  onlyDamagedMarkers = false,
}) => {
  const [explodedView, setExplodedView] = useState(true);
  const [glbExists, setGlbExists] = useState(true);

  // Verificar disponibilidad de smartphone.glb en /models/
  useEffect(() => {
    if (customModelUrl) {
      setGlbExists(true);
      return;
    }
    fetch('/models/smartphone.glb')
      .then(res => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('html')) {
          setGlbExists(true);
        } else {
          setGlbExists(false);
        }
      })
      .catch(() => setGlbExists(false));
  }, [customModelUrl]);

  const activeModelUrl = customModelUrl || (glbExists ? '/models/smartphone.glb' : undefined);

  // Mapeo espacial 3D con desfasamiento perimetral radiado (evita colisión visual entre etiquetas flotantes)
  const spatialLayout: Record<string, { label: string; pos: [number, number, number]; explodedPos: [number, number, number]; size: [number, number, number]; labelOffset: [number, number, number] }> = {
    display:       { label: 'Pantalla Touch / Display',  pos: [0, 0, 0.05],   explodedPos: [-1.2, 0.8, 0.6],  size: [2.2, 4.4, 0.08], labelOffset: [-0.4, 0.6, 0.2] },
    housing:       { label: 'Chasis / Carcasa',          pos: [0, 0, -0.05],  explodedPos: [0, 0, 0],          size: [2.3, 4.5, 0.15], labelOffset: [0, -0.7, 0.2] },
    motherboard:   { label: 'Placa Madre PCB',           pos: [0, 1.1, 0.02],  explodedPos: [0.2, 0.9, 0.5],   size: [1.9, 1.8, 0.12], labelOffset: [0.55, 0.6, 0.2] },
    battery:       { label: 'Batería de Litio',          pos: [0, -0.7, 0.02], explodedPos: [1.4, -0.6, 0.5],  size: [1.7, 2.2, 0.14], labelOffset: [0.65, 0.05, 0.2] },
    charging_port: { label: 'Flex Puerto de Carga',      pos: [0, -1.9, 0.02], explodedPos: [1.2, -1.5, 0.5],  size: [1.8, 0.35, 0.1], labelOffset: [0.6, -0.5, 0.2] },
    rear_camera:   { label: 'Cámaras Traseras',          pos: [-0.6, 1.4, 0.02], explodedPos: [-1.6, 0.6, 0.5], size: [0.7, 0.7, 0.2], labelOffset: [-0.7, 0.05, 0.2] },
    front_camera:  { label: 'Cámara Frontal Selfie',     pos: [0, 1.8, 0.02],  explodedPos: [-1.6, 1.2, 0.5], size: [0.35, 0.35, 0.15], labelOffset: [-0.6, 0.6, 0.2] },
    speaker:       { label: 'Altavoz Inferior',          pos: [0.6, -1.9, 0.02], explodedPos: [-1.4, -1.5, 0.5], size: [0.6, 0.3, 0.12], labelOffset: [-0.6, -0.5, 0.2] },
    microphone:    { label: 'Micrófono Principal',       pos: [-0.7, -1.95, 0.02], explodedPos: [-1.8, -1.5, 0.5], size: [0.3, 0.2, 0.08], labelOffset: [-0.7, 0.2, 0.2] },
    face_id:       { label: 'Sensor Biométrico / FaceID', pos: [0.5, 1.8, 0.02], explodedPos: [1.5, 1.2, 0.5],   size: [0.4, 0.3, 0.1], labelOffset: [0.65, 0.6, 0.2] },
    buttons:       { label: 'Flex Botones / SIM',        pos: [1.15, 0.2, 0.02], explodedPos: [1.8, 0.3, 0.4],  size: [0.15, 1.2, 0.1], labelOffset: [0.7, 0.15, 0.2] },
  };

  const selectedComp = components.find(c => c.key === selectedComponentKey);

  const getComponentStatus = (key: string): TwinComponentStatus => {
    const found = components.find(c => c.key === key);
    return found ? found.status : 'NORMAL';
  };

  return (
    <div 
      className="digital-twin-3d-container" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        minHeight: '360px', 
        background: 'radial-gradient(circle at 50% 40%, #1e293b 0%, #0f172a 70%, #030712 100%)',
        borderRadius: 'var(--border-radius-md)', 
        border: '1px solid rgba(56, 189, 248, 0.4)', 
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.6)',
        overflow: 'hidden', 
        userSelect: 'none' 
      }}
    >
      
      {/* Overlay de Controles 3D Superior */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            🎮 Gemelo Digital WebGL 3D Realista
          </span>
          {!glbExists && (
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
              Modelo 3D genérico (configura smartphone.glb para tu modelo)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', backgroundColor: explodedView ? 'var(--color-primary)' : 'rgba(30, 41, 59, 0.9)', color: 'white', border: '1px solid var(--border-medium)' }}
            onClick={() => setExplodedView(!explodedView)}
          >
            {explodedView ? '💥 Vista Despiezada (On)' : '📦 Vista Ensamblada'}
          </button>
        </div>
      </div>

      {/* Escena WebGL Realista Three.js */}
      <Canvas camera={{ position: [0, 0, 4.7], fov: 45 }}>
        {/* Iluminación de Estudio 3D con Luz Trasera de Silueta (Rim Light) */}
        <directionalLight position={[0, 0, -6]} intensity={2.2} color="#38bdf8" />
        <ambientLight intensity={1.1} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-5, 5, 5]} intensity={1.2} />
        <spotLight position={[0, 10, 0]} intensity={1.0} angle={0.6} penumbra={1} />

        {/* Renderizado de modelo 3D GLTF externo o geometrías hiperrealistas por defecto */}
        <ErrorBoundary
          fallback={
            <group rotation={[0.4, -0.4, 0]} scale={0.65}>
              {Object.entries(spatialLayout).map(([key, config]) => {
                const finalPos: [number, number, number] = explodedView ? config.explodedPos : config.pos;
                return (
                  <SmartphoneComponentMesh
                    key={key}
                    compKey={key}
                    label={config.label}
                    position={finalPos}
                    size={config.size}
                    status={getComponentStatus(key)}
                    isSelected={selectedComponentKey === key}
                    selectedComponentKey={selectedComponentKey}
                    isXRayMode={isXRayMode}
                    onSelect={() => !readOnly && onSelectComponent(key)}
                  />
                );
              })}
            </group>
          }
        >
          {activeModelUrl ? (
            <React.Suspense fallback={null}>
              <ExternalGLTFModel 
                key={activeModelUrl}
                url={activeModelUrl} 
                explodedView={explodedView}
                selectedComponentKey={selectedComponentKey}
                components={components}
                spatialLayout={spatialLayout}
                onSelectComponent={(k) => !readOnly && onSelectComponent(k)}
                readOnly={readOnly}
                onlyDamagedMarkers={onlyDamagedMarkers}
              />
            </React.Suspense>
          ) : (
            <group rotation={[0.4, -0.4, 0]} scale={0.65}>
              {Object.entries(spatialLayout).map(([key, config]) => {
                const finalPos: [number, number, number] = explodedView ? config.explodedPos : config.pos;

                return (
                  <SmartphoneComponentMesh
                    key={key}
                    compKey={key}
                    label={config.label}
                    position={finalPos}
                    size={config.size}
                    status={getComponentStatus(key)}
                    isSelected={selectedComponentKey === key}
                    selectedComponentKey={selectedComponentKey}
                    isXRayMode={isXRayMode}
                    onSelect={() => !readOnly && onSelectComponent(key)}
                  />
                );
              })}

              {/* Marcadores 3D Neón para todas las piezas diagnosticadas con falla o reparación */}
              {components.map((c) => {
                const isSelected = selectedComponentKey === c.key;
                const isDamaged = c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED';
                const isRepaired = c.status === 'REPAIRED' || c.status === 'REPLACED';

                const shouldShow = onlyDamagedMarkers
                  ? isDamaged
                  : (isSelected || isDamaged || isRepaired);

                if (shouldShow && spatialLayout[c.key]) {
                  const finalPos: [number, number, number] = explodedView ? spatialLayout[c.key].explodedPos : spatialLayout[c.key].pos;
                  return (
                    <SelectedComponentMarker3D
                      key={`marker-${c.key}`}
                      label={spatialLayout[c.key].label}
                      position={finalPos}
                      status={c.status}
                      labelOffset={spatialLayout[c.key].labelOffset}
                    />
                  );
                }
                return null;
              })}
            </group>
          )}
        </ErrorBoundary>

        {/* Orbit Controls para girar en 360° con ratón o táctil */}
        {interactive && <OrbitControls enablePan={true} enableZoom={true} minDistance={3} maxDistance={18} rotateSpeed={0.8} />}
      </Canvas>

      {/* Selector Flotante Inferior de Diagnóstico Rápido para la Pieza Seleccionada */}
      {false && selectedComp && (
        <div 
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            zIndex: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
              Pieza Seleccionada en 3D
            </span>
            <strong style={{ fontSize: '1rem', color: '#ffffff' }}>
              {selectedComp?.name}
            </strong>
          </div>

          {/* Botones de Cambiar Estado Directo */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => selectedComp && onSelectComponent(selectedComp.key, 'NORMAL')}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: selectedComp?.status === 'NORMAL' ? '#38bdf8' : 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              🔵 Estado Normal
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => selectedComp && onSelectComponent(selectedComp.key, 'DAMAGED')}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: selectedComp?.status === 'DAMAGED' || selectedComp?.status === 'REPLACEMENT_REQUIRED' ? '#ef4444' : 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              🔴 Marcar Dañado (+Presupuesto)
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => selectedComp && onSelectComponent(selectedComp.key, 'REPAIRED')}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: selectedComp?.status === 'REPAIRED' || selectedComp?.status === 'REPLACED' ? '#06b6d4' : 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              🛠️ Reparado / Repuesto
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => selectedComp && onSelectComponent(selectedComp.key, 'VERIFIED')}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: selectedComp?.status === 'VERIFIED' ? '#10b981' : 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              🟢 Verificado & Aprobado QC
            </button>
          </div>
        </div>
      )}

      {/* Indicador de ayuda si no hay pieza seleccionada */}
      {false && !selectedComp && (
        <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '0.25rem 0.85rem', borderRadius: '20px', fontSize: '0.72rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none' }}>
          👆 Arrastre para girar 360° | Haga clic en cualquier repuesto para cambiar su estado
        </div>
      )}
    </div>
  );
};
