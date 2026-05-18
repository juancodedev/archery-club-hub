---
trigger: always_on
description: Core context for QuiverApp - Archery SaaS
---

# QuiverApp Project Context

QuiverApp is a multi-tenant SaaS platform designed for the comprehensive management of archery clubs.

## Architecture and Tech Stack

- **Frontend**: React 18, Vite, TypeScript.
- **Backend/DB**: Supabase (PostgreSQL, Auth, RLS).
- **Styling**: Tailwind CSS + shadcn-ui + Framer Motion.
- **State/Data**: TanStack Query (React Query) for server synchronization.
- **Validation**: Zod for schemas and React Hook Form for form management.
- **Icons**: Lucide React.
- **Multi-tenant Structure**: Data isolation via Row Level Security (RLS) in Supabase based on `club_id`.

## Development Rules and Code Style

1.  **Logging**: **NEVER** use `console.log`. Use the centralized `logger` utility from `@/lib/logger`.
    - Example: `logger.log("message")`, `logger.error("error", err)`.
2.  **Languages**:
    - Code (variables, functions, components) and technical comments: **English**.
    - User Interface (labels, placeholders, error messages, toasts): **Spanish**.
3.  **Permissions**: Access logic must be centralized in `src/lib/permissions.ts`. Do not duplicate role logic in components.
4.  **UI/UX**:
    - Use the defined "Premium" aesthetics: dark backgrounds, gold/primary accents, use of `glassmorphism` (class `glass`).
    - Animations must be subtle and consistent using `framer-motion`.
5.  **Components**: Follow the shadcn-ui pattern. Reusable components reside in `src/components/ui`.
6.  **Coding**: Consider very precise and optimal interventions for the system, as it is currently in production with a functional client.
7.  **Documentation**: References to README.md text should be in English and as technical as possible.

## Data Structure (Core)

- **Plans**: SaaS subscription plans.
- **Clubs**: Main tenant entity.
- **Members**: Users linked to a club with specific roles.
- **Scores**: Score records (6 ends, 5 arrows per end).
- **Training Sessions**: Practice sessions and attendance.

## Useful Commands

- `npm run dev`: Start development server.
- `npm run lint`: Run linter (ESLint).
- `supabase functions serve`: Test Edge Functions locally.