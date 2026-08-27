# Dialogs — LysDialogProvider mechanics

lys-front's dialog system mounts a component into a PANEL outside its natural
React tree. The panel renderer is injectable; the component does not render
the panel — it is rendered BY the panel. Source: `src/providers/LysDialogProvider/`.

## Configuration (DialogConfig)

```ts
openDialog({
    uniqueKey: "create-thing",          // stable identity (URL, stacking, updates)
    title: string | ReactNode,
    body: ComponentType,                // the COMPONENT, never JSX
    bodyProps?: Record<string, any>,
    size?: "sm" | "md" | "lg" | "xl",
    placement?: "start" | "end" | "top" | "bottom",
    backdrop?: boolean | "static",
    syncWithUrl?: boolean,              // default true — dStack URL param restores the stack
    loading?: boolean,                  // spinner instead of body
});
```

Dialogs STACK (`stack`, `current`); same `uniqueKey` re-opens/updates instead
of stacking a twin.

## Hooks

- `useLysDialog()` → `{open, close, back, update, current, stack}`
- `useDialogWithUpdates({uniqueKey, title, body, bodyProps, deps})` →
  `{open, close}` — keeps bodyProps fresh while the dialog is open (re-renders
  the body when `deps` change).

## Injectable panel

`LysDialogProvider` takes a `dialogComponent` (a `DialogComponentType`:
forwardRef component accepting `{id, title, body, size, placement, backdrop}`
— e.g. an Offcanvas wrapper) plus `loadingFallback` and `backIcon`. The
application shell decides what a "dialog" looks like.

`renderExtra(current)` renders alongside the open panel (receives the current
config, size included) for elements that must sit next to it — optional.

## Dialog-scoped URL state

URL params namespaced `{uniqueKey}_myParam` belong to that dialog. The
convention: persist per-dialog state under the dialog's prefix and let the
provider's URL sync clean them up when the dialog leaves the stack.

## RULES

- **R1 — Body = component + bodyProps, never JSX** (stored config would
  freeze the render tree).
- **R2 — The body closes itself through a prop** (`onCompleted: () =>
  closeDialog()` passed by the opener); it never calls `useLysDialog`.
- **R3 — Live bodyProps → `useDialogWithUpdates`**, never re-`open` in an
  effect.
- **R4 — Keys are stable identities** — constants, or counter-suffixed when
  the same dialog legitimately repeats.
