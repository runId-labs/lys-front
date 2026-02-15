# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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