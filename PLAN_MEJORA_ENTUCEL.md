# 🚀 PLAN DE MEJORA — EnTuCel Repair Manager

> **Reglas para el agente IA (Antigravity):**
> - Ejecutar fases en orden. No saltar.
> - Tras cada fase: `npm run typecheck && npm run build` debe pasar sin errores.
> - No romper la API pública de hooks existentes (`useAuth`, `useClients`, `useServiceOrders`, `useFinance`, `useDigitalTwin`).
> - Mantener compatibilidad con ambos providers (`memory` y `firebase`).
> - No introducir dependencias nuevas sin justificar (Fase 5 las lista permitidas).
> - Al terminar cada FASE, detenerse y reportar un resumen antes de continuar.

---

## 📑 ÍNDICE

1. [FASE 1 — Cimientos críticos (BLOQUEANTE)](#fase-1--cimientos-críticos-bloqueante)
2. [FASE 2 — UX y robustez](#fase-2--ux-y-robustez)
3. [FASE 3 — Calidad de código](#fase-3--calidad-de-código)
4. [FASE 4 — Tests](#fase-4--tests)
5. [FASE 5 — Optimizaciones y DX](#fase-5--optimizaciones-y-dx)
6. [FASE 6 — Mejoras opcionales](#fase-6--mejoras-opcionales-nice-to-have)
7. [Orden de ejecución](#-orden-de-ejecución-recomendado)
8. [Definición de Done](#-definición-de-done)

---

## FASE 1 — Cimientos críticos (BLOQUEANTE)

### 1.1 Crear `src/presentation/theme/index.css`

**Motivo:** Toda la app importa este archivo en `src/main.tsx` pero **no existe**. Sin él, no hay variables CSS ni clases base utilizadas por todos los componentes (`.glass-card`, `.btn`, `.badge-*`, `.form-input`, `.modal-overlay`, `.premium-table`, `.loading-spinner`, `.dashboard-grid`, `.content-grid`, `.table-container`, `.fade-in`, `.animate-spin`, `.text-secondary`, `.text-muted`, `.required-asterisk`, `.badge-ingresado`, `.badge-diagnostico`, `.badge-espera_aprobacion`, `.badge-reparacion`, `.badge-listo`, `.badge-entregado`, `.sidebar`, `.sidebar-brand`, `.sidebar-nav`, `.sidebar-link`, `.sidebar-footer`, `.user-avatar`, `.user-info`, `.app-container`, `.main-content`).

**Requisitos del archivo:**
- Definir variables en `:root` y `body.dark-mode` / `body.light-mode`:
  - Colores: `--color-primary`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-accent-glow`
  - Fondos: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
  - Texto: `--text-primary`, `--text-secondary`, `--text-muted`
  - Bordes: `--border-light`, `--border-medium`, `--border-radius-sm/md/lg`
  - Sombras: `--shadow-sm/md/lg`
  - Layout: `--sidebar-width: 260px`
  - Fuentes: `--font-heading: 'Outfit', sans-serif`, `--font-body: 'Inter', sans-serif`
- Reset CSS mínimo (`*, *::before, *::after { box-sizing: border-box }`, márgenes 0).
- Modo claro por defecto (`body` tiene `light-mode` en `index.html`).
- Modo oscuro conmutable vía `body.dark-mode`.
- Estilos `@media print` que oculten `.sidebar`, `.mobile-header`, `.btn`, `.modal-header`, y solo dejen visible `#printable-ticket` / `#printable-label`.
- Estilos responsivos: `.dashboard-grid` (4 col desktop → 1 col móvil), `.content-grid` (2 col desktop → 1 col móvil), `.table-container` con `overflow-x: auto`.
- Spinner animado (`@keyframes spin`).
- Badges con color según estado de orden.

**Criterio de aceptación:** La app arranca visualmente coherente en light y dark mode. Los tiquetes imprimen limpios.

---

### 1.2 Refactorizar `useDigitalTwin` para usar `RepositoryContext`

**Archivos involucrados:**
- `src/domain/repositories/IDigitalTwinRepository.ts` (ya existe)
- `src/data/RepositoryContext.tsx` → añadir `digitalTwinRepo` al `RepositoryContainer`
- `src/application/hooks/useDigitalTwin.ts` → eliminar el `USE_FIREBASE = false` hardcodeado y consumir `useRepositories().digitalTwinRepo`

**Criterio:** El hook respeta `VITE_BACKEND_PROVIDER` igual que el resto.

---

### 1.3 Extraer lógica de validación IMEI a un UseCase

**Crear:** `src/application/usecases/ValidateImeiUseCase.ts`
- Recibe lista de órdenes existentes + IMEI + brand + model a validar.
- Devuelve `{ valid: boolean; error?: string }`.
- Regla 1: si existe orden con mismo IMEI y status ≠ `entregado` → error.
- Regla 2: si existe orden con mismo IMEI y brand/model no coinciden → error.

**Modificar:**
- `InMemoryServiceOrderRepository.createOrder` y `FirebaseServiceOrderRepository.createOrder` para llamar al UseCase. Eliminar duplicación.
- `CreateServiceOrderUseCase` en `ServiceOrderUseCases.ts` para inyectar el validador.

---

### 1.4 Extraer lógica de transacciones automáticas de `InMemoryServiceOrderRepository`

**Problema:** `createOrder` y `updateOrderStatus` escriben directamente en `localStorage` de transacciones y clientes. Rompe SRP.

**Solución:**
- `InMemoryServiceOrderRepository` solo maneja órdenes.
- Crear `src/application/services/OrderFinancialHooks.ts` que:
  - Al crear orden con `paymentAdvance > 0` → llama `financeRepo.createRecord`.
  - Al entregar con `balanceDue > 0` → llama `financeRepo.createRecord`.
  - Al crear orden → llama `clientsRepo.updateClient` para agregar device.
- `CreateServiceOrderUseCase` y `UpdateOrderStatusUseCase` orquestan: primero repo de órdenes, luego los hooks.

**Criterio:** El repo de órdenes no toca `entucel_transactions` ni `entucel_clients`.

---

## FASE 2 — UX y robustez

### 2.1 Sistema de notificaciones (reemplazar `alert`/`confirm`)

**Crear:**
- `src/presentation/components/Toast.tsx` + `ToastProvider` + `useToast()`.
- `src/presentation/components/ConfirmDialog.tsx` + `useConfirm()`.

**Reemplazar todos los `alert()` y `confirm()`** en:
- `ServiceOrderDetail.tsx`
- `ServiceOrders.tsx`
- `Users.tsx`
- `Financial.tsx`
- `Clients.tsx`
- `App.tsx` (`handlePromoteQuote`)
- `InMemoryAuthRepository.ts` (throw nuevos errores en vez de `console.log`)

**Criterio:** `grep -r "alert(" src/` y `grep -r "confirm(" src/` no devuelven resultados (excepto `window.alert` dentro de Toast).

---

### 2.2 ErrorBoundary global + por sección 3D

**Crear:** `src/presentation/components/ErrorBoundary.tsx` (class component).

**Envolver:**
- `<App />` en `main.tsx` (boundary global).
- `<DeviceTwinViewer3D />` en cada uso (boundary específico que muestra fallback si falla WebGL/GLTF).

**Criterio:** Un error en el 3D no tumba la app.

---

### 2.3 Arreglar `ImageCompressor`

- Corregir `mimeType`: si `file.type === 'image/png'` → mantener PNG (para transparencia); si no → intentar WebP (`image/webp`) con fallback a JPEG.
- Añadir parámetro `format?: 'webp' | 'jpeg' | 'png'`.
- Detectar soporte WebP con `canvas.toDataURL('image/webp').indexOf('image/webp') === 5`.

---

### 2.4 Arreglar `FirebaseAuthRepository.getCurrentUser`

Reemplazar el `Promise` de un solo uso por un listener correcto:

```ts
async getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth!, async (firebaseUser) => {
      unsubscribe();
      if (!firebaseUser) return resolve(null);
      const userDocRef = doc(db!, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return resolve(null);
      const userData = userDoc.data();
      if (!userData.active) return resolve(null);
      resolve({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: userData.name || '',
        role: userData.role as UserRole,
        active: userData.active,
        createdAt: userData.createdAt || new Date().toISOString(),
      });
    });
  });
}
```

Y exponer `onAuthStateChanged` como suscripción en `AuthContext` para reflejar logout remoto.

---

### 2.5 Seguridad de contraseñas demo

- En `InMemoryAuthRepository`, mover las contraseñas a un objeto no exportado y **solo cargarlo si `import.meta.env.DEV === true`**.
- En producción con provider `memory`, exigir `setupInitialAdmin` antes de permitir login.
- Documentar en `.env.example` que `memory` no es para producción.

---

### 2.6 Tipar correctamente (eliminar `any`)

Prioridad:
- `ServiceOrders.tsx`: `filteredOrders: ServiceOrder[] | null`, `createdOrderToPrint: ServiceOrder | null`.
- `useAuth.ts` / `AuthContext.tsx`: `gender?: 'masculino' | 'femenino' | 'otro' | ''`.
- `RepositoryContext.tsx`: usar `React.useMemo<RepositoryContainer>`.
- Hooks de `DigitalTwin`: tipos ya existen, usarlos.

**Criterio:** `npm run typecheck` sin errores y `grep -rn ": any" src/` < 10 ocurrencias (idealmente 0).

---

## FASE 3 — Calidad de código

### 3.1 Configurar ESLint + Prettier

- Añadir devDeps: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `prettier`, `eslint-config-prettier`.
- `eslint.config.js` (flat config, ESLint 9).
- Scripts en `package.json`:
  - `"lint": "eslint src --ext .ts,.tsx"`
  - `"format": "prettier --write src"`
  - `"typecheck": "tsc --noEmit"`
- Reglas estrictas: `@typescript-eslint/no-explicit-any: warn`, `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: warn`.

---

### 3.2 Arreglar `CustomChart` para SVG

- Reemplazar `fill="var(--color-primary)"` por valores hex resueltos vía `useMemo` que lea `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`, o simplemente pasar colores hex directos desde props.

---

### 3.3 Añadir cleanup a `useDigitalTwin`

- `AbortController` o flag `isMounted` para evitar `setTwin` tras desmontaje.
- En `loadTwinForOrder`, si el `orderId` cambia antes de resolver, descartar respuesta antigua.

---

### 3.4 Modelos GLTF fallback

- En `ExternalGLTFModel`, si `useGLTF` falla, capturar con ErrorBoundary y renderizar el fallback de geometrías `SmartphoneComponentMesh`.
- Documentar en README que `/public/models/smartphone_normal.glb` y `smartphone_exploded.glb` son requeridos para la vista GLTF; si no existen, se usa el fallback procedural.

---

## FASE 4 — Tests

### 4.1 Configurar Vitest

- Añadir devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- `vitest.config.ts` con `environment: 'jsdom'`.
- Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:ui": "vitest --ui"`.

---

### 4.2 Tests mínimos (priorizados)

- `ValidateImeiUseCase.test.ts` — 4 casos: IMEI vacío, IMEI duplicado activo, IMEI duplicado con brand distinto, IMEI duplicado entregado OK.
- `InMemoryAuthRepository.test.ts` — login OK, login con contraseña errónea, usuario inactivo, `setupInitialAdmin` solo una vez.
- `InMemoryServiceOrderRepository.test.ts` — crear orden, validar IMEI, actualizar estado, calcular `warrantyEndDate`.
- `ImageCompressor.test.ts` — no toca imágenes no-imagen, comprime respetando aspect ratio.
- `hasPermission.test.ts` — admin/tecnico/recepcion + permisos custom.

**Cobertura objetivo:** 40% en dominio + aplicación.

---

## FASE 5 — Optimizaciones y DX

### 5.1 Actualizar dependencias críticas

- `firebase` → `^10.14.x` (última estable 10.x, evita breaking de v11).
- `three` → `^0.169.x` compatible con `@react-three/fiber` ^8.
- Ejecutar `npm audit` y resolver vulnerabilidades altas/críticas.

---

### 5.2 Firestore Rules + índices

**Crear:** `firestore.rules` con:
- `/users/{uid}`: read si autenticado y `uid === request.auth.uid` o admin; write solo admin.
- `/orders/{id}`: read/write si autenticado.
- `/clients/{id}`: read/write si autenticado.
- `/transactions/{id}`: read si admin o recepcion; write si admin.
- `/activity_logs/{id}`: read si admin; write si autenticado.
- `/app_settings/{doc}`: read público (para brands/shop_info), write solo admin.
- `/system/status`: read público, write solo en setup inicial.

**Crear:** `firestore.indexes.json` con índice compuesto `orders: imei ASC, status ASC` (por la query de validación).

**Documentar:** `firebase.json` con `firestore` rules + indexes.

---

### 5.3 `package.json` scripts finales

```json
{
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src --ext .ts,.tsx",
  "format": "prettier --write src",
  "test": "vitest run",
  "test:watch": "vitest",
  "audit:fix": "npm audit fix"
}
```

---

### 5.4 README.md

Crear `README.md` con:
- Descripción, stack, arquitectura.
- Setup local (memory provider).
- Setup Firebase (credenciales, rules, indexes, seed admin).
- Comandos (dev, build, test, lint).
- Estructura de carpetas.
- Créditos.

---

### 5.5 `.env.example` ampliado

Añadir comentarios sobre:
- Diferencia entre `memory` (dev) y `firebase` (prod).
- Cómo desplegar rules: `firebase deploy --only firestore:rules,firestore:indexes`.
- Advertencia de no subir `.env` a git.

---

## FASE 6 — Mejoras opcionales (nice-to-have)

- [ ] **PWA**: añadir `vite-plugin-pwa` + manifest + service worker (los técnicos usan móvil en taller).
- [ ] **Exportar PDF**: `jsPDF` + `jspdf-autotable` para tiquetes y reportes financieros.
- [ ] **Exportar CSV**: reportes de finanzas y órdenes.
- [ ] **Filtros de fecha** en Dashboard y Finanzas (hoy / semana / mes / rango custom).
- [ ] **Modo offline real**: `workbox` + IndexedDB para que las órdenes creadas sin red se sincronicen al volver.
- [ ] **Notificaciones push** al cliente vía WhatsApp API (Twilio) cuando cambia estado.
- [ ] **Dashboard del técnico** con sus órdenes asignadas y KPIs personales.
- [ ] **Backup automático** de localStorage (JSON exportable) para el provider `memory`.
- [ ] **Internacionalización** (i18n) ES/EN con `react-i18next`.
- [ ] **Modo claro/oscuro automático** según `prefers-color-scheme`.

---

## 📊 Orden de ejecución recomendado

```
FASE 1 (bloqueante)
  └─ 1.1 → 1.2 → 1.3 → 1.4
FASE 2
  └─ 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6
FASE 3
  └─ 3.1 → 3.2 → 3.3 → 3.4
FASE 4
  └─ 4.1 → 4.2
FASE 5
  └─ 5.1 → 5.2 → 5.3 → 5.4 → 5.5
FASE 6 (opcional, por prioridad de negocio)
```

---

## ✅ Definición de Done

- `npm run typecheck` → 0 errores.
- `npm run lint` → 0 errores (warnings permitidos).
- `npm run build` → éxito.
- `npm run test` → verde.
- App arranca en `memory` y `firebase`.
- Tiquetes imprimen limpios.
- No hay `alert`/`confirm` nativos en el código.
- `useDigitalTwin` respeta `VITE_BACKEND_PROVIDER`.
- Reglas Firestore desplegables.

---

## 🎯 Prompt sugerido para Antigravity

```
Lee el archivo PLAN_MEJORA_ENTUCEL.md completo.

Ejecuta FASE 1 completa (sub-fases 1.1, 1.2, 1.3, 1.4) en orden.

Reglas estrictas:
1. No modifiques la API pública de los hooks existentes.
2. Tras cada sub-fase, ejecuta `npm run typecheck` y `npm run build`. Si algo falla, detente y repórtame antes de continuar.
3. Al terminar FASE 1, muéstrame un diff resumido de archivos creados/modificados y espérame antes de avanzar a FASE 2.
4. Mantén compatibilidad con ambos providers (memory y firebase).
5. Sigue las convenciones de código ya existentes en el proyecto.
```

---

*Fin del plan. Ejecutar fase por fase, sin saltos.*