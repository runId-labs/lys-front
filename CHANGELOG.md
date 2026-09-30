# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.20.1] - 2026-09-30

### Fixed

- `LysDialogProvider`: `open()` on a `uniqueKey` already on the stack no longer stacks a second entry. The existing dialog is brought back to the top as it is (title, bodyProps and loading state kept, the new payload dropped), so an opener effect that runs again no longer buries a filled dialog under a copy stuck in loading. Use `update(uniqueKey, …)` to change what an open dialog shows
- `ClientProvider` no longer syncs `clientId` to the URL on a path no route matches. The sync's `setSearchParams` overrode the router's `<Navigate>` redirect (not-found page or default route), leaving the user on a blank page

## [0.20.0] - 2026-09-29

### Changed

- `ChatbotParamSpec` no longer carries `maxLength`, and a `text` param can no longer be a list. How much prose a type brings into the prompt is the framework's to decide — the validator caps every text declaration as the manifest is read, so a number written on the page was a second copy of it, the one nobody updates. And what legitimately comes in several — tags, companies, statuses — is a closed type, so a list never carries free text. Both now fail to compile. **Migration**: remove `maxLength` from every `text` param, and turn a multiple `text` into an `enum` or a `global_id`; the generator names each page and param it refuses
- `scripts/generate-routes-manifest.js` exits non-zero on a param declaration the validator will not use as written — an `enum` without `values`, a `text` with a `maxLength`, a `text` with `multiple` — instead of warning and emitting the manifest anyway. A warning in a build log does not catch a filter that renders nothing while the page's prompt keeps promising the model it exists. Every problem of every page is listed in one run, so one pass shows the whole fix

### Added

- 9 tests covering the refused declarations (enum without values, `maxLength` including 0, multiple text whatever it declares, the accepted types keeping their lists, several problems per page, the page named in each)

## [0.19.0] - 2026-09-28

### Added

- `ChatbotParamSpec.writable`: a page marks the params the MODEL may set (`set_page_params`, `navigate` arrival filters) — reading every declared param, writing only the writable ones. Default off, opt-in per param; the generator emits the flag and the lys validator enforces it
- `ChatbotParamSpec.internal` and `FrontendAction.internalParams`: a page declares a param as component state rather than a URL filter — the model's writes route through `updatePageParams` (page context) instead of the URL, so an internal flag never lands in the URL; reads stay bound to the declared schema
- The manifest generator reads the consumer's `chatbot.config.ts` (`globalWebservices`), merged with — not chosen over — the provider scan, so an app declares the framework-level webservices its pages reach through global components
- The manifest generator records EVERY root field of a generated document — the previous reader kept only the first — so a page mounting a multi-root component declares all of its webservices in the manifest
- 15 tests covering the root field extraction (multi-root, scalar root, alias, directive, fragment spread, string literal, object default value), the declared global webservices and the page context param removal

### Changed

- `usePageContext().updatePageParams` removes a key passed as `null` instead of merging the null. A one-shot param (a node to center on, a row to reveal) is consumed by the component and retracted, so the page context stops asserting a state the screen no longer has — and the chatbot's read path stops rejecting a null every turn. No consumer passed null before: setting a value still declares it.

### Fixed

- The manifest generator captures the generated document's `text` as a JSON string: an argument holding a string literal (`typeId: "FOUNDER_CUSTOMER"`) no longer truncates the document mid-argument, a truncation that left the brace scan unbalanced and dropped every root field of the file
- The manifest generator reads the field name behind its alias (`draftActions: allActions` declares `allActions`) and keeps a scalar root (`mutation M { ping }`), both of which the previous reader lost
- The manifest generator no longer takes a non-field token for a webservice: a root directive (`thing @include(if: $s)` declares `thing`), a fragment spread, `__typename`, a brace inside a string literal and an object default value in the variable definitions (`query X($f: Filter = {a: 1})`) each used to yield a wrong name or drop the document

## [0.18.0] - 2026-09-27

### Added

- `ChatbotParamSpec` / `ChatbotParamType` types and `ChatbotBehaviourType.params`: a page declares the URL params the chatbot may read, by type (`global_id`, `uuid`, `int`, `bool`, `date`, `enum`, `text`). The spec is discriminated on `type`, so `enum` requires `values` and `text` requires `maxLength` — the declarations the lys validator would otherwise drop at runtime
- `scripts/generate-routes-manifest.js` emits the declared params at the route level of the manifest, in the snake_case keys the validator reads (`max_length`, `max_items`), and warns at build time about a declaration that accepts nothing
- `ChatbotBehaviourType.specialTools`: the special tools a page opts into, extracted by the generator into the manifest's `special_tools`
- `bin: lys-front-generate-routes` — the manifest generator ships as a package bin: a consumer runs it with `"generate:routes": "lys-front-generate-routes"` and no local copy. It generates for the working directory (an explicit root can be passed), scans the consumer's providers AND the framework's own for global webservices, and carries the `specialTools` extraction the copies it replaces silently truncated to the array's last item (`propose_memory` was dropped from every page)
- The published package ships the providers' `__generated__` GraphQL artifacts, so the bin finds the framework's global webservices (`login`, `logout`, `connectedUser`...) from an installed package and not only from a checkout; it warns instead of emitting an incomplete manifest when it cannot
- 14 tests covering the manifest extraction (brace matching, param spec translation, chatbot behaviour)

### Fixed

- The generator reports a missing pages directory with a usage message instead of an unhandled `ENOENT`

## [0.17.0] - 2026-09-18

### Added

- Error translations for license, subscription, rule and discount errors: `USER_ALREADY_LICENSED`, `USER_NOT_LICENSED`, `NO_ACTIVE_SUBSCRIPTION`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_INACTIVE`, `SUBSCRIPTION_ALREADY_EXISTS`, `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`, `DOWNGRADE_RULE_NOT_FOUND`, `DISCOUNT_NOT_FOUND`, `DISCOUNT_NOT_AVAILABLE`, `DISCOUNT_ALREADY_GRANTED`, `DISCOUNT_WITHOUT_PRICE`

## [0.16.0] - 2026-09-03

### Added

- `useRelayPagination` hook: cursor variables and page size for a Relay connection in one place, with `resetToFirstPage` and `onPaginationChange`
- `RelayPageInfo` and `PaginationChangeEvent` types

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