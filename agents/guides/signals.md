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

## Reconnection

`EventSource` only retries transport drops on its own; a non-200 response
(expired token, API rollout) closes it for good. `SignalProvider` layers a
reconnection loop on top: a drop after a successful open retries with a
capped, jittered exponential backoff; a drop before ever opening gets one
token-refresh attempt (via the queue already owned by `ConnectedUserProvider`)
before retrying; a connection that stops carrying heartbeats is torn down and
reopened; regaining network or focus retries right away instead of waiting
out the backoff, throttled so repeated wake-up events don't burst the API.

`isConnected` and `error` (from `useSignal`) reflect this loop, not just the
raw `EventSource` state.

Nothing missed during an outage is replayed — no event id, no server-side
history. Consumers whose state must be accurate after a reconnect use
`useSignalReconnect` to refetch:

```tsx
useSignalReconnect(refreshUnreadCount, [refreshUnreadCount]);
```

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
- **R5 — A reconnect replays nothing**: state built from signals is stale
  once the connection drops, even briefly. Use `useSignalReconnect` to
  refetch it rather than trusting `isConnected` to flip back silently.
