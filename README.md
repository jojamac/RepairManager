# 🚀 Repair Manager

> Sistema Integral de Gestión de Reparaciones Técnicas de Dispositivos Móviles, Control Financiero, CRM de Clientes y Gemelo Digital 3D.

---

## 📑 ÍNDICE

- [Descripción General](#-descripción-general)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Instalación y Setup Local](#-instalación-y-setup-local)
- [Configuración de Firebase en Producción](#-configuración-de-firebase-en-producción)
- [Comandos Disponibles](#-comandos-disponibles)
- [Estructura de Directorios](#-estructura-de-directorios)

---

## 📱 Descripción General

**Repair Manager** es una plataforma moderna para talleres de soporte técnico de dispositivos móviles que permite:
- **Gestión de Órdenes de Servicio:** Registro de fallas, IMEI, repuestos y firmas digitales.
- **Gemelo Digital 3D:** Visualización fotorrealista e interactiva despiezada del teléfono con diagnósticos visuales.
- **Validación de IMEI:** Reglas de negocio para evitar duplicidades de equipos en proceso o inconsistencias de marca/modelo.
- **Flujo Financiero & Caja:** Control de ingresos, abonos automáticos, gastos operativos y cotizaciones.
- **CRM de Clientes:** Asociación automática de equipos, historial de reparaciones y notificaciones por WhatsApp.
- **Roles y Permisos:** Control granular por perfil (*Admin*, *Técnico*, *Recepción*).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18, TypeScript, Vite, React Router DOM v6.
- **Renderizado 3D:** Three.js, React Three Fiber, React Three Drei.
- **Estilos & Iconos:** CSS Variables (Light/Dark Mode), Lucide React.
- **Backend Providers:** 
  - Mock Provider: Persistencia en LocalStorage para desarrollo rápido offline.
  - Production Provider: Firebase Firestore, Firebase Auth, Firebase Storage.
- **Testing & Quality:** Vitest, Testing Library, ESLint, Prettier.

---

## 🏗️ Arquitectura del Proyecto

El proyecto sigue los principios de **Clean Architecture** estructurado en capas independientes:

```
src/
 ├── domain/          # Entidades puras y Repositorios (Interfaces e Inversión de Control)
 ├── application/     # Casos de uso (UseCases), Hooks y Servicios orquestadores
 ├── data/            # Implementaciones de repositorios (Memory Provider / Firebase Provider)
 └── presentation/    # Páginas, Componentes de UI, Temas CSS y Vistas 3D
```

---

## 🚀 Instalación y Setup Local

### Prerrequisitos
- Node.js versión 18 o superior.
- npm versión 9 o superior.

### Pasos de Instalación
1. Clonar el repositorio y navegar a la carpeta raíz:
   ```bash
   cd D:\proyectos\RepairManager
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   Copiar el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   *Por defecto `VITE_BACKEND_PROVIDER=memory` permite utilizar la app de forma local e independiente sin necesidad de credenciales de Firebase.*

4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

---

## 🔥 Configuración de Firebase en Producción

Para conectar la aplicación a una instancia real en la nube de Firebase:

1. Modifique el archivo `.env`:
   ```env
   VITE_BACKEND_PROVIDER=firebase
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```

2. Desplegar reglas de seguridad e índices de Firestore:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

3. El primer usuario registrado a través de la interfaz de login configurará el **Administrador Inicial** de forma segura.

---

## 📜 Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local de Vite |
| `npm run build` | Ejecuta verificación de tipos `tsc` y construye el paquete optimizado de producción |
| `npm run preview` | Previsualiza el bundle compilado de producción localmente |
| `npm run typecheck` | Ejecuta el compilador de TypeScript para validar tipos sin emitir archivos |
| `npm run test` | Ejecuta la suite de pruebas unitarias en verde con Vitest |
| `npm run test:watch` | Modo observador interactivo para desarrollo asistido por pruebas |
| `npm run format` | Da formato automático a todo el código fuente con Prettier |

---

## 📂 Estructura de Directorios

```
RepairManager/
 ├── firestore.rules          # Reglas de seguridad de Firestore
 ├── firestore.indexes.json    # Índices compuestos de Firestore
 ├── firebase.json            # Configuración de despliegue de Firebase CLI
 ├── vitest.config.ts         # Configuración de la suite de pruebas
 ├── src/
 │    ├── application/        # UseCases (ValidateImei, OrderFinancialHooks, etc.)
 │    ├── data/               # InMemory y Firebase Repositories
 │    ├── domain/             # Entities e Interfaces
 │    └── presentation/       # Componentes React, Temas y Vistas 3D
 └── public/
      └── models/             # Modelos 3D GLTF (.glb) para despiece de smartphones
```
