# Signals — real-time SSE

Source: `src/providers/SignalProvider/`.

## Mechanism

`SignalProvider` opens an `EventSource` on `${VITE_SSE_ENDPOINT}/sse/signals`
(with credentials) and subscribes to the connected user's channel. The BACKEND
API restricts delivery to the user's own channel — the channel contract is
the security model.

## Subscription

```tsx
useSignalSubscription((signal) => {
    if (signal.signal === "MY_THING_DONE" && …) { /* refetch / update badge */ }
}, [deps]);
```

Signal shape: `{signal: "SCREAMING_SNAKE_NAME", params: {…plain data…}}`.

## RULES

- **R1 — Signal names are a contract with the backend** — exact match,
  renaming breaks consumers silently (treat like webservice names).
- **R2 — Reactions should be cheap**: the usual pattern is marking stale data
  and refetching, ideally DEBOUNCED when the backend fans out bursts (one
  signal per item of a batch).
- **R3 — params are plain data** sent by the backend (ids, primitives) —
  never expect entities.
- **R4 — Do not use signals for user-facing notifications** — those arrive as
  the `NEW_NOTIFICATION` signal with a `type_id` and are rendered by the
  application's notification components; subscribe to them only to refresh
  badges/lists.
