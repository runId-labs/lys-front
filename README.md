# lys-front

[![npm version](https://img.shields.io/npm/v/runid-lys.svg)](https://www.npmjs.com/package/runid-lys)
[![license](https://img.shields.io/npm/l/runid-lys.svg)](https://github.com/runId-labs/lys-front/blob/main/LICENSE)

Frontend framework library for the [lys](https://pypi.org/project/runid-lys/) ecosystem — providers, hooks, tools, and types for React applications.

## Install

```bash
npm install runid-lys
```

## Subpath exports

```typescript
import { ... } from "runid-lys/providers"   // React providers and hooks
import { ... } from "runid-lys/tools"       // Utility functions
import { ... } from "runid-lys/types"       // TypeScript types
import { ... } from "runid-lys/relay"       // Relay environment
import { ... } from "runid-lys/i18n"        // i18n translations
import { ... } from "runid-lys/templates"   // App templates
```

## Peer dependencies

- `react` ^18.0.0
- `react-dom` ^18.0.0
- `react-intl` ^6.0.0 || ^7.0.0
- `react-relay` ^18.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
- `relay-runtime` ^18.0.0

## License

[Apache 2.0](LICENSE)