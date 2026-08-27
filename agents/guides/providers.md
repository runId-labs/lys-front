# Providers — catalog and rules

lys-front ships logic-only React providers (no UI, no styles). An application
mounts the stack once and CONSUMES the hooks everywhere else.

## Catalog (source: `src/providers/<Name>/`)

| Provider | Key hooks | Brings |
|----------|-----------|--------|
| `ConnectedUserProvider` | `useConnectedUserInfo` | auth state, `login(inputs:{login,password})`, `logout`, token refresh, `handleSessionExpired` |
| `WebserviceAccessProvider` | `usePermissionCheck`, `useWebserviceAccess` | per-webservice access map |
| `LysQueryProvider` / `LysMutationProvider` | — | permission-gated data (see `data-and-permissions.md`) |
| `AlertMessageProvider` | `useAlertMessages` | alert queue: `merge([{text, level}])`, deduped |
| `LysDialogProvider` | `useLysDialog` | dialog stack (see `dialog.md`) |
| `SignalProvider` | `useSignalSubscription` | SSE signals (see `signals.md`) |
| `UrlQueriesProvider` | `useUrlQueries` | staged/applied URL query params |
| `ClientProvider` | `useClientId` | multi-tenant focus (see `client-focus.md`) |
| `LocaleProvider` | `useLocale` | locale + message table |
| `PageContextProvider` | `usePageContext` | current page name/params (chatbot context) |
| `ChatbotProvider` | `useChatbot` | chatbot state (see `chatbot.md`) |
| `FilterLabelsProvider` | `useFilterLabels` | filter labels persisted in localStorage |
| `ErrorBoundaryProvider` | — | render errors → alert callback |
| `RouteProvider` | `useRouteInfo`, `useRouteAccess` | routing hub (see `routing.md`) |
| `Theme` | — | NOT provided: theming is app-owned |

## RULES

- **R1 — Consume, never re-mount**: providers are mounted ONCE by the
  application shell. A component calls the hooks; it never wraps itself in a
  provider. The only legitimate reason to mount one is building another
  application shell.
- **R2 — Provider order matters** (auth before data, data before page
  context, chatbot innermost so it resets per user). When editing a shell,
  read the existing stack comment before reordering.
- **R3 — Subpath imports**: `lys-front/providers`, `lys-front/tools`,
  `lys-front/types`, `lys-front/relay`, `lys-front/i18n`, `lys-front/templates`.
  Peer deps (react, react-relay, react-router-dom, react-intl) must resolve
  from the CONSUMING project — never add them as hard deps.
- **R4 — Alerts by error KEY**: `alertMessage.merge([{text: "BACKEND_CODE",
  level: "ERROR"}])` — the app's alert renderer translates keys; raw prose is
  for development only.
