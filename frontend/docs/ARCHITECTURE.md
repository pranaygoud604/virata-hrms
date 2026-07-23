# Architecture Overview

## High-level shape

```
Browser
  └─ React app (this repo)
       ├─ React Router 6            — client-side routing, role-gated
       ├─ TanStack Query 5          — server state (fetch/cache/mutate), no Redux/global store
       ├─ React Context             — cross-cutting UI state only (auth, theme, toasts, confirm dialog)
       └─ axios client              — talks to the NestJS backend over REST, JWT bearer auth
                └─ Backend (locked, separate repo folder: ../backend)
```

There is no client-side business logic duplicating the backend's — every page is a thin view over `useQuery`/`useMutation` calls. If a page seems to be "computing" something non-trivial (e.g. payroll totals, leave balances), that's either a display-only aggregation of already-fetched data or it's something the backend actually computed and returned.

## Request flow

1. `src/api/client.ts` creates a single axios instance (`api`) with the base URL from `VITE_API_URL`.
2. A request interceptor attaches `Authorization: Bearer <accessToken>` from `localStorage`.
3. A response interceptor catches `401`s, transparently refreshes the token once via `/auth/refresh`, retries the original request, and hard-redirects to `/login` if the refresh itself fails.
4. Every page's `useQuery`/`useMutation` calls go through this same `api` instance — there is no second HTTP client anywhere.

## State management

- **Server state** (anything that came from the API): TanStack Query. Each page owns its own `useQuery`/`useMutation` calls; there is no centralized store of server data. Mutations call `queryClient.invalidateQueries` on success rather than manually patching the cache, favoring correctness over micro-optimized cache writes.
- **Cross-cutting UI state**: four React Contexts, each with a narrow, single responsibility —
  - `AuthContext` — current user, login/logout, token bootstrap on load.
  - `ThemeContext` — light/dark mode, persisted to `localStorage`.
  - `ToastContext` — the global notification queue (`src/contexts/ToastContext.tsx`).
  - `ConfirmContext` — the single app-wide confirm dialog, driven by a promise-based `confirm(options)` API (`src/contexts/ConfirmContext.tsx`).
- **Local UI state**: plain `useState`/`useReducer` inside each page/component. There is no Redux/Zustand/Jotai — the app deliberately doesn't need one given how thin the client logic is.

## Routing and access control

`src/App.tsx` defines every route, each lazy-loaded (`React.lazy` + `Suspense`) for route-level code splitting. Access control is layered:

1. `ProtectedRoute` — redirects to `/login` if there's no authenticated user.
2. `RoleGuard` — redirects to `/` if the current user's role isn't allowed on the current path, per `src/config/navigation.ts`'s `isPathAllowed`. This is defense-in-depth against typing a URL directly, not just hiding nav links — the same file's `getNavItems` is what actually renders the sidebar, and the two are kept in sync (and unit-tested to stay that way).
3. `Layout` — the authenticated app shell (sidebar `IconRail`, `TopBar`, `CommandPalette`, and the routed page in `<Outlet />`).

## Accessible-dialog pattern

`Drawer.tsx` and `ConfirmDialog.tsx` (and `CommandPalette.tsx`) share one hook, `useFocusTrap` (`src/hooks/useFocusTrap.ts`), which on activation: captures the previously-focused element, moves focus into the panel, traps Tab/Shift+Tab inside it, locks body scroll, and restores focus to the trigger on close. New dialogs should reuse this hook rather than reimplementing focus management.

## Notifications and confirmations

`ToastContext`/`ToastContainer` is the only notification mechanism in the app — every mutation's `onSuccess`/`onError` calls into it (`toast.success(...)`, `toast.error(...)`, or `toast.promise(...)` for long-running operations). `ConfirmContext`/`ConfirmDialog` is the only confirmation mechanism — every destructive action awaits `confirm({...})` before firing its mutation, rather than using `window.confirm` or a bespoke inline dialog.

## Folder structure

```
frontend/
├── e2e/                    Playwright E2E specs (+ README)
├── src/
│   ├── api/                axios client (client.ts), shared response types (types.ts)
│   ├── auth/               AuthContext — session bootstrap, login/logout
│   ├── theme/              ThemeContext — light/dark mode
│   ├── contexts/           ToastContext, ConfirmContext (+ their .test.tsx)
│   ├── hooks/               useFocusTrap, useGeolocation, useDashboardLayout, usePersonalData
│   ├── config/             navigation.ts — per-role nav items + route allow-list
│   ├── components/         Shared, reusable UI: Drawer, ConfirmDialog, ToastContainer,
│   │                       ErrorState, Tabs, Skeleton, MonthCalendar, Timeline, StatusPill,
│   │                       RadialProgress, CommandPalette, IconRail, TopBar, Layout,
│   │                       ProtectedRoute, RoleGuard, DashboardCustomizer
│   ├── dashboards/         One dashboard component per role (SuperAdmin/HRAdmin/Manager/Employee)
│   ├── pages/               One component per route (EmployeesPage, PayrollPage, etc.)
│   ├── utils/               format.ts, csv.ts, apiError.ts, date.ts, html.ts, buildActivity.tsx
│   ├── test/                 Vitest setup (jest-dom + jest-axe matchers)
│   ├── App.tsx               Route table (lazy-loaded)
│   └── main.tsx              Provider tree + root render
├── docs/                    This documentation set
├── vite.config.ts           Vite + Vitest config (single file, `test` block)
├── eslint.config.js         Flat ESLint config
└── playwright.config.ts     E2E config (auto-starts the dev server)
```

## Why no global state library

Every page's data is scoped to that page (or shared narrowly, e.g. `usePersonalData` for the handful of "my own" queries several dashboards need). TanStack Query's cache already deduplicates identical `queryKey`s across components for free, which is the main thing a global store would otherwise be reached for. Introducing Redux/Zustand here would add a layer with no problem it's solving — see `CODING_STANDARDS.md` for the general "don't add abstraction ahead of a real need" stance this codebase follows.
