# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lys-front (`runid-lys` on npm) is the frontend framework library for the lys ecosystem. It provides logic-only React providers, hooks, tools, and types — no UI components, no styles. It is designed to be consumed by application projects (e.g., `financial-front`) via subpath imports.

## Codebase Map

### Providers: `src/providers/`

| Provider | Purpose |
|----------|---------|
| `ConnectedUserProvider` | Authentication, JWT refresh, login/logout mutations, user state |
| `LysQueryProvider` | GraphQL query wrapper with loading, error handling, permission checks |
| `LysMutationProvider` | GraphQL mutation wrapper with error handling, permission checks |
| `LysDialogProvider` | Dialog stack management (open/close/back/update) |
| `AlertMessageProvider` | Alert message accumulation and console routing |
| `SignalProvider` | SSE EventSource connection, signal dispatch and subscription |
| `UrlQueriesProvider` | URL query parameter management with staged/applied state |
| `WebserviceAccessProvider` | Permission checking via webservice access levels |
| `FilterLabelsProvider` | Filter label persistence via localStorage |
| `ErrorBoundaryProvider` | React error boundary with fallback rendering |
| `ChatbotProvider` | AI chatbot state (messages, conversation, refresh signal) |
| `LocaleProvider` | Locale and i18n message management |
| `PageContextProvider` | Page-level context (params, metadata) |

### Hooks: `src/providers/hooks/`

| Hook | Provider |
|------|----------|
| `usePermissionCheck` | Standalone — checks operations against webservice access levels |

Each provider also exports its own hook (e.g., `useLysQuery`, `useLysMutation`, `useChatbot`, `useLocale`, etc.).

### Tools: `src/tools/`

| Tool | Purpose |
|------|---------|
| `stringTools` | String manipulation utilities |
| `validationTools` | Form validation (isEmpty, cleanParameters, nested value access) |
| `i18nTools` | i18n table and message generation |
| `relayTools` | Relay helper utilities |
| `routeTools` | Route table generation from app descriptions |
| `translationTools` | Type-safe translation config generation and `useTranslations` hook |

### Types: `src/types/`

| Type file | Purpose |
|-----------|---------|
| `i18nTypes` | Translation type definitions |
| `pageTypes` | Page description types |
| `routeTypes` | Route configuration types |
| `descriptionTypes` | Component description types |
| `relayTypes` | GraphQL error types, Relay network error, AppDescription |

### Other: `src/`

| Path | Purpose |
|------|---------|
| `relay/RelayEnvironment.ts` | Relay environment setup and cache management |
| `i18n/` | Error and message translations (errors.ts, messages.ts) |
| `templates/PublicAppTemplate.tsx` | Public (unauthenticated) app template |

## Subpath Exports

```typescript
import { ... } from "runid-lys/providers"   // Providers, hooks, contexts, types
import { ... } from "runid-lys/tools"       // Utility functions
import { ... } from "runid-lys/types"       // TypeScript types
import { ... } from "runid-lys/relay"       // Relay environment
import { ... } from "runid-lys/i18n"        // i18n translations
import { ... } from "runid-lys/templates"   // App templates
```

## Development Commands

```bash
npm run build              # Build library (Vite)
npm run build:watch        # Build in watch mode
npm run typecheck          # TypeScript type checking
npm test                   # Run all tests (vitest)
npm run test:watch         # Run tests in watch mode
```

## Testing

- **Framework**: Vitest + @testing-library/react + jsdom
- **Test location**: Co-located as `*.test.ts` / `*.test.tsx` next to source files
- **Setup**: `src/test/setup.ts` (@testing-library/jest-dom + cleanup)
- **Utilities**: `src/test/test-utils.tsx` (mockUser, renderWithProviders)
- **Current count**: 282 tests across 20 files

## Development Guidelines

### Language and Documentation Standards
- **Project language**: All code, comments, documentation, and commit messages must be in English
- **No marketing language**: Avoid superlatives or promotional terms
- **Technical precision**: Focus on functionality and implementation details

### Code Style Standards
- **TypeScript strict**: No `any` in production source code (tests may use `any`)
- **String quotes**: Use double quotes `"` for strings
- **Naming**: Components use PascalCase with type suffix (e.g., `LysQueryProvider`, `AlertMessageProvider`)

## Git & Commit Workflow

### Git Rules
- **CRITICAL**: Do NOT sign commits — no GPG signatures, no Co-Authored-By lines, no Generated with Claude Code footers
- Do NOT add any attribution, signature, or authorship metadata to commit messages
- Commit messages should contain ONLY the conventional commit format with description
- **IMPORTANT**: NEVER commit changes unless explicitly asked by the user with "commit" command
- Do NOT proactively stage files or create commits — wait for explicit user instruction

### Commit Process

When the user validates code and asks to commit:

1. **Write/update tests** covering the changes. Verify they pass with `npm test`.
2. **Build** the library with `npm run build` to ensure no build errors.
3. **Determine commit type** using conventional commit format:
   ```
   type(scope): description

   - Detail bullet points
   ```
4. **Update `CHANGELOG.md`** under `[Unreleased]` — add entry under `Added`, `Changed`, `Fixed`, or `Removed`.
5. **Auto-detect version bump** from commit type and update `version` in `package.json` (line 3):
   - `fix:` → patch bump (e.g., 0.1.0 → 0.1.1)
   - `feat:` → minor bump (e.g., 0.1.0 → 0.2.0)
   - `feat!:` or `BREAKING CHANGE` → major bump (e.g., 0.1.0 → 1.0.0)
   - `refactor:`, `docs:`, `chore:`, `test:`, `style:` → no version bump
6. **Commit** with conventional commit message (no signatures, no attribution).
7. **If version was bumped**: create git tag `git tag v{new_version}` and tell the user to run `git push origin main --tags` to push code + tag, then `npm publish` to publish to npm.

Example of correct commit message:
```
feat: add dialog update support for body props

- Add updateDialog method to LysDialogProvider
- Support partial updates of bodyProps and title
- Add 4 unit tests for update scenarios
```

## Documentation Reference

- **Improvement tracking**: `docs/todos/lys-front-improvements.md`
- **Migration cost analysis**: `docs/todos/relay-to-apollo-migration-cost.md`