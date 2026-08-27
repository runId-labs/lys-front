# Client focus — multi-tenancy

Source: `src/providers/ClientProvider/`.

## Mechanism

`ClientProvider` holds the "focused client" (organization) of a multi-tenant
session: `useClientId()` → `{clientId, setClientId, isLocked}`.

- Selection is synced to the `clientId` URL query param and sessionStorage
  (survives reloads, shareable URLs).
- **Client users are LOCKED** to their own organization (`isLocked`) — the UI
  must hide the selector in that case.
- Admin/supervisor users switch freely; every data fetch that is
  tenant-scoped takes `clientId` as a variable.

## RULES

- **R1 — Read the focus, never assume it**: tenant-scoped queries receive
  `clientId` from `useClientId()` (or the resolved URL param), not from local
  state.
- **R2 — Respect `isLocked`** — never render a client selector for a locked
  user; never write `setClientId` for them.
- **R3 — The provider needs the route table** (`<ClientProvider routes=…>`)
  to keep the param coherent across navigation — mount it in the router shell.
