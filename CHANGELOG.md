# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.15.0] - 2026-08-31

### Added

- `useSignalReconnect` hook: runs a handler each time the SSE connection is re-established after a loss
- `SignalProvider` application-level reconnection loop over `EventSource`: exponential backoff with jitter after a drop, one token-refresh attempt on a connection that never opened, a heartbeat watchdog that reopens stalled connections, and throttled immediate retries on network/focus recovery

## [0.14.0] - 2026-08-31

### Added

- `INVITER_NOT_FOUND` error translation (500)

## [0.13.0] - 2026-08-30

### Added

- `DialogSize`: new `"xxl"` value

## [0.12.0] - 2026-08-27

No functional changes — `0.11.0` was already taken on the npm registry
(previous publish attempt succeeded despite a reported OTP error), so this
version republishes the same content under a free version number.

## [0.11.0] - 2026-08-27

### Added

- `DatedAlertMessageType.count`: `AlertMessageProvider` now dedupes repeated messages matching on both `text` and `level` — instead of adding a new entry, it increments `count` and refreshes `createdAt` on the existing one
- `ConnectedUserInterface.client` (`{name: string} | null`) exposing the connected user's client organization name, sourced from `ConnectedUserFragment_user.client.name`
- Billing mode and catalogue administration error translations (`PROVIDER_SUBSCRIPTION_ACTIVE`, `UNKNOWN_BILLING_MODE`, `PLAN_VERSION_PRICE_NOT_FOUND`, `PLAN_NOT_AVAILABLE`, `PLAN_VERSION_NOT_FOUND`, `PLAN_VERSION_NOT_PRICED`, `DUPLICATE_PRICE`, `INVALID_PRICE_AMOUNT`, `UNKNOWN_PRICE_PERIOD`, `UNKNOWN_CURRENCY`, `UNKNOWN_COMMITMENT`, `INVALID_COMMITMENT_DURATION`, `NO_RULE_ON_VERSION`, `DUPLICATE_RULE`, `UNKNOWN_RULE`, `INVALID_RULE_LIMIT`)
- `RouteProvider` exposing the active route, the route map and helpers via `useRouteInfo`, wiring page context and chatbot auto-open, and rendering project-supplied private/public templates
- `useRouteAccess` hook centralizing route permission checks (supports `string` and `string[]` any-of semantics for `mainWebserviceName`)
- Export `RouteProvider`, `useRouteInfo`, `useRouteAccess`, and related types (`RouteContextValue`, `RouteProviderProps`, `RouteTemplateProps`) from `runid-lys/providers`
- `agents/guides/` shipped in the npm package: per-topic guides (providers, data & permissions, dialog, i18n, routing, signals, chatbot, client focus) for agents consuming the library, indexed from `AGENTS.md`

### Changed

- `RouteInterface.mainWebserviceName` and `PageDescriptionType.mainWebserviceName` accept `string | string[]` (any-of) in addition to `string`
- `useRestrictedLink` delegates permission checking to `useRouteAccess` so single/array semantics stay in one place

### Fixed

- `LysQueryProvider` now reports `isLoading` for the whole in-flight window instead of only the single render before `loadQuery()` is dispatched: loading stays `true` from request until Relay resolves the current query reference (tracked via `resolvedQueryReferenceRef`), which stays correct on reloads where stale `data` is still present. Prevents a consumer polling `!isLoading && !data` from re-triggering mid-flight and disposing the in-flight query (infinite retrigger loop)
- `LysQueryProvider` default `parameters`/`options` props now use stable module-level references instead of inline literals, so callers omitting them no longer feed a new object into the load effect's dependency array on every render
- Empty-string URL query params are no longer coerced to `0` when forwarded to the chatbot page context
- `ChatbotProvider` resets its state (messages, conversation id, mode, streaming, refresh signal) when the connected user changes (login, logout, account switch) to prevent conversation leaks between accounts in the same browser session — implemented by keying the inner provider on `user?.id` so React unmounts the subtree atomically. Requires `ChatbotProvider` to be mounted inside `ConnectedUserProvider`.
- `ConnectedUserProvider` no longer fires each buffered webservice twice: the buffer flush is now performed outside the `setWebserviceBuffer` updater, which React double-invokes under StrictMode/concurrent rendering

## [0.6.0] - 2026-05-14

### Added

- `ChatbotBehaviourType.autoOpenOnEnter` flag, mapped to `RouteInterface.autoOpenChatbot` by `generateRouteFromDescription`
- `ChatbotBehaviourType.showWelcomeMessage` flag, mapped to `RouteInterface.showChatbotWelcome` (welcome message resolved against `<transPrefix>chatbotWelcome`)

## [0.5.0] - 2026-03-28

### Added

- `useRestrictedLink` hook combining route permission checking with navigation via `useTransition`
- Export `useRestrictedLink` hook and `RestrictedLink` type from `runid-lys/providers`

## [0.4.3] - 2026-03-16

### Changed

- `ClientProvider` now determines public pages dynamically from route configuration (`route.type`) via `matchPath` instead of hardcoded pathname checks
- `ClientProvider` requires a new `routes` prop (`RouteInterface[]`)
- `PublicAppTemplate` uses `<Navigate>` component instead of `useNavigate` + `useEffect` for redirect

## [0.4.2] - 2026-03-14

### Fixed

- `PageContextProvider` separates URL params from internal params to prevent `setPageContext` from overwriting `updatePageParams` state on same-page re-renders

## [0.4.1] - 2026-03-14

### Fixed

- `LysMutationProvider` now retries mutations after token refresh on `ACCESS_DENIED_ERROR` instead of calling `onError`
- `ClientProvider` syncs locked user's `clientId` to URL for chatbot mutations

## [0.4.0] - 2026-03-13

### Added

- `updatePageParams` method in `PageContextProvider` to merge additional params into the current page context without replacing existing ones

## [0.3.1] - 2026-03-10

### Fixed

- `ClientProvider` no longer syncs clientId to URL when user is disconnected, preventing interference with login redirect navigation

## [0.3.0] - 2026-03-07

### Added

- `ClientProvider` for managing current client ID selection (locked for client users, selectable for admins)
- `useClientId` hook exposing `clientId`, `setClientId`, and `isLocked`
- Batched URL update mechanism in `UrlQueriesProvider` via `queueMicrotask` to prevent race conditions

### Fixed

- TypeScript errors in `ConnectedUserProvider` (generic types on `useMutation` calls)
- TypeScript error in test-utils mock user (`lastValidationRequestAt` type)

## [0.2.0] - 2026-02-25

### Added

- `useSignalRefresh` hook for reactive query reloading on specific signals
- `SignalRefresh` type for useSignalRefresh return value
- Streaming support in ChatbotProvider: `isStreaming` state, `setIsStreaming`, `updateLastMessage`

## [0.1.1] - 2026-02-15

### Fixed

- Fix repository URL in package.json (runId-labs/lys-front)

## [0.1.0] - 2026-02-15

### Added

- 13 providers: ConnectedUser, LysQuery, LysMutation, LysDialog, AlertMessage, Signal, UrlQueries, WebserviceAccess, FilterLabels, ErrorBoundary, Chatbot, Locale, PageContext
- Hooks: usePermissionCheck, useAlertMessages, useConnectedUserInfo, useLysQuery, useLysMutation, useChatbot, useLocale, usePageContext
- Tools: stringTools, validationTools, i18nTools, relayTools, routeTools, translationTools
- Types: i18nTypes, pageTypes, routeTypes, descriptionTypes, relayTypes
- Relay environment setup
- i18n error/message translations
- PublicAppTemplate
- Subpath exports: providers, tools, types, relay, i18n, templates
- 282 unit tests