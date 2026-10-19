# 🎯 PLAN — Rediseño de ServiceOrderDetail (reducir saturación visual)

## Objetivo
Reducir la densidad visual de la pantalla de detalle de orden de 7 tarjetas
simultáneas a 2 bloques principales + tabs internos. Mejorar el flujo del técnico
sin perder funcionalidad.

## Reglas
- NO eliminar funcionalidad existente, solo reubicarla en tabs.
- NO romper la API de `DeviceTwinViewer3D`, `useDigitalTwin`, `useServiceOrders`.
- Mantener dark mode y light mode.
- Al terminar cada sub-fase: `npm run typecheck && npm run build` debe pasar.
- Responsive obligatorio: <1024px debe verse bien en tablet/móvil.

---

## FASE 1 — Cabecera compacta

### 1.1 Rediseñar header de `ServiceOrderDetail.tsx`

**Estado actual:** ~250px de alto con logo, título gigante, badge estado grande,
QR grande, botón "Volver".

**Estado objetivo:** ~80px de alto en una sola fila:

```
[← Volver]  OR-254695 · iPhone 13 Pro · Juan Pérez   [🔍 Ingresado ▾]  [⋯]
```

Detalles:
- Botón "Volver" como ícono solo (chevron-left).
- Código de orden + modelo + cliente en una línea con separadores `·`.
- Badge de estado pequeño clickeable que abre un dropdown para cambiar estado
  rápido (llama `updateOrderStatus`).
- Botón `[⋯ Más]` abre un menú con:
  - Ver QR de seguimiento (modal)
  - Imprimir tiquete
  - Ver historial de progreso (modal)
  - Ver registro fotográfico (modal)
  - Eliminar orden (si tiene permiso)

### 1.2 Mover "Detalles del Equipo" (IMEI, Serial) a fila colapsable

Debajo de la cabecera, una fila delgada:
```
📱 IMEI: 356789...  ·  Serial: SN-ABC-123  ·  Falla: "No enciende"  [▾ Ver más]
```
Al expandir muestra el bloque actual completo de "Detalles del Equipo".

---

## FASE 2 — Layout principal de 2 columnas

### 2.1 Nueva estructura

Reemplazar el grid actual por:

```
<div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
  <div>  {/* Columna izquierda: 3D + chips lista */}  </div>
  <div>  {/* Columna derecha: Panel de tabs */}  </div>
</div>
```

En <1024px: `gridTemplateColumns: '1fr'` (colapsar a una columna).

### 2.2 Columna izquierda

- **Arriba:** `<DeviceTwinViewer3D />` pero **sin el panel flotante inferior**
  (los botones [Normal/Dañado/...] se mueven al panel derecho).
- **Abajo:** Lista horizontal de chips de componentes (no vertical):
  ```
  [🔵 Pantalla] [🟡 Batería] [🔴 Placa Madre] [🟢 Cámara] [...]
  ```
  - Cada chip: ícono estado + nombre corto.
  - Chip activo: borde primary + fondo accent suave.
  - Chip con DAMAGED: fondo rojizo tenue.
  - Scroll horizontal si no caben (`overflow-x: auto`).
  - Click en chip → selecciona la pieza en el 3D (sync bidireccional).

**Modificar `DeviceTwinViewer3D`:**
- Añadir prop `hideActionPanel?: boolean` (default false).
- Cuando es `true`, no renderiza el panel inferior flotante.
- Mantener el resto igual.

### 2.3 Columna derecha — Panel de tabs

Estructura:
```
<div className="tabs-container">
  <div className="tabs-header">
    <button data-active>Pieza</button>
    <button>Diagnóstico</button>
    <button>Presupuesto</button>
    <button>Historial</button>
  </div>
  <div className="tabs-body">
    {activeTab === 'pieza' && <TabPieza />}
    ...
  </div>
</div>
```

Crear componente `src/presentation/components/Tabs.tsx` reutilizable.

---

## FASE 3 — Contenido de cada tab

### 3.1 Tab "Pieza" (por defecto)

Muestra la pieza seleccionada en el 3D:
- Nombre grande de la pieza.
- Chip estado actual.
- 4 botones grandes en grid 2x2:
  - [🔵 Marcar OK]
  - [🔴 Marcar Dañado] (primario rojo)
  - [🛠️ Marcar Reparado]
  - [🟢 Verificar]
- Textarea "Nota técnica" (autosave on blur).
- Input "Costo del repuesto" (autosave on blur).

Si no hay pieza seleccionada: mensaje "Selecciona una pieza en el visor 3D".

### 3.2 Tab "Diagnóstico"

- **Informe técnico** (textarea grande, editable solo admin/técnico).
- **Falla reportada por el cliente** (read-only, del order).
- **Presupuesto estimado inicial** (read-only, del order).
- Botón "Guardar diagnóstico" (persiste `technicalDiagnosis` en la orden).

### 3.3 Tab "Presupuesto"

Tabla compacta:
```
Componente          Nota                Costo
─────────────────────────────────────────────
🔴 Placa Madre      Corrosión           $80,000
🔴 Cámara trasera   Lente roto          $45,000
─────────────────────────────────────────────
                      Repuestos:         $125,000
                  Mano de obra:          $30,000
                  ─────────────────────  ───────
                  TOTAL:                 $155,000
```

- Input para mano de obra (autosave).
- Input para abono inicial.
- Botón grande: **"Solicitar aprobación al cliente"**
  (cambia estado a `espera_aprobacion`).
- Badge dinámico: si TOTAL > presupuesto inicial → aviso amarillo.

### 3.4 Tab "Historial"

- Timeline vertical del `order.statusHistory`.
- Debajo, timeline del `twin.events` (más detallado).
- Scroll interno del tab.

---

## FASE 4 — Reubicar lo que se elimina del layout principal

### 4.1 Registro Fotográfico → Modal

- Mover a un modal accesible desde `[⋯ Más] → Ver registro fotográfico`.
- Mantener límite de 10 fotos y compresión.
- En el modal, grid de fotos con lightbox al click (ya existe).

### 4.2 QR de seguimiento → Modal

- Desde `[⋯ Más] → Ver QR`.
- Muestra QR grande + botón "Copiar enlace" + "Compartir por WhatsApp".

### 4.3 Detalles del Equipo → Fila colapsable (ya en Fase 1.2)

---

## FASE 5 — Sistema visual (jerarquía)

### 5.1 Reglas de estilo

Añadir a `index.css`:

```css
/* Un solo nivel de tarjeta visible */
.glass-card { 
  background: var(--bg-secondary); 
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  /* ELIMINAR sombras internas y bordes dobles */
}

/* Sub-bloques sin borde, solo fondo */
.sub-block {
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 0.85rem 1rem;
}

/* Headers de bloque */
.block-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

/* Chips de estado */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
}
.chip.normal     { background: rgba(56,189,248,0.12); color: #38bdf8; }
.chip.warning    { background: rgba(245,158,11,0.12); color: #f59e0b; }
.chip.damaged    { background: rgba(239,68,68,0.12);  color: #ef4444; }
.chip.verified   { background: rgba(16,185,129,0.12); color: #10b981; }

/* Tabs */
.tabs-container { display: flex; flex-direction: column; height: 100%; }
.tabs-header {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 1rem;
}
.tabs-header button {
  background: none;
  border: none;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tabs-header button[data-active="true"] {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

### 5.2 Reglas de contenido

- **Máximo UN botón primario (`btn-primary`) visible por tab.**
- Los demás son `btn-secondary` o `btn-ghost`.
- **Nada de `alert` ni `confirm`** — usar Toast (Fase 2 del plan anterior).
- **Iconos solo en headers de bloque**, no en cada botón pequeño.
- **Sin emojis** en labels de UI (mantener en etiquetas 3D y estados).

---

## FASE 6 — Responsive

### 6.1 Breakpoints

- **>1280px:** layout 2 columnas (60/40).
- **1024–1280px:** layout 2 columnas (55/45).
- **<1024px:** 1 columna, tabs del panel derecho se convierten en secciones
  apilables con `<details>` colapsables.
- **<768px:** chips de piezas se envuelven a 2 filas, 3D ocupa 100% ancho y
  60vh de alto.

### 6.2 Ajustes táctiles

- Botones con `min-height: 44px` en móvil (estándar Apple).
- Chips de piezas con `min-height: 36px` y padding generoso.
- El visor 3D debe permitir pinch-zoom y rotate táctil (ya lo hace OrbitControls).

---

## Criterios de aceptación

- [ ] La pantalla muestra **máximo 2 bloques con borde** (3D + Panel de tabs).
- [ ] La cabecera ocupa **< 100px de alto**.
- [ ] El técnico puede marcar una pieza como dañada en **≤ 2 clicks** desde que carga la pantalla.
- [ ] El total del presupuesto se actualiza en vivo al agregar/quitar daños.
- [ ] El QR, registro fotográfico e historial son accesibles sin scroll.
- [ ] Responsive funciona en 375px, 768px, 1024px, 1440px.
- [ ] `npm run typecheck && npm run build` pasan sin errores.
- [ ] No hay `alert` ni `confirm` nativos.
- [ ] No hay scroll dentro de scroll dentro de scroll.

---

## Prompt sugerido para Antigravity

```
Lee PLAN_REDISENO_DETALLE_ORDEN.md y ejecuta las FASES 1 a 6 en orden.

Reglas:
- NO rompas la funcionalidad existente, solo reubícala.
- Tras cada FASE, corre `npm run typecheck && npm run build`.
- Si algo falla, detente y repórtame.
- Al terminar, muéstrame un diff resumido y capturas de cómo se ve
  en 375px, 768px y 1440px.
```