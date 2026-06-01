
# QuiverApp — SaaS para Clubes de Arquería

Plataforma multi-tenant para la gestión integral de clubes de arquería. Construida con React, TypeScript, Supabase y Tailwind CSS.

---

## Funcionalidades

- **Registro de puntajes** — Planillas flecha por flecha con soporte para múltiples formatos (WA Outdoor, IFAA, NFAA, indoor) y divisiones por edad/género
- **Sesiones de entrenamiento** — Creación de clases con QR de check-in, disciplinas, distancias, tipos de diana, condiciones climáticas y registro de asistentes
- **Asistencia por GPS + QR** — Escaneo de código QR fijo en el club con validación de geocerca (Haversine) para prevenir marcaciones remotas fraudulentas
- **Membresías y pagos** — Control de cuotas mensuales, estado financiero por miembro, y cobro integrado con Mercado Pago
- **Finanzas del club** — Registro de ingresos/egresos, categorías, comprobantes y reportes descargables
- **Gestión de miembros** — Altas, roles (administrador, presidente, entrenador, arquero, secretaria, tesorero), invitaciones por token y estados
- **Divisiones y categorías** — Configuración por club de divisiones competitivas con rangos de edad y género
- **Torneos** — Creación de torneos con inscripciones por división
- **Reportes** — Reportes operativos y financieros
- **Panel Super Admin** — Administración global de clubes, planes SaaS, cargos extra y usuarios
- **Planes SaaS** — Modelo de suscripción con planes Básico, Pro y Elite

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v6 |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Estado/Datos | TanStack React Query |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| Pagos | Mercado Pago (Checkout + Webhook) |
| Mapas | Leaflet / OpenStreetMap |
| Animaciones | Framer Motion |
| Testing | Vitest, Testing Library |

---

## Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables (UI, layout, admin, scores)
├── contexts/       # AuthContext (Supabase auth multi-tenant)
├── hooks/          # Hooks personalizados
├── lib/            # Utilidades (puntajes, divisiones, membresías, RUT, permisos)
├── pages/          # Páginas de la aplicación (26 rutas)
├── types/          # Definiciones TypeScript
└── test/           # Tests

supabase/
├── functions/      # Edge Functions (Mercado Pago, CRUD miembros, invitaciones)
└── migrations/     # Migraciones SQL (75 archivos)
```

---

## Requisitos

- Node.js ^20.19.0 || ^22.13.0 || >=24
- Supabase CLI (para desarrollo local)

## Instalación

```sh
git clone <repo-url>
cd archery-club-hub
npm install
cp .env.example .env   # Configurar variables de Supabase
npm run dev
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia servidor de desarrollo (puerto 8080) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:migrate` | Ejecuta migraciones SQL |
| `npm run supabase:start` | Inicia Supabase local |

---

## Rutas principales

| Ruta | Descripción |
|---|---|
| `/` | Landing page |
| `/register-club` | Registro de nuevo club |
| `/join` | Registro por invitación |
| `/login` | Inicio de sesión |
| `/dashboard` | Panel principal |
| `/scores` / `/scores/new` | Historial y registro de puntajes |
| `/training` | Sesiones de entrenamiento |
| `/attendance/checkin` | Check-in por QR + GPS |
| `/admin` | Administración de miembros |
| `/admin/finances` | Finanzas del club |
| `/admin/memberships` | Control de membresías |
| `/billing` | Planes y facturación |
| `/reports` | Reportes |
| `/super-admin/*` | Panel Super Admin |

---

## Licencia

Proyecto privado — QuiverApp
