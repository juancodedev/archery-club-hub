# Plan de Mejoras — QuiverApp

## Priorización

| Prioridad | Impacto | Esfuerzo | Área |
|-----------|---------|----------|------|
| P1 | 🔥 Alto | Bajo | **framer-motion tree shaking** |
| P2 | 🔥 Alto | Medio | **Data layer: eliminar duplicación de queries** |
| P3 | 🔥 Alto | Medio | **Split de componentes grandes** |
| P4 | 🔥 Alto | Bajo | **Google Fonts: eliminar render blocking** |
| P5 | 🔥 Alto | Medio | **Virtual scrolling para listas grandes** |
| P6 | 🔥 Alto | Medio | **TypeScript strict + cleanup** |
| P7 | ⚡ Medio | Bajo | **Tailwind config: limpiar content paths** |
| P8 | ⚡ Medio | Medio | **Componentes no usados: audit shadcn/ui** |
| P9 | ⚡ Medio | Alto | **Test coverage: pages críticas** |
| P10 | ⚡ Medio | Bajo | **Error boundaries globales** |
| P11 | ⚡ Medio | Bajo | **recharts lazy loading** |
| P12 | ⚡ Medio | Bajo | **index.html: limpiar branding Lovable** |
| P13 | 💡 Bajo | Bajo | **CSP headers en index.html** |
| P14 | 💡 Bajo | Alto | **PWA / service worker offline** |
| P15 | 💡 Bajo | Bajo | **Bundle analyzer en build** |
| P16 | 💡 Bajo | Alto | **Error monitoring (Sentry)** |
| P17 | 💡 Bajo | Bajo | **Mercado Pago: sacar access token del frontend** |

---

## ✅ P1 — framer-motion tree shaking (🔥 Alto / Bajo) — COMPLETADO

**Problema:** `vendor-ui` chunk pesaba **530KB**. 25 archivos importaban `from "framer-motion"` trayendo el bundle completo.

**Solución:** Reemplacé imports para usar elementos individuales de `framer-motion/m`:
- 19 archivos: `import { div } from "framer-motion/m"` + `<motion.div>` → `<div>`
- 6 archivos (con AnimatePresence): import dual (`div` de `/m`, `AnimatePresence` de `framer-motion`)

**Resultado:** vendor-ui de 530KB → **404KB (-126KB, -24%)**. Total JS: ~1,135KB → ~995KB (-140KB).

---

## ✅ P2 — Data layer: eliminar duplicación de queries (🔥 Alto / Medio) — COMPLETADO

**Problema:** La query `supabase.from("clubs").select("id, name").order("name")` se repetía en **11 archivos**.

**Solución:** 
- Creé `src/hooks/useClubs.ts` con TanStack Query (`staleTime: 30s`)
- Reemplacé `useState` + `fetchClubs` manual por `const { data: clubs } = useClubs()` en 11 archivos
- Eliminé interfaces duplicadas (`ClubItem`, casts a `Club`)
- Las queries distintas (`select("*")`, `select("inscription_fee, monthly_fee")`) no se tocaron

**Resultado:** 11 archivos más limpios, caché centralizada, sin cambios de comportamiento.

---

## P3 — Split de componentes grandes (🔥 Alto / Medio)

### TrainingSessionsPage (1816 líneas)

**El más grande del proyecto por mucho.** Contiene:
- Listado de sesiones
- Creación/edición de sesiones
- Creación de torneos
- QR code generation
- Enrollment management (inscribir/desinscribir)
- Attendance tracking
- Tabs system (próximas/pasadas)
- Leaflet map (GPS)
- Club selector

**Split propuesto:**
- `TrainingSessionList.tsx` — listado con tabs y filtros
- `TrainingSessionForm.tsx` — formulario de creación/edición
- `TrainingEnrollmentManager.tsx` — manejo de inscripciones
- `TrainingQRDialog.tsx` — QR dialog

### NewScorePage (1006 líneas)

**Split propuesto:**
- `ScoreForm.tsx` — formulario de puntaje
- `EndsManager.tsx` — manejo de ends/tiros
- `ScoreReview.tsx` — revisión antes de guardar

### ScoresPage (779 líneas)

**Split propuesto:**
- `ScoreFilters.tsx` — filtros (fecha, división, tipo)
- `ScoreList.tsx` — listado de puntajes
- `ScorePDFExport.tsx` — exportación a PDF (html2pdf)

### ProfilePage (655 líneas)

**Split propuesto:**
- `ProfileInfo.tsx` — datos personales
- `ProfileClubs.tsx` — selector de clubs
- `ProfilePassword.tsx` — cambio de contraseña

---

## P4 — Google Fonts: eliminar render blocking (🔥 Alto / Bajo)

**Problema:** En `src/index.css` línea 1:
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:...');
```
Esto bloquea el renderizado hasta que descargue las fuentes.

**Solución:** Mover a `<link>` en `index.html` con `preconnect` y `font-display: swap`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="..." rel="stylesheet" />
```

Y en CSS agregar `font-display: swap` via `@supports` o directamente en `@import` con `&display=swap`.

---

## P5 — Virtual scrolling para listas grandes (🔥 Alto / Medio)

**Problema:** Páginas con muchas filas renderizan todo el DOM:
- `AdminPage` — miembros
- `ScoresPage` — puntajes
- `FinancePage` — entries financieras
- `TrainingSessionsPage` — sesiones

**Solución:** Implementar virtual scrolling con `@tanstack/react-virtual` (ya tenemos TanStack Query, mismo ecosistema). Alternativa: `react-virtuoso`.

**Impacto:** Renderizado de miles de filas sin degradación de performance.

---

## P6 — TypeScript strict + cleanup (🔥 Alto / Medio)

**Problema:** Configuración TypeScript muy permisiva:
```json
{
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "noFallthroughCasesInSwitch": false
}
```

Y en ESLint:
```js
"@typescript-eslint/no-unused-vars": "off"
```

**Solución por fases:**
1. Activar `noUnusedLocals` + `noUnusedParameters` (más fáciles)
2. Activar `strictNullChecks` (el que más bugs encuentra)
3. Activar `noImplicitAny`
4. Activar `strict` (lo habilita todo)

**Archivos que requerirán atención:**
- `TrainingSessionsPage.tsx` usa `supabase.from("trainings" as never)` — tipo incorrecto
- Múltiples `const { data }` sin tipos explícitos

---

## P7 — Tailwind config: limpiar content paths (⚡ Medio / Bajo)

**Problema:** `content` incluye rutas que no existen:
```ts
content: [
  "./pages/**/*.{ts,tsx}",     // no existe en raíz
  "./components/**/*.{ts,tsx}", // no existe en raíz
  "./app/**/*.{ts,tsx}",       // no existe
  "./src/**/*.{ts,tsx}"        // única válida
]
```

**Solución:** Dejar solo `"./src/**/*.{ts,tsx}"`.

---

## P8 — Componentes no usados: audit shadcn/ui (⚡ Medio / Medio)

**Problema:** Hay 50 componentes en `src/components/ui/`. Algunos probablemente no se usan (ej: `carousel.tsx`, `context-menu.tsx`, `menubar.tsx`, `toggle-group.tsx`, `hover-card.tsx`, `aspect-ratio.tsx`).

**Solución:** `rg "from.*@/components/ui/" --type tsx` para detectar imports y eliminar no usados. Reduce bundle de vendor y mejora DX.

---

## P9 — Test coverage: pages críticas (⚡ Medio / Alto)

**Cobertura actual (23 test files):**
- ✅ `DashboardPage`, `ScoresPage`, `NewScorePage`, `FinancePage`
- ✅ `MembershipsPage`, `ClubSettingsPage`, `TrainingSessionsPage`
- ✅ `RegisterClubPage`, `InvitationRegisterPage`, `ForgotPasswordPage`
- ✅ `NotFound`
- ✅ `ProtectedRoute`, `NavLink`
- ✅ Todos los lib/utils

**Sin test:**
- ❌ `AdminPage` (456L, miembros, estados)
- ❌ `ReportsPage` (555L, gráficos recharts)
- ❌ `SuperAdminPage` (302L)
- ❌ `ProfilePage` (655L)
- ❌ `TournamentsPage` (540L)
- ❌ `BillingPage` (512L)

---

## P10 — Error boundaries globales (⚡ Medio / Bajo)

**Problema:** No hay error boundaries. Cualquier error en un page component rompe toda la app.

**Solución:** Agregar un `ErrorBoundary` genérico alrededor de cada ruta lazy:
```tsx
<Route path="/scores" element={
  <ErrorBoundary fallback={<ErrorPage />}>
    <ScoresPage />
  </ErrorBoundary>
} />
```

---

## P11 — recharts lazy loading (⚡ Medio / Bajo)

**Problema:** `recharts` está en el chunk `vendor-ui` (530KB). Solo se usa en `ReportsPage.tsx` y `chart.tsx`.

**Solución:** Lazy-load el componente de ReportsPage (ya lo está por React.lazy) y separar recharts de framer-motion en el manualChunks para que no se mezclen.

---

## P12 — index.html: limpiar branding Lovable (⚡ Medio / Bajo)

**Problema:**
```html
<meta name="description" content="Lovable Generated Project" />
<meta name="author" content="Lovable" />
<meta property="og:image" content="https://lovable.dev/..." />
<meta name="twitter:site" content="@Lovable" />
<title>Quiver App</title>
```

**Solución:** Actualizar con datos reales de QuiverApp.

---

## P13 — CSP headers en index.html (💡 Bajo / Bajo)

**Solución:** Agregar `<meta http-equiv="Content-Security-Policy">` o configurar en el deploy (Cloudflare Pages/Workers).

---

## P14 — PWA / service worker (💡 Bajo / Alto)

**Problema:** No hay soporte offline ni instalable.

**Solución:** Agregar `vite-plugin-pwa` para service worker con caché de assets. Prioridad baja hasta tener lo demás estabilizado.

---

## P15 — Bundle analyzer en build (💡 Bajo / Bajo)

**Solución:** Agregar `rollup-plugin-visualizer` para generar reporte visual del bundle en build.

---

## P16 — Error monitoring (Sentry) (💡 Bajo / Alto)

**Problema:** Sin monitoreo de errores en producción. Errores silenciosos en producción.

---

## P17 — Mercado Pago: access token en frontend (💡 Bajo / Bajo)

**Problema:** `MP_ACCESS_TOKEN` en `.env.local` sin prefijo `VITE_`. Si se usara con `import.meta.env` se filtraría al cliente. Debería estar solo server-side (Edge Function o backend).

---

## Historial de fases completadas

| Fase | Descripción | PR |
|------|-------------|----|
| Fase 1 | Code splitting, manualChunks, N+1 auth fix, query cache | #102 |
| Fase 2 | DB indexes, RLS faltantes | #103 |
| Fase 3 | Birthday RPC, ConfirmDialog, 9 window.confirm → AlertDialog | #105 |
| Fase 4 | Filtro financial_entries server-side, html2pdf/Leaflet como imports npm | #106 |
