---
trigger: always_on
description: Contexto principal para QuiverApp - SaaS de Arquería
---

# QuiverApp Project Context

QuiverApp es una plataforma SaaS multi-tenant diseñada para la gestión integral de clubes de arquería.

## Arquitectura y Tech Stack

- **Frontend**: React 18, Vite, TypeScript.
- **Backend/DB**: Supabase (PostgreSQL, Auth, RLS).
- **Estilos**: Tailwind CSS + shadcn-ui + Framer Motion.
- **Estado/Datos**: TanStack Query (React Query) para sincronización de servidor.
- **Validación**: Zod para esquemas y React Hook Form para gestión de formularios.
- **Iconos**: Lucide React.
- **Estructura Multi-tenant**: Aislamiento de datos mediante Row Level Security (RLS) en Supabase basado en `club_id`.

## Reglas de Desarrollo y Estilo de Código

1.  **Logging**: **NUNCA** uses `console.log`. Utiliza el utilitario centralizado `logger` desde `@/lib/logger`.
    - Ejemplo: `logger.log("mensaje")`, `logger.error("error", err)`.
2.  **Idiomas**:
    - Código (variables, funciones, componentes) y comentarios técnicos: **Inglés**.
    - Interfaz de Usuario (labels, placeholders, mensajes de error, toasts): **Español**.
3.  **Permisos**: La lógica de acceso debe centralizarse en `src/lib/permissions.ts`. No dupliques lógica de roles en componentes.
4.  **UI/UX**:
    - Usar la estética "Premium" definida: fondos oscuros, acentos dorados/primarios, uso de `glassmorphism` (clase `glass`).
    - Las animaciones deben ser sutiles y consistentes usando `framer-motion`.
5.  **Componentes**: Seguir el patrón de shadcn-ui. Los componentes reutilizables residen en `src/components/ui`.
6.  **Codificacion**: Considerar intervensiones muy presisas y optimas para el sistema, ya que actualmente está en producción con un cliente funcional

## Estructura de Datos (Core)

- **Plans**: Planes de suscripción del SaaS.
- **Clubs**: Entidad principal del tenant.
- **Members**: Usuarios vinculados a un club con roles específicos.
- **Scores**: Registro de puntuaciones (6 ends, 5 flechas por end).
- **Training Sessions**: Sesiones de práctica y asistencia.

## Comandos Útiles

- `npm run dev`: Iniciar servidor de desarrollo.
- `npm run lint`: Ejecutar linter (ESLint).
- `supabase functions serve`: Probar Edge Functions localmente.