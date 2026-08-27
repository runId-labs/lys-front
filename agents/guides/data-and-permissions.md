# Data and permissions — LysQuery / LysMutation

The two data providers are the ONLY sanctioned way to run GraphQL from
components. Their superpower: **they render nothing when the connected user
lacks access to the webservice** — that IS the permission check.

## Query pattern (state-ref + parse on data)

```tsx
const [queryRef, setQueryRef] = useState<LysQueryRefInterface<MyQuery> | null>(null);

useEffect(() => {                                   // initial load once permitted
    if (queryRef?.hasPermission && !queryRef?.isLoading && !queryRef.data) queryRef.load();
}, [queryRef?.hasPermission]);

useEffect(() => { /* parse queryRef.data into local state */ }, [queryRef?.data]);

<LysQueryProvider query={MY_QUERY} parameters={params} ref={setQueryRef}
                  options={{fetchPolicy: "network-only"}}>
    {queryRef?.data && <MyComponent data={parsed} />}
</LysQueryProvider>
```

Ref surface: `hasPermission`, `isLoading`, `data`, `load()`. Optional
`accessParameters={{ownerIds: [...]}}` narrows row-level access.

## Mutation pattern

```tsx
const [mutationRef, setMutationRef] = useState<LysMutationRefInterface | null>(null);

<LysMutationProvider mutation={MY_MUTATION} ref={setMutationRef}>
    {mutationRef?.commit && (
        <MyComponent onConfirm={(inputs) => mutationRef.commit({
            variables: {inputs},
            onCompleted: () => …,
            onError: () => alertMessage.merge([{text: "ERROR_KEY", level: "ERROR"}]),
        })} />
    )}
</LysMutationProvider>
```

## RULES

- **R1 — Never hand-roll permission gating around these providers.** Rendering
  nothing without access is built in. `usePermissionCheck` / `useRouteAccess`
  are for FINE-GRAINED UI only (enable a link, hide a menu entry) — never to
  wrap a query.
- **R2 — Error payloads are error KEYS**, translated by the app's alert
  renderer (see `providers.md` R4).
- **R3 — Operations are Relay documents** (`graphql\`` tags compiled by the
  project's relay-compiler against the API schema). The providers do not
  fetch: they wrap Relay environment calls with permission + loading state.
- **R4 — Composability**: features compose these providers; pages compose
  features. Elements (pure UI) never touch them.
- **R5 — Expose `hasPermission` upward** with `useImperativeHandle` on a
  `<Name>RefInterface` when a parent needs to compose gated UI.
