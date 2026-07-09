<h1 align="center">InTech Admin</h1>

<p align="center">
  <strong>SPA Angular para gestionar personas y productos de un catálogo interno tecnológico.</strong>
</p>

<p align="center">
  <img alt="Angular" src="https://img.shields.io/badge/Angular-16%2B-dd0031?style=flat-square&logo=angular">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-111?style=flat-square&logo=typescript">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-111?style=flat-square&logo=tailwindcss">
  <img alt="API" src="https://img.shields.io/badge/API-Django%20DRF-092e20?style=flat-square">
  <img alt="Status" src="https://img.shields.io/badge/status-MVP-16a34a?style=flat-square">
</p>

<p align="center">
  <a href="#-resumen">Resumen</a> ·
  <a href="#-funcionalidades">Funcionalidades</a> ·
  <a href="#-requisitos">Requisitos</a> ·
  <a href="#-configuración">Configuración</a> ·
  <a href="#-desarrollo">Desarrollo</a> ·
  <a href="#-producción">Producción</a> ·
  <a href="#-tests">Tests</a>
</p>

---

## 🧭 Resumen

`InTech Admin` es una SPA construida con **Angular + TypeScript + Tailwind CSS**
para consumir un backend **Django + Django REST Framework**.

La aplicación funciona como un panel interno para gestionar:

- **Personas**: responsables, clientes internos u owners.
- **Productos**: activos tecnológicos como laptops, monitores, routers, periféricos y accesorios.

No es un ecommerce. Es un panel administrativo para inventario/catálogo interno.

---

## ✨ Funcionalidades

### Personas

- Listado paginado de personas.
- Filtro por `email`.
- Filtro por `last_name`.
- Ordenamiento por fecha de creación.
- Creación de persona.
- Edición de persona.
- Eliminación con confirmación.
- Validaciones con Reactive Forms.

### Productos

- Listado paginado de productos.
- Búsqueda por nombre usando `q`.
- Filtro por `sku`.
- Filtro por rango de precio:
  - `price_min`
  - `price_max`
- Ordenamiento por columnas:
  - precio
  - fecha de creación
- Creación de producto.
- Edición de producto.
- Eliminación con confirmación.
- Owner opcional seleccionado desde personas.
- Visualización del owner con nombre y email.
- Filtros con búsqueda en tiempo real usando debounce.

### UX y estado

- Layout base con navegación.
- Tema claro tipo B2B SaaS admin.
- Indicadores de carga.
- Estados vacíos.
- Mensajes de error locales.
- Interceptor HTTP global para errores `4xx/5xx`.
- Alerta global reutilizable.
- Indicador de estado del backend usando `/readyz`.

---

## 🧱 Stack técnico

- Angular 16+
- TypeScript
- Angular Router
- HttpClient
- Reactive Forms
- RxJS
- Angular Signals
- Tailwind CSS
- Standalone Components

No se usa NgRx porque el alcance del proyecto es CRUD con filtros simples.
El estado se maneja con una estrategia simple:

```txt
Services + HttpClient + RxJS → comunicación con API
Signals → estado local de UI
```

---

## 📁 Estructura principal

```txt
src/app/
├── core/
│   ├── interceptors/
│   ├── models/
│   └── services/
├── shared/
│   ├── components/
│   └── utils/
├── features/
│   ├── persons/
│   │   ├── pages/
│   │   └── services/
│   └── products/
│       ├── pages/
│       └── services/
├── app.config.ts
└── app.routes.ts
```

---

## 🛣️ Rutas

| Ruta | Descripción |
|---|---|
| `/persons` | Listado de personas |
| `/persons/new` | Crear persona |
| `/persons/:id/edit` | Editar persona |
| `/products` | Listado de productos |
| `/products/new` | Crear producto |
| `/products/:id/edit` | Editar producto |

---

## 🔌 API esperada

Se asume que el backend Django corre en:

```txt
http://localhost:8000
```

Endpoints usados:

```txt
GET    /healthz
GET    /readyz

GET    /api/v1/persons/
POST   /api/v1/persons/
GET    /api/v1/persons/{id}/
PATCH  /api/v1/persons/{id}/
DELETE /api/v1/persons/{id}/

GET    /api/v1/products/
POST   /api/v1/products/
GET    /api/v1/products/{id}/
PATCH  /api/v1/products/{id}/
DELETE /api/v1/products/{id}/
```

La API usa paginación DRF:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

---

## 📦 Requisitos

Antes de levantar el proyecto, instala:

- Node.js LTS
- npm
- Angular CLI

Verifica versiones:

```bash
node --version
npm --version
ng version
```

Si no tienes Angular CLI instalado globalmente:

```bash
npm install -g @angular/cli
```

---

## ⚙️ Configuración

La URL del backend se configura con environments.

### Desarrollo

Archivo:

```txt
src/environments/environment.ts
```

Ejemplo:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
};
```

### Producción

Archivo:

```txt
src/environments/environment.prod.ts
```

Ejemplo:

```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.midominio.com',
};
```

No se hardcodean URLs en componentes. Los servicios usan `environment.apiBaseUrl`.

---

## 🚀 Desarrollo

Instala dependencias:

```bash
npm install
```

Levanta el frontend:

```bash
npm start
```

O directamente:

```bash
ng serve
```

Abre en el navegador:

```txt
http://localhost:4200
```

Asegúrate de que el backend esté corriendo en:

```txt
http://localhost:8000
```

Puedes verificarlo con:

```bash
curl http://localhost:8000/readyz
```

Respuesta esperada:

```json
{
  "status": "ready"
}
```

---

## 🌐 CORS

El frontend no usa proxy para ocultar llamadas al backend.

El backend debe permitir el origen:

```txt
http://localhost:4200
```

La configuración CORS se maneja del lado de Django.

---

## 🧪 Tests

Ejecuta tests unitarios:

```bash
ng test --watch=false
```

Los tests usan mocks de HTTP, por lo que no necesitan que el backend Django esté levantado.

Cobertura mínima incluida:

- Renderizado del layout principal.
- Requests de `PersonService`.
- Requests de `ProductService`.
- Validaciones del formulario de Persona.
- Validaciones del formulario de Producto.

---

## 🏗️ Producción

Genera el build optimizado:

```bash
ng build --configuration production
```

La salida se genera en:

```txt
dist/frontend/
```

Antes de generar el build de producción, revisa:

```txt
src/environments/environment.prod.ts
```

y cambia `apiBaseUrl` por la URL real del backend.

Ejemplo:

```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.intech.example.com',
};
```

---

## 🧰 Scripts útiles

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | Levanta Angular en desarrollo |
| `ng serve` | Levanta Angular manualmente |
| `ng build` | Compila la app |
| `ng build --configuration production` | Genera build optimizado |
| `ng test --watch=false` | Ejecuta tests una vez |

---

## 🧩 Decisiones técnicas

### Standalone Components

Se usaron componentes standalone en lugar de módulos clásicos para mantener una
arquitectura moderna y simple.

```txt
Ruta → loadComponent → Página standalone
```

### Signals

Se usaron Angular Signals para estado local de UI:

- loading
- error
- resultados
- página actual
- owners cargados
- estado de eliminación

Esto evita depender de mutaciones normales de clase en flujos asíncronos.

### RxJS

Se usó RxJS para:

- llamadas HTTP
- `finalize`
- `catchError`
- `debounceTime`
- limpieza con `takeUntilDestroyed`

### Tailwind CSS

Se usó Tailwind CSS para construir una UI limpia y responsive sin depender de
librerías pesadas de componentes.

### Interceptor HTTP

La app incluye un interceptor global para mostrar mensajes amigables ante errores:

- backend apagado
- errores 400
- errores 401/403
- errores 404
- rate limit 429
- errores 500

---

## 📸 Estado funcional

```txt
Persons:
✅ Listar
✅ Filtrar
✅ Ordenar
✅ Paginar
✅ Crear
✅ Editar
✅ Eliminar

Products:
✅ Listar
✅ Buscar
✅ Filtrar
✅ Ordenar por columnas
✅ Paginar
✅ Crear
✅ Editar
✅ Eliminar
✅ Owner opcional

Extras:
✅ Health status
✅ Interceptor HTTP
✅ Alerta global
✅ Tests mínimos
✅ Build producción
```

---

## 📄 Licencia

Proyecto desarrollado como parte de una prueba técnica fullstack.
