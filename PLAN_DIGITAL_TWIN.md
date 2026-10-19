# 🎯 PLAN DE MEJORA — Gemelo Digital 3D (Módulo DeviceTwinViewer3D)

## Objetivo
Transformar el visor 3D actual (caja negra confusa) en una herramienta
intuitiva donde el técnico pueda: ver piezas claramente, hacer click,
marcar estado, y que los daños se acumulen en una lista visible.

## Reglas
- NO romper la API pública de `DeviceTwinViewer3D` (props existentes).
- Mantener compatibilidad con `useDigitalTwin` (repos memory + firebase).
- No introducir dependencias nuevas sin justificar (sección "Deps permitidas").
- Al terminar cada sub-fase, `npm run typecheck && npm run build` debe pasar.

---

## FASE A — Layout de 3 columnas (UX)

### A.1 Rediseñar `ServiceOrderDetail.tsx` (sección 3D)

Reemplazar el bloque actual del visor 3D por un layout de 3 columnas:

**Columna izquierda (20%):** Lista de componentes
- Item por cada componente: [icono estado] [nombre] [badge costo si > 0]
- Click en item → selecciona la pieza en el 3D (sync bidireccional)
- Item seleccionado se resalta con borde primary
- Item con status DAMAGED se muestra con fondo rojizo y borde izquierdo rojo
- Header con leyenda de colores: 🔵 OK · 🟡 Revisar · 🔴 Dañado · 🟢 Verificado

**Columna central (55%):** Visor 3D
- Mantiene `DeviceTwinViewer3D` pero sin el panel inferior flotante
- Controles arriba: [Vista Ensamblada / Despiezada] [Rayos-X on/off]

**Columna derecha (25%):** Panel de acción de la pieza seleccionada
- Nombre grande de la pieza
- Botones grandes: [🔵 OK] [🔴 Dañado] [🛠️ Reparado] [🟢 Verificado]
- Input de nota técnica (textarea pequeña)
- Input de costo de repuesto
- Botón "Guardar cambios de la pieza" (o autosave on blur)

**Debajo (100% ancho):** Resumen de daños
- Tabla con todas las piezas con status DAMAGED o REPLACEMENT_REQUIRED
- Columnas: Componente · Nota · Costo repuesto
- Fila final: Total repuestos + mano de obra + TOTAL GENERAL
- Botón "Solicitar aprobación al cliente" si supera presupuesto inicial

**Responsive:** En <1024px, colapsar a 1 columna vertical con tabs
(Componentes | 3D | Acciones | Resumen).

### A.2 Añadir tabs móviles

En pantallas <1024px, la sección 3D se vuelve tabbed:
- Tab 1: Lista de piezas
- Tab 2: Visor 3D
- Tab 3: Acciones de pieza
- Tab 4: Resumen daños

Detectar con `useMediaQuery` (crear hook `src/application/hooks/useMediaQuery.ts`).

---

## FASE B — Modelo 3D real con despiece por piezas

### B.1 Preparar carpeta de assets

Crear `/public/models/` con:
- `smartphone.glb` — modelo completo ensamblado
- `smartphone_exploded.glb` — versión con animación de explosión (opcional)
- `node-map.json` — mapeo de nombres de nodo del GLB → keys de dominio

Ejemplo de `node-map.json`:
```json
{
  "display": "Screen_Glass",
  "battery": "Battery_LiPo",
  "motherboard": "PCB_Main",
  "charging_port": "USB_C_Flex",
  "rear_camera": "Camera_Module",
  "front_camera": "Front_Cam",
  "speaker": "Speaker_Bottom",
  "microphone": "Mic_MEMS",
  "housing": "Chassis_Aluminum",
  "buttons": "Buttons_Flex",
  "face_id": "FaceID_Sensor"
}
```

### B.2 Cargar mapeo y usarlo en onClick

En `ExternalGLTFModel`:
- Cargar `node-map.json` con `useEffect` + fetch.
- En el `onClick`, resolver `e.object.name` → key de dominio vía el mapa.
- Fallback: si no está en el mapa, usar raycasting heurístico (código actual).

### B.3 Modo "Explotado" con animación suave

Instalar `@react-spring/three` (dependencia permitida).
Al activar "Vista Despiezada":
- Cada nodo del GLB que tenga key conocida se mueve a `explodedPosition`
  definida en un nuevo `exploded-positions.json` (por pieza, en unidades del modelo).
- Animación spring con `config: { tension: 120, friction: 20 }`.

Ejemplo `exploded-positions.json`:
```json
{
  "display": [0, 0.8, 0.4],
  "battery": [0.6, 0, 0.3],
  "motherboard": [-0.5, 0.3, 0.2],
  "charging_port": [0, -0.9, 0.3],
  "rear_camera": [-0.7, 0.5, 0.4],
  "housing": [0, 0, 0]
}
```

### B.4 Fallback si el GLB no existe

Si `fetch('/models/smartphone.glb')` falla:
- Renderizar el modelo procedural actual (SmartphoneComponentMesh) PERO
  con las mejoras visuales de FASE C.
- Mostrar aviso discreto: "Modelo 3D genérico (configura smartphone.glb para tu modelo)".

---

## FASE C — Feedback visual (estados, hover, selección)

### C.1 Estados con materiales específicos

Reemplazar el color plano actual por materiales completos:

```tsx
const STATUS_MATERIALS = {
  NORMAL:      { color: '#94a3b8', roughness: 0.4, metalness: 0.6, emissive: '#000000', emissiveIntensity: 0 },
  WARNING:     { color: '#f59e0b', roughness: 0.4, metalness: 0.5, emissive: '#f59e0b', emissiveIntensity: 0.15 },
  DAMAGED:     { color: '#ef4444', roughness: 0.3, metalness: 0.4, emissive: '#ef4444', emissiveIntensity: 0.4 },
  REPLACED:    { color: '#06b6d4', roughness: 0.3, metalness: 0.6, emissive: '#06b6d4', emissiveIntensity: 0.25 },
  VERIFIED:    { color: '#10b981', roughness: 0.3, metalness: 0.6, emissive: '#10b981', emissiveIntensity: 0.3 },
};
```

Aplicar en cada mesh según su estado.

### C.2 Outline en hover / selección

Usar `<Outlines>` de `@react-three/drei`:
- Hover: `<Outlines thickness={0.02} color="#38bdf8" />`
- Selección: `<Outlines thickness={0.04} color="#06b6d4" />` + `useFrame` elevación Y.

### C.3 Efecto focus (atenuar otras piezas)

Cuando hay una pieza seleccionada, aplicar a las demás:
```tsx
opacity = selectedKey && selectedKey !== thisKey ? 0.35 : 1
transparent = selectedKey && selectedKey !== thisKey
```

### C.4 Etiquetas 3D inteligentes

Usar `<Html>` con `distanceFactor={12}` + `occlude` para que se oculten detrás de otras piezas.
- Mostrar etiqueta SIEMPRE si: `status !== 'NORMAL'` OR `isSelected` OR `isHovered`.
- Etiqueta normal (no seleccionada): borde fino, fondo translúcido oscuro.
- Etiqueta dañada: borde rojo, icono ⚠️.
- Etiqueta verificada: borde verde, icono ✓.

### C.5 Modo Rayos-X con transmission real

Cambiar el material de display y housing a:
```tsx
<meshPhysicalMaterial
  transparent
  opacity={0.2}
  transmission={0.9}
  thickness={0.5}
  ior={1.5}
  color="#a5d8f3"
/>
```

---

## FASE D — Sincronización 3D ↔ Lista ↔ Resumen

### D.1 Estado compartido en `ServiceOrderDetail.tsx`

Elevar el estado `selectedTwinKey` a un contexto local (o simplemente useState + pasar props)
y compartir entre los 3 bloques: lista, visor, panel de acción.

### D.2 Sync bidireccional

- Click en lista → `setSelectedTwinKey(key)` → el 3D resalta la pieza.
- Click en pieza 3D → `setSelectedTwinKey(key)` → la lista scrollea y resalta el item.
- Al marcar DAMAGED en el panel de acción → se actualiza el 3D en vivo Y aparece
  en el resumen de daños inmediatamente.

### D.3 Resumen de daños reactivo

El bloque "Resumen de daños" debe:
- Leer `twin.components.filter(c => c.status === 'DAMAGED' || c.status === 'REPLACEMENT_REQUIRED')`.
- Recalcular el total con `useMemo` cada vez que `twin` cambie.
- Mostrar animación (fade-in) cuando se agrega un daño nuevo.
- Botón "Solicitar aprobación al cliente" que cambia el status de la orden a
  `espera_aprobacion` (usar `updateOrderStatus`).

---

## FASE E — Pulido final

### E.1 Ayuda contextual
- Tooltip flotante la primera vez que se abre el 3D: "Click en cualquier pieza para diagnosticar".
- Guardar flag en `localStorage` `entucel_twin_tutorial_seen`.

### E.2 Botón "Resetear diagnóstico"
- Botón pequeño en el panel de acciones que pone todos los componentes en NORMAL.
- Con confirmación del usuario.

### E.3 Exportar diagnóstico
- Botón "Exportar reporte de daños" que genera PDF con la lista de piezas dañadas
  + foto del 3D + costos. Usar `jsPDF` + `html2canvas` sobre el canvas WebGL.

---

## Deps permitidas (instalar solo si no están)
- `@react-spring/three` (para animaciones suaves)
- `@react-three/drei` → ya está, usar `<Outlines>`, `<Html occlude>`
- `jspdf` + `html2canvas` (Fase E.3)

---

## Criterios de aceptación
- [ ] El técnico puede ver las piezas claramente diferenciadas (no caja negra).
- [ ] Click en cualquier pieza 3D resalta Y scrollea la lista izquierda.
- [ ] Click en cualquier item de la lista resalta la pieza 3D.
- [ ] Al marcar DAMAGED, la pieza cambia visualmente Y aparece en el resumen inferior.
- [ ] El resumen inferior muestra total repuestos + mano de obra + TOTAL.
- [ ] En móvil, la sección se ve en tabs verticales.
- [ ] Si el GLB no existe, se usa fallback procedural SIN romper la app.
- [ ] `npm run typecheck && npm run build` pasan.