# Chatbot — provider and frontend actions

Source: `src/providers/ChatbotProvider/`, `src/providers/PageContextProvider/`.

## State (useChatbot)

`{messages, conversationId, isChatbotMode, isChatbotEnabled, isStreaming,
refreshSignal, addMessage, updateLastMessage, setConversationId,
setIsChatbotMode, setIsStreaming, triggerRefresh}`.

The provider is keyed by user id internally — the whole chat state resets on
account switch (no cross-account leaks). Mount it INSIDE
`ConnectedUserProvider` and ABOVE the router so history survives navigation.

## Page context (chatbot awareness)

`PageContextProvider` exposes `{pageName, params}` — the chatbot backend uses
it to scope answers to the current page. `RouteProvider` feeds it; `route`
options `autoOpenChatbot` / `showChatbotWelcome` control chatbot behaviour on
arrival.

### Declared params

`params` is the only part of the prompt the CLIENT controls, so the backend
renders a param to the model only when the page DECLARES it, by type, in the
routes manifest. Anything else is dropped and logged (`[PageParams]`). A page
that declares nothing exposes nothing: the chatbot sees no screen state at all.

A page declares its params in `chatbotBehaviour.params`
(`Record<string, ChatbotParamSpec>`), and the manifest generator lifts them to
the route level in the keys the validator reads:

```typescript
chatbotBehaviour: {
    prompt: chatbotPrompt,
    params: {
        orderId: {type: "global_id"},
        status: {type: "enum", values: ["DRAFT", "PAID"], multiple: true},
        search: {type: "text", maxLength: 120},
    },
}
```

Types: `global_id`, `uuid`, `int`, `bool`, `date`, `enum` (needs `values`),
`text` (needs `maxLength`). `multiple` makes the param a list, capped by
`maxItems` (50 by default), and one invalid item drops the whole list. `enum`
without `values` and `text` without `maxLength` accept nothing — the omission
fails closed, and the generator warns at build time.

`chatbotBehaviour.specialTools` is declared the same way and gated the same
way: a special tool (`propose_memory`, `propose_action`...) the page does not
list is not offered to the model on that page.

### Generating the manifest

The generator ships as a bin, so a consuming project needs no copy of it:

```json
"scripts": {"generate:routes": "lys-front-generate-routes"}
```

It reads `src/components/pages/*/config.ts`, writes
`public/routes-manifest.json`, and takes an explicit project root as its only
argument. The manifest is the SERVER's copy of the declaration — regenerate it
and deploy it whenever a page's params, prompt or special tools change, or the
backend keeps validating against the previous version.

## FrontendAction (backend-driven UI actions)

The streaming chat response may carry `frontendActions`: typed actions the
FRONT executes — `navigate` (path, `:param` substitution then the remaining
params as a query string — the model's validated arrival filters — optional
`continueAction`), `refresh` (node types), `update_page_params` (the filters
the model set through `set_page_params`: apply with `useUrlQueries().update()`,
the URL is the source of truth and the screen refilters), plus PROJECT-DEFINED
types (e.g. proposals) that the application's chat panel interprets. Generic
navigation/refresh/filter-update live in the framework; anything richer belongs
to the app's chat component.

## RULES

- **R1 — One chat entry point per app**: an app-level chat component owns the
  UI (messages, input, streaming states); the provider owns state. Don't
  duplicate state slices locally.
- **R2 — Streaming messages update in place** (`updateLastMessage`) — append
  only on new turns.
- **R3 — Tool activity labels are app content**: backend tool names must be
  mapped to human labels by the app's chat component; never surface raw tool
  names.
- **R4 — Never render `frontendActions` verbatim** — interpret them.
- **R5 — Declare a param before reading it, and prefer a closed type**: an id,
  an enum, a date or a flag cannot carry an instruction into the prompt;
  `text` can, so declare it only for a field that legitimately holds prose (a
  search box) and cap it to what the page produces. Document every declared
  key in the prompt — its meaning, and the default when it is absent.
- **R6 — `writable` is a separate grant**: the model may SET only the params
  marked `writable: true` (`set_page_params`, `navigate` arrival filters) —
  default off, opt-in per param. The dossier-level id (`clientId`) typically
  stays read-only: the model works WITHIN the user's dossier, never switches
  it. An `update_page_params` action applies each half through its channel:
  `params` via `useUrlQueries().update()` (the URL, source of truth for
  filters), `internalParams` via `updatePageParams()` (page context, component
  state).
- **R7 — `internal: true` declares component state**, not a URL filter: the
  value rides the page context (`updatePageParams`), never the URL. A component
  exposing such a param syncs its state both ways — its own toggle pushes the
  value to the context, and a context change (e.g. the model's
  `set_page_params`) updates the component. Declare it, document it in the
  prompt like any other param.
