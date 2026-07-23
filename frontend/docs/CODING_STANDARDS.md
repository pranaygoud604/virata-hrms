# Coding Standards & Component Guidelines

These are the conventions this codebase already follows — written down so v1.0+ changes stay consistent with it, not a wishlist for a rewrite.

## General principles

- **No premature abstraction.** Three similar inline blocks beat a speculative shared component built for a fourth case that doesn't exist yet. Extract to `utils/` or `components/` only once a pattern has actually repeated (see `utils/format.ts`, `utils/csv.ts`, `utils/apiError.ts` — each was pulled out after duplication was found across 2+ pages, not written up front).
- **No backend logic on the frontend.** If a page appears to be computing something non-trivial, check whether the backend already returns it. This app trusts the backend as the source of truth for business rules.
- **Trust internal data, validate at the boundary.** Zod schemas validate user input at forms; `extractErrorMessage` safely unwraps whatever shape the backend's error response takes. Application code elsewhere doesn't re-validate props/state that TypeScript already guarantees.
- **Every mutation gives feedback.** `onSuccess` and `onError` are both wired for every `useMutation`, using `useToast()` — see `contexts/ToastContext.tsx`. A mutation with no `onError` is a silent-failure bug, not an oversight to leave alone.
- **Every destructive action confirms first.** `useConfirm()` (`contexts/ConfirmContext.tsx`) before any delete/deactivate/remove mutation fires. Never `window.confirm`.
- **Every dialog/drawer is accessible by construction.** New modals use `useFocusTrap` (`hooks/useFocusTrap.ts`) rather than reimplementing focus trapping, and set `role`/`aria-modal`/`aria-labelledby` per the existing `Drawer.tsx`/`ConfirmDialog.tsx` pattern.

## Component guidelines

- **One file per page**, colocated under `src/pages/`, named `<Feature>Page.tsx`. A page owns its own `useQuery`/`useMutation` calls — don't lift server state into a shared store.
- **Shared UI goes in `src/components/`**, and must be role/feature-agnostic — a component here should make sense used from any page. Feature-specific composition stays in the page file.
- **Forms**: `react-hook-form` + `zodResolver` + a Zod schema declared at module scope (not inside the component). Every `<label>` gets a matching `htmlFor`/`id` pair (or is nested around its control) — `eslint-plugin-jsx-a11y`'s `label-has-associated-control` enforces this; don't disable the rule to work around a missing id.
- **IDs inside forms**: a short, readable kebab-case string (`"expense-category"`, `"salary-basic"`) is fine for a form that only ever renders once on the page. If the containing component can render more than one instance at a time (a row in a list, a field-array entry), use `useId()` or an index-qualified id instead — a duplicate DOM `id` silently breaks label association.
- **Icon-only buttons** always get `aria-label`. A button with visible text doesn't need one.
- **Popovers/dropdowns** (anything toggled open by a button, not a full-screen `Drawer`) get an invisible `fixed inset-0` backdrop `div` (`z-40`, `onClick` closes it) rendered just before the panel (`z-50`), matching `TopBar.tsx`'s notification dropdown and `DashboardCustomizer.tsx`. This is not optional decoration — omitting it both breaks click-outside-to-close *and* can let underlying page content intercept clicks meant for the dropdown (a real bug this pattern exists to prevent, caught via `IconRail.tsx`'s account menu during E2E testing).
- **Money**: always `formatMoney()` from `utils/format.ts`, never an inline `toLocaleString`. **Initials**: `initials()` (two known name fields) or `initialsFromName()` (one freeform string). **CSV export**: `downloadCsv()` from `utils/csv.ts`. **API error text**: `extractErrorMessage()` from `utils/apiError.ts`. Search for an existing helper before writing a new one that does the same thing.
- **Raw HTML strings** (the print-payslip/offer-letter `document.write()` windows are the only place this app does this): any dynamic value interpolated into the template must go through `escapeHtml()` from `utils/html.ts` first. Anchor `href`s built from user-entered URLs (receipt links, resume links) must be checked with `isSafeHttpUrl()` before rendering as a clickable link, to reject `javascript:`/`data:` schemes.

## TypeScript

- `strict: true`, `noUnusedLocals`, `noUnusedParameters` are all on — don't add `// @ts-ignore` or a type-widening cast to route around them; fix the actual type.
- No `as any`. If the backend's error/response shape is genuinely dynamic, narrow it with a type guard (see `extractErrorMessage`) instead of casting past the type checker.
- Prefer a named `interface`/`type` over inlining a large object type twice.

## Linting

`npm run lint` must be clean (zero errors) before a PR merges — it's not advisory. The flat config (`eslint.config.js`) intentionally scopes `eslint-plugin-react-hooks` to just `rules-of-hooks`/`exhaustive-deps` rather than the plugin's full v7 "recommended" preset, which also bundles React Compiler static-analysis rules (no components created during render, no `setState` in effects, etc.) — those would demand wide refactors of established, working patterns across the app for marginal benefit, which is out of scope for incremental changes. If you're deliberately adopting the React Compiler later, revisit that decision then.

## Testing

See `docs/DEVELOPER_GUIDE.md` for what to test and how; the short version is: unit-test any pure logic (RBAC path-matching, date/money formatting, HTML escaping), component-test the shared primitives (Drawer, ConfirmDialog, ToastContext) for their accessibility contract, and E2E-test the handful of flows that only make sense end-to-end (login, cross-page navigation, a destructive-action confirm). Don't write a test that just re-asserts what TypeScript already guarantees.
