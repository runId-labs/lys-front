# Routing — route table and page configs

Source: `src/types/routeTypes.ts`, `src/types/descriptionTypes.ts`,
`src/tools/routeTools.ts`, `src/providers/RouteProvider/`,
`src/templates/PublicAppTemplate.tsx`.

## Page description (config) — the contract

A page is described (not hand-routed) by a `PageDescriptionType`:

| Field | Role |
|-------|------|
| `name` | unique PascalCase + `Page` — the routing KEY everywhere (menus, tabs, links reference NAMES, not paths) |
| `component` | the page component |
| `path` | URL path |
| `type` | `"public"` \| `"private"` |
| `template` | page template component (app-provided; optional) |
| `mainWebserviceName` | string or any-of array — the webservice gating access (drives link/menu visibility) |
| `translation` | the page's translation config (`pageName` key used by tab bars) |
| `description` | one English sentence — consumed by the chatbot navigation |
| `breadcrumbs` | optional `[{routeName}]` |
| `chatbotBehaviour` | optional `{prompt, contextTools, autoOpenOnEnter, showWelcomeMessage}` |

## Route table

`generateRouteTable(lysDescriptor)` builds `RouteInterface[]` from the app's
`pages` registry; `generateUrl` / `generateUrlByRoute` resolve names → paths
(query params supported). Links and menus resolve NAMES at runtime through
`RouteProvider`'s route map — renaming a page's path breaks nothing.

## RouteProvider (per route)

Mounted by the app's router shell around each route with
`privateTemplate` / `publicTemplate`. Provides `useRouteInfo()`
(`route`, `allRoutes`, `getRouteByName`) and `useRouteAccess()`.
Renders `PublicAppTemplate` for public routes (redirects authenticated users
unless `options.opened`).

## RULES

- **R1 — Reference routes by NAME** in menus, tabs, breadcrumbs and links —
  never by path string.
- **R2 — Access gating is `mainWebserviceName`** — it must match the backend
  webservice id exactly; menus/links hide pages the user cannot access.
- **R3 — `description` is chatbot-facing content** — English, precise, one
  sentence.
- **R4 — Public pages are the exception** (login, activation…): they opt in
  via `type: "public"`.
