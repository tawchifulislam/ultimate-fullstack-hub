# Layouts

**Topic 63 of 89** (Section: Next.js, 3 of 10)

## Notes

A layout is UI shared between multiple pages. `app/layout.tsx` (the root layout, required by every App Router project) is the layout everything else sits inside, but any folder under `app/` can have its own `layout.tsx`, and layouts nest: each one wraps the layout or page below it, rather than replacing what came before it.

### Nested layouts

This project's `app/dashboard/layout.tsx` only wraps routes under `/dashboard`, both `app/dashboard/page.tsx` (`/dashboard`) and `app/dashboard/settings/page.tsx` (`/dashboard/settings`). The root layout still wraps the dashboard layout in turn. Fetching each route's rendered HTML confirms exactly this nesting:

```text
GET /                   -> ROOT-LAYOUT-MARKER only
GET /dashboard          -> ROOT-LAYOUT-MARKER, DASHBOARD-LAYOUT-MARKER
GET /dashboard/settings -> ROOT-LAYOUT-MARKER, DASHBOARD-LAYOUT-MARKER
```

`/` never sees the dashboard layout at all, it is outside that folder, while both dashboard routes see both layouts, outer to inner.

### A layout does not remount when navigating between its own pages

This is the actual reason layouts exist as their own concept instead of just repeating shared markup on every page: when navigating between two routes that share a layout, Next.js's client-side router keeps that layout mounted and only swaps out the part that actually changed. Any state inside the layout survives the navigation.

This cannot be observed from separate HTTP requests, each one is a fresh render regardless of what the previous one produced, so this project's claim was checked with a real browser (Playwright) clicking an actual link, not just fetching two URLs separately:

1. Load `/dashboard`. The layout's counter (`VisitCounter`, a Client Component with its own `useState`) reads 0.
2. Click its Increment button twice. It reads 2.
3. Click the "Settings" link (`next/link`, not a full page reload) to navigate to `/dashboard/settings`.
4. Read the counter again: it still reads 2.

The layout was never re-created by that navigation, only `DashboardPage`'s content was swapped for `SettingsPage`'s.

### A template is the opposite: it remounts on every navigation

`template.tsx` looks like `layout.tsx`, same `children` prop, same position in the folder, but Next.js creates a brand new instance of it on every navigation, even between two routes that both use it. `app/template-demo/template.tsx` wraps `/template-demo` and `/template-demo/other` with the exact same `VisitCounter` component the dashboard layout uses. Repeating the same browser test against it gives the opposite result:

1. Load `/template-demo`. Counter reads 0.
2. Click Increment twice. It reads 2.
3. Click the "Other" link to navigate to `/template-demo/other`.
4. Read the counter again: it reads 0, back to its initial value.

The component was recreated from scratch by the navigation. A template is the right tool for something that should reset on every navigation, such as a per-page enter animation or a `useEffect` that should always rerun, while a layout is the right tool for anything that should persist, such as this dashboard's own navigation state or a shopping cart sidebar.

## Resources

- Layouts and templates: <https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates>
- Linking and navigating (how `next/link` enables this without a full page reload): <https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating>

## Practice

1. Add a third route under `/dashboard`, confirm it also picks up `DASHBOARD-LAYOUT-MARKER` without any changes to `dashboard/layout.tsx`.
2. Add a second nested layout one level deeper, `app/dashboard/settings/layout.tsx`, and confirm its marker appears only on `/dashboard/settings`, not on `/dashboard`.
3. Move `VisitCounter`'s state up into a shared context provided by the root layout, and confirm it now survives navigation between `/dashboard` and `/template-demo` too, two routes that do not share a lower layout.
4. Replace `template-demo/template.tsx` with a `layout.tsx` of the same content, rerun the browser test, and confirm the counter now persists instead of resetting.
5. Add a `console.log` inside `VisitCounter` with no dependency array in a `useEffect`, and compare how many times it logs when navigating within the dashboard versus within the template demo.

## Code Example

Like the previous two topics, this is a small Next.js project, since layouts and templates are fundamentally about how routes are organized into folders:

- [app/layout.tsx](./03-layouts/app/layout.tsx)
- [app/page.tsx](./03-layouts/app/page.tsx)
- [app/components/VisitCounter.tsx](./03-layouts/app/components/VisitCounter.tsx)
- [app/dashboard/layout.tsx](./03-layouts/app/dashboard/layout.tsx)
- [app/dashboard/page.tsx](./03-layouts/app/dashboard/page.tsx)
- [app/dashboard/settings/page.tsx](./03-layouts/app/dashboard/settings/page.tsx)
- [app/template-demo/template.tsx](./03-layouts/app/template-demo/template.tsx)
- [app/template-demo/page.tsx](./03-layouts/app/template-demo/page.tsx)
- [app/template-demo/other/page.tsx](./03-layouts/app/template-demo/other/page.tsx)

To run it yourself: install `next`, `react`, and `react-dom` in a project containing this `app/` folder at its root, then run `npx next dev` and click between the Dashboard and Settings links, then between the Template demo and Other links, watching each counter as you go.
