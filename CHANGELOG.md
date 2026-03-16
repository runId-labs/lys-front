# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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