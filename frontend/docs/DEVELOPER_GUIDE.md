# Developer Guide

Practical "how do I..." recipes for working in this codebase. See `docs/ARCHITECTURE.md` for the why and `docs/CODING_STANDARDS.md` for the rules; this file is the how.

## Adding a new page

1. Create `src/pages/MyFeaturePage.tsx` with a default-exported component.
2. Add it to `src/App.tsx`: a `React.lazy(() => import("./pages/MyFeaturePage"))` entry plus a `<Route>` wrapped in `<Suspense fallback={<RouteFallback />}>`, matching the existing routes.
3. Add it to `src/config/navigation.ts`: a `NavItem` constant, add it to the right roles' arrays in `NAV_BY_ROLE`, and add its path to the matching roles' arrays in `ALLOWED_PATHS_BY_ROLE`. These two lists are meant to stay in sync (a route reachable but not in the nav, or in the nav but blocked by the route guard, is a bug) — `src/config/navigation.test.ts` asserts every nav item's path is itself allowed for that role, so a mismatch fails a test rather than shipping silently.
4. Wire loading/empty/error states: `useQuery`'s `isLoading`/`isError` (render `<ErrorState onRetry={() => query.refetch()} />` on error), and an explicit empty-state message when the data loaded but is an empty list.

## Adding a mutation

```tsx
const toast = useToast();
const queryClient = useQueryClient();

const createThing = useMutation({
  mutationFn: async (data: ThingForm) => (await api.post("/things", data)).data,
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ["things"] });
    toast.success(`"${variables.name}" added`);
  },
  onError: (err) => toast.error("Could not add this thing", extractErrorMessage(err)),
});
```

Both `onSuccess` and `onError` are non-negotiable — see `docs/CODING_STANDARDS.md`. For a destructive action, gate the `.mutate()` call behind `useConfirm()`:

```tsx
const confirm = useConfirm();

async function handleDelete(thing: Thing) {
  const ok = await confirm({
    title: `Delete "${thing.name}"?`,
    description: "This can't be undone.",
    confirmLabel: "Delete",
    tone: "danger",
  });
  if (ok) deleteThing.mutate(thing.id);
}
```

## Adding a form

`react-hook-form` + `zodResolver`, schema at module scope:

```tsx
const thingSchema = z.object({
  name: z.string().min(1, "Required"),
});
type ThingForm = z.infer<typeof thingSchema>;

const { register, handleSubmit, formState: { errors } } = useForm<ThingForm>({ resolver: zodResolver(thingSchema) });
```

Every `<label>` needs a matching `htmlFor`/`id`:

```tsx
<label htmlFor="thing-name">Name</label>
<input id="thing-name" {...register("name")} />
{errors.name && <p className="text-xs text-status-critical mt-1">{errors.name.message}</p>}
```

If the form can render more than once at a time (a row in a `.map()`, a field-array entry), don't hardcode the id — use `useId()` or qualify it with the row's index/key.

## Adding a dialog/drawer

Reuse `Drawer` for anything panel-like, or the pattern in `ConfirmDialog.tsx`/`CommandPalette.tsx` for something bespoke — either way, wire `useFocusTrap(panelRef, open)` rather than reimplementing focus trapping, and set `role`, `aria-modal="true"`, and `aria-labelledby` pointing at a `useId()`-generated heading id.

## Running and writing tests

```bash
npm test                # Vitest, once
npm run test:watch      # Vitest, watch mode
npm run test:coverage   # Vitest with coverage
npm run test:e2e        # Playwright — needs a live backend, see e2e/README.md
```

**Unit test** (`src/utils/*.test.ts`) — pure logic: formatting, escaping, RBAC path-matching, date handling. No rendering involved.

**Component test** (`src/components/*.test.tsx`, `src/contexts/*.test.tsx`) — render with `@testing-library/react`, interact with `@testing-library/user-event`, assert on rendered output and ARIA roles rather than implementation details (avoid reaching into component internals/state).

**Accessibility test** (`src/components/accessibility.test.tsx`) — `jest-axe`'s `axe(container)` + `toHaveNoViolations()` on a rendered shared primitive. Add a case here for any new shared dialog/overlay component.

**E2E test** (`e2e/*.spec.ts`) — only for things that genuinely need a full browser + real backend: auth, cross-page navigation, a destructive-action confirm dialog's actual click-through. Don't duplicate what a component test already covers faster and more reliably.

A note on flakiness from experience building this suite: `framer-motion`'s `AnimatePresence` exit animations rely on real requestAnimationFrame timing, which `vi.useFakeTimers()` doesn't drive — if you're testing something that unmounts via an exit animation, prefer a short *real* delay + `waitFor` over fake timers. See `docs/TROUBLESHOOTING.md` for more on this.

## Before opening a PR

```bash
npx tsc -b && npm run lint && npm test && npm run build
```

All four clean, plus `npm run test:e2e` if you touched anything auth/navigation/dialog-related and have a backend running locally.
