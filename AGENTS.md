# AGENTS.md — lys-front

Logic-only React frontend framework for the lys ecosystem (`runid-lys` on
npm): providers, hooks, tools and types — no UI components, no styles. It is
designed to be consumed by application projects (e.g., `financial-front`) via
subpath imports.

## For agents working on lys-front itself

### Codebase map

#### Providers: `src/providers/`

One directory per provider (hooks co-located; `src/providers/hooks/` holds the
standalone ones). The authoritative catalog — provider purpose, key hooks and
usage rules — is `agents/guides/providers.md` (shipped in the npm package).
When adding, removing or changing a provider, update that guide IN THE SAME
commit.

#### Hooks: `src/providers/hooks/`

| Hook | Provider |
|------|----------|
| `usePermissionCheck` | Standalone — checks operations against webservice access levels |

Each provider also exports its own hook (e.g., `useLysQuery`, `useLysMutation`, `useChatbot`, `useLocale`, etc.).

#### Tools: `src/tools/`

| Tool | Purpose |
|------|---------|
| `stringTools` | String manipulation utilities |
| `validationTools` | Form validation (isEmpty, cleanParameters, nested value access) |
| `i18nTools` | i18n table and message generation |
| `relayTools` | Relay helper utilities |
| `routeTools` | Route table generation from app descriptions |
| `translationTools` | Type-safe translation config generation and `useTranslations` hook |

#### Types: `src/types/`

| Type file | Purpose |
|-----------|---------|
| `i18nTypes` | Translation type definitions |
| `pageTypes` | Page description types |
| `routeTypes` | Route configuration types |
| `descriptionTypes` | Component description types |
| `relayTypes` | GraphQL error types, Relay network error, AppDescription |

#### Other: `src/`

| Path | Purpose |
|------|---------|
| `relay/RelayEnvironment.ts` | Relay environment setup and cache management |
| `i18n/` | Error and message translations (errors.ts, messages.ts) |
| `templates/PublicAppTemplate.tsx` | Public (unauthenticated) app template |

### Subpath exports

```typescript
import { ... } from "runid-lys/providers"   // Providers, hooks, contexts, types
import { ... } from "runid-lys/tools"       // Utility functions
import { ... } from "runid-lys/types"       // TypeScript types
import { ... } from "runid-lys/relay"       // Relay environment
import { ... } from "runid-lys/i18n"        // i18n translations
import { ... } from "runid-lys/templates"   // App templates
```

### Development commands

```bash
npm run build              # Build library (Vite)
npm run build:watch        # Build in watch mode
npm run typecheck          # TypeScript type checking
npm test                   # Run all tests (vitest)
npm run test:watch         # Run tests in watch mode
```

### Testing

- **Framework**: Vitest + @testing-library/react + jsdom
- **Test location**: Co-located as `*.test.ts` / `*.test.tsx` next to source files
- **Setup**: `src/test/setup.ts` (@testing-library/jest-dom + cleanup)
- **Utilities**: `src/test/test-utils.tsx` (mockUser, renderWithProviders)
- **Current count**: 282 tests across 20 files

### Development guidelines

#### Language and documentation standards
- **Project language**: All code, comments, documentation, and commit messages must be in English
- **No marketing language**: Avoid superlatives or promotional terms
- **Technical precision**: Focus on functionality and implementation details

#### Code style standards
- **TypeScript strict**: No `any` in production source code (tests may use `any`)
- **String quotes**: Use double quotes `"` for strings
- **Naming**: Components use PascalCase with type suffix (e.g., `LysQueryProvider`, `AlertMessageProvider`)

### Git & commit workflow

#### Git rules
- **CRITICAL**: Do NOT sign commits — no GPG signatures, no Co-Authored-By lines, no agent-generated attribution footers
- Do NOT add any attribution, signature, or authorship metadata to commit messages
- Commit messages should contain ONLY the conventional commit format with description
- **IMPORTANT**: NEVER commit changes unless explicitly asked by the user with a "commit" instruction
- Do NOT proactively stage files or create commits — wait for explicit user instruction

#### Commit process

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
6. **If the version was bumped at step 5, archive `[Unreleased]` in the CHANGELOG** — MANDATORY, do NOT skip:
   - Rename the current `## [Unreleased]` heading to `## [{new_version}] - {today YYYY-MM-DD}` so all the entries (including the one just added at step 4) end up in the new dated release section.
   - Insert a fresh empty `## [Unreleased]` heading above it so the next contributor has a clean section to write into.
   - Verify with `grep -n "^## " CHANGELOG.md | head -5` that the top now reads: `## [Unreleased]` then `## [{new_version}] - {date}` then the previous release.
   - Why this exists: without this step, `[Unreleased]` accumulates entries across multiple releases and the CHANGELOG no longer maps to the git tags. This has happened before — do not skip.
7. **Commit** with conventional commit message (no signatures, no attribution). The single commit must include code, tests, CHANGELOG (with `[Unreleased]` archived if step 6 applied), and `package.json`.
8. **If version was bumped**: create git tag `git tag v{new_version}` and tell the user to run `git push origin main --tags` to push code + tag, then `npm publish` to publish to npm.

Example of correct commit message:
```
feat: add dialog update support for body props

- Add updateDialog method to LysDialogProvider
- Support partial updates of bodyProps and title
- Add 4 unit tests for update scenarios
```

### Documentation reference

- **Improvement tracking**: `docs/todos/lys-front-improvements.md`
- **Migration cost analysis**: `docs/todos/relay-to-apollo-migration-cost.md`

## For agents working on a consuming project

The provider guides are available inside the installed package:
`node_modules/lys-front/agents/guides/` (requires lys-front ≥ 0.11.0).

| Topic | Guide |
|-------|-------|
| Provider catalog and rules | `agents/guides/providers.md` |
| LysQuery / LysMutation / permissions | `agents/guides/data-and-permissions.md` |
| Dialog system | `agents/guides/dialog.md` |
| Translations contract | `agents/guides/i18n.md` |
| Routing and page configs | `agents/guides/routing.md` |
| Real-time signals | `agents/guides/signals.md` |
| Chatbot integration | `agents/guides/chatbot.md` |
| Multi-tenant client focus | `agents/guides/client-focus.md` |

Project-structure conventions (layers, where files live) belong to the
consuming project's own AGENTS.md, not here.
