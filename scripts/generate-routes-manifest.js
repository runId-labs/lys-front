#!/usr/bin/env node
/**
 * Generate routes manifest for chatbot navigation
 * Parses page configs and recursively extracts all webservices from Restricted components
 *
 * Usage: node scripts/generate-routes-manifest.js
 * Output: public/routes-manifest.json
 */

import {readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, realpathSync} from "fs";
import {join, dirname, resolve, basename} from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The consumer project to generate for. Defaults to the working directory — the
// bin is run from the consumer's package root by npm — so no copy of this script
// is needed in the consumer repo; pass an explicit root to run it elsewhere.
const ROOT_DIR = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
const SRC_DIR = join(ROOT_DIR, "src");
const PAGES_DIR = join(ROOT_DIR, "src/components/pages");
const PROVIDERS_DIR = join(ROOT_DIR, "src/components/providers");
// The framework's own providers — resolved from THIS script's location, so it
// works from the checkout and from the installed package alike. Their global
// webservices (login, logout, connectedUser...) belong to the manifest too, so
// package.json ships the `__generated__` GraphQL artifacts this reads.
const LYS_FRONT_PROVIDERS_DIR = join(__dirname, "..", "src", "providers");
// App-level chatbot declarations (global webservices). Declarative on
// purpose: a webservice the chatbot may call from any page does not have to
// be mounted by a provider — running a query app-wide just to land in the
// manifest would be a side effect, not a feature.
const CHATBOT_CONFIG_FILE = join(ROOT_DIR, "chatbot.config.ts");
const OUTPUT_FILE = join(ROOT_DIR, "public/routes-manifest.json");

// Cache for webservices extraction
const restrictedWebservicesCache = new Map();

/******************************************************************************
 * CONFIG PARSING
 ******************************************************************************/

/**
 * Extract value from TypeScript object property
 */
function extractStringValue(content, propertyName) {
    const regex = new RegExp(`${propertyName}:\\s*["'\`]([^"'\`]+)["'\`]`);
    const match = content.match(regex);
    return match ? match[1] : null;
}

/**
 * Extract a string array property from TypeScript object content
 */
function extractStringArray(content, propertyName) {
    const match = content.match(new RegExp(`${propertyName}:\\s*\\[([^\\]]*)\\]`));
    if (!match) return null;

    const arrayContent = match[1];
    const values = [];
    const stringRegex = /["']([^"']+)["']/g;
    let stringMatch;
    while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
        values.push(stringMatch[1]);
    }
    return values;
}

/**
 * Extract extraWebservices array from config content
 */
function extractExtraWebservices(content) {
    return extractStringArray(content, "extraWebservices") ?? [];
}

/**
 * Extract a brace-delimited block, braces included, starting at an opening brace
 */
function extractBraceBlock(content, openIndex) {
    if (content[openIndex] !== "{") return null;

    let depth = 1;
    let endIndex = openIndex + 1;
    let inString = false;
    let quote = "";

    while (depth > 0 && endIndex < content.length) {
        const char = content[endIndex];
        if (inString) {
            // An escaped character never closes the string, and never
            // counts as a brace either.
            if (char === "\\") {
                endIndex += 2;
                continue;
            }
            if (char === quote) {
                inString = false;
            }
        } else if (char === "\"" || char === "'") {
            inString = true;
            quote = char;
        } else if (char === "{") {
            depth++;
        } else if (char === "}") {
            depth--;
        }
        endIndex++;
    }

    return depth === 0 ? content.slice(openIndex, endIndex) : null;
}

/**
 * Parse one declared param spec into its manifest shape
 *
 * The page description writes camelCase (`maxLength`, `maxItems`); the validator
 * reads snake_case (`max_length`, `max_items`), so the keys are translated here
 * like `contextTools` is.
 */
function parseParamSpec(specBlock) {
    const type = extractStringValue(specBlock, "type");
    if (!type) return null;

    const spec = {type};

    const valuesMatch = specBlock.match(/values:\s*\[([^\]]*)\]/);
    if (valuesMatch) {
        const values = [];
        const stringRegex = /["']([^"']*)["']/g;
        let stringMatch;
        while ((stringMatch = stringRegex.exec(valuesMatch[1])) !== null) {
            values.push(stringMatch[1]);
        }
        if (values.length > 0) spec.values = values;
    }

    const maxLengthMatch = specBlock.match(/maxLength:\s*(\d+)/);
    if (maxLengthMatch) spec.max_length = parseInt(maxLengthMatch[1], 10);

    if (/multiple:\s*true/.test(specBlock)) spec.multiple = true;

    if (/writable:\s*true/.test(specBlock)) spec.writable = true;

    if (/internal:\s*true/.test(specBlock)) spec.internal = true;

    const maxItemsMatch = specBlock.match(/maxItems:\s*(\d+)/);
    if (maxItemsMatch) spec.max_items = parseInt(maxItemsMatch[1], 10);

    return spec;
}

/**
 * Extract the declared params from a chatbotBehaviour block
 *
 * Emitted at the ROUTE level (not under chatbot_behaviour) because that is where
 * the validator reads them. A page that declares none exposes none: the params
 * the client sends are then all dropped server-side.
 */
function extractParams(behaviourContent) {
    const paramsMatch = behaviourContent.match(/params:\s*\{/);
    if (!paramsMatch) return null;

    const paramsBlock = extractBraceBlock(behaviourContent, paramsMatch.index + paramsMatch[0].length - 1);
    if (!paramsBlock) return null;

    const params = {};
    const keyRegex = /["']?([A-Za-z0-9_]+)["']?:\s*\{/g;
    let keyMatch;

    while ((keyMatch = keyRegex.exec(paramsBlock)) !== null) {
        const specBlock = extractBraceBlock(paramsBlock, keyRegex.lastIndex - 1);
        if (!specBlock) continue;

        // Skip past the spec so a nested key is never read as a param name
        keyRegex.lastIndex = keyRegex.lastIndex - 1 + specBlock.length;

        const spec = parseParamSpec(specBlock);
        if (spec) params[keyMatch[1]] = spec;
    }

    return Object.keys(params).length > 0 ? params : null;
}

/**
 * Warn about declarations the validator will drop at runtime
 */
function warnUnusableParams(pageName, params) {
    for (const [key, spec] of Object.entries(params)) {
        if (spec.type === "enum" && !spec.values) {
            console.warn(`  ! ${pageName}: param "${key}" declares enum without values, it will accept nothing`);
        }
        if (spec.type === "text" && !spec.max_length) {
            console.warn(`  ! ${pageName}: param "${key}" declares text without maxLength, it will accept nothing`);
        }
    }
}

/**
 * Extract chatbotBehaviour object from config content
 *
 * Returns the manifest `chatbot_behaviour` object and, separately, the declared
 * params, which the manifest carries at the route level.
 */
function extractChatbotBehaviour(content) {
    // Match chatbotBehaviour: { ... }
    const behaviourMatch = content.match(/chatbotBehaviour:\s*\{/);
    if (!behaviourMatch) return {behaviour: null, params: null};

    const behaviourContent = extractBraceBlock(content, behaviourMatch.index + behaviourMatch[0].length - 1);
    if (!behaviourContent) return {behaviour: null, params: null};

    // Extract prompt - either inline template literal or variable reference
    let prompt = null;

    // Try inline template literal first
    const inlinePromptMatch = behaviourContent.match(/prompt:\s*`([\s\S]*?)`/);
    if (inlinePromptMatch) {
        prompt = inlinePromptMatch[1];
    } else {
        // Try variable reference (e.g., prompt: chatbotPrompt)
        const varRefMatch = behaviourContent.match(/prompt:\s*(\w+)/);
        if (varRefMatch) {
            const varName = varRefMatch[1];
            // Find the variable declaration in the file content
            const varDeclRegex = new RegExp(`const\\s+${varName}\\s*=\\s*\`([\\s\\S]*?)\`;`);
            const varDeclMatch = content.match(varDeclRegex);
            if (varDeclMatch) {
                prompt = varDeclMatch[1];
            }
        }
    }

    // Extract contextTools
    let contextTools = null;
    const toolsMatch = behaviourContent.match(/contextTools:\s*\{([^}]+)\}/);
    if (toolsMatch) {
        contextTools = {};
        const toolsContent = toolsMatch[1];
        const toolRegex = /(\w+):\s*["']([^"']+)["']/g;
        let toolMatch;
        while ((toolMatch = toolRegex.exec(toolsContent)) !== null) {
            contextTools[toolMatch[1]] = toolMatch[2];
        }
    }

    // Extract specialTools array (e.g. ["propose_memory", "propose_action"]) —
    // the special tools a page opts into. The character class must escape the
    // `]` ([^\]]): an unescaped one reads as "any character" in JS and silently
    // truncated the array to its last item.
    let specialTools = null;
    const specialToolsMatch = behaviourContent.match(/specialTools:\s*\[([^\]]*)\]/);
    if (specialToolsMatch) {
        specialTools = [];
        const arrayContent = specialToolsMatch[1];
        const stringRegex = /["']([^"']+)["']/g;
        let stringMatch;
        while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
            specialTools.push(stringMatch[1]);
        }
    }

    const params = extractParams(behaviourContent);

    if (!prompt && !contextTools && !specialTools) return {behaviour: null, params};

    const behaviour = {};
    if (prompt) behaviour.prompt = prompt;
    if (contextTools) behaviour.context_tools = contextTools;
    if (specialTools) behaviour.special_tools = specialTools;
    return {behaviour, params};
}

/**
 * Parse a page config file and extract route information
 */
function parsePageConfig(pageName) {
    const configPath = join(PAGES_DIR, pageName, "config.ts");
    try {
        const content = readFileSync(configPath, "utf-8");

        const path = extractStringValue(content, "path");
        const description = extractStringValue(content, "description");
        const type = extractStringValue(content, "type");

        if (!path || !description) {
            return null;
        }

        if (type === "public") {
            return null;
        }

        const {behaviour: chatbotBehaviour, params} = extractChatbotBehaviour(content);
        const extraWebservices = extractExtraWebservices(content);

        if (params) warnUnusableParams(pageName, params);

        return {path, description, type, chatbotBehaviour, params, extraWebservices};
    } catch (error) {
        console.error(`Error parsing ${configPath}:`, error.message);
        return null;
    }
}

/******************************************************************************
 * WEBSERVICES EXTRACTION
 ******************************************************************************/

/**
 * Index of the brace that opens an operation's selection set.
 *
 * The variable definitions may carry an object default value
 * (`query X($f: Filter = {a: 1})`), whose brace is NOT the operation's:
 * taking the first brace after the name would parse that object as the
 * selection set and lose every root of the document. Scan for the first
 * brace that sits outside the definitions' parens and outside a string.
 */
function findOperationBrace(text) {
    const header = text.match(/(?:query|mutation)\s+\w+/);
    if (!header) return -1;

    let parenDepth = 0;
    let inString = false;
    let prev = "";
    for (let index = header.index + header[0].length; index < text.length; index++) {
        const char = text[index];
        if (inString) {
            if (char === "\"" && prev !== "\\") inString = false;
        } else if (char === "\"") {
            inString = true;
        } else if (char === "(") {
            parenDepth++;
        } else if (char === ")") {
            parenDepth--;
        } else if (char === "{" && parenDepth === 0) {
            return index;
        }
        prev = char;
    }
    return -1;
}

/**
 * Is this token the name of a webservice?
 *
 * The scan collects every token sitting at the operation's own depth, and
 * some of them reach no webservice: a directive (`@include`), a fragment
 * spread (`...PageFragment`) and the meta field `__typename` are not
 * fields of the schema's root, and a leftover of a malformed document is
 * not a name at all.
 */
function isRootFieldName(token) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(token) && token !== "__typename";
}

/**
 * Extract webservice name from GraphQL operation text
 */
function extractRootFields(text) {
    /*
     * A generated document can carry SEVERAL root fields ("query X { decision {...} allCompanies {...} }"):
     * a page mounting that component can reach them all, and the manifest
     * must say so. The text is a single-line, escaped GraphQL source, so
     * the root fields are the names that sit at brace depth 0 of the
     * operation's block — argument names and subfields live deeper, or
     * inside parens, and never look like roots.
     */
    const braceIndex = findOperationBrace(text);
    if (braceIndex === -1) return [];
    const block = extractBraceBlock(text, braceIndex);
    if (!block) return [];

    const fields = [];
    // Depth 1 inside the block is where the roots live: the operation's
    // brace is depth 1, a root's subselection pushes to 2 and deeper. The
    // name may be separated from its brace or parens by a space, so the
    // last completed token is KEPT until the brace says what it was.
    let braceDepth = 0, parenDepth = 0;
    let buffer = "";
    let pending = "";
    let inString = false;
    let prev = "";
    for (const char of block) {
        if (inString) {
            if (char === "\"" && prev !== "\\") {
                inString = false;
            }
            prev = char;
            continue;
        }
        if (char === "\"") {
            inString = true;
            prev = char;
            continue;
        }
        if (char === "{") {
            const candidate = (buffer || pending).trim();
            if (parenDepth === 0 && braceDepth === 1 && candidate) {
                fields.push(candidate);
            }
            buffer = "";
            pending = "";
            braceDepth++;
            prev = char;
            continue;
        }
        if (char === "}") {
            // The brace that closes the operation's own block: the last
            // root of the document ends here, and it may be a scalar with
            // no subselection — `mutation M { ping }` would otherwise be
            // lost, since nothing but this brace ever confirms it.
            if (braceDepth === 1 && parenDepth === 0) {
                const candidate = (buffer || pending).trim();
                if (candidate) {
                    fields.push(candidate);
                }
            }
            braceDepth--;
            buffer = "";
            pending = "";
            prev = char;
            continue;
        }
        if (char === "(") {
            const candidate = (buffer || pending).trim();
            if (parenDepth === 0 && braceDepth === 1 && candidate.startsWith("@")) {
                // `thing @include(if: $s) { id }`: these parens belong to
                // the directive, not to a field. The root already waiting
                // in `pending` still expects its own brace, so keep it —
                // clearing it would lose `thing` and record `@include`.
                buffer = "";
            } else {
                if (parenDepth === 0 && braceDepth === 1 && candidate) {
                    fields.push(candidate);
                }
                buffer = "";
                pending = "";
            }
            parenDepth++;
            prev = char;
            continue;
        }
        if (char === ")") {
            // `pending` survives: the paren closing a directive's
            // arguments must not drop the root field waiting before it.
            // A field's own paren already consumed its name on the way in.
            parenDepth--;
            buffer = "";
            prev = char;
            continue;
        }
        if (parenDepth > 0 || braceDepth > 1) {
            prev = char;
            continue;
        }
        if (/\s/.test(char)) {
            const token = buffer.trim();
            if (token) {
                if (pending.includes(":")) {
                    // An alias in progress (`renamed: otherThing`): the
                    // pending token was the alias, never a root — the
                    // field's name is the one that follows, and the
                    // final map strips the alias away.
                    pending = token;
                } else {
                    // A completed token at depth 1 while another is
                    // already pending can only be a scalar root: a root
                    // with a subselection or arguments would have met
                    // its `{` or `(` before the next name completed.
                    // `mutation M { ping logout }` would otherwise keep
                    // only the last one.
                    if (pending) {
                        fields.push(pending);
                    }
                    pending = token;
                }
            }
            buffer = "";
            prev = char;
            continue;
        }
        buffer += char;
        prev = char;
    }
    return [...new Set(fields)]
        .map(field => (field.split(":").pop() ?? field).replace(/,+$/, ""))
        .filter(isRootFieldName);
}

/**
 * Parse a generated GraphQL file and extract webservice info
 */
function parseGeneratedFile(filePath) {
    try {
        const content = readFileSync(filePath, "utf-8");

        const kindMatch = content.match(/"operationKind":\s*"(\w+)"/);
        const operationKind = kindMatch ? kindMatch[1] : null;

        // The text is JSON-encoded inside the generated file, and a GraphQL
        // document may carry string literals (`typeId: \"FOUNDER_CUSTOMER\"`):
        // stopping the capture at the first quote — escaped or not —
        // truncates the document mid-argument, the brace block never
        // closes, and every root of the file is lost from the manifest.
        // Capture the whole JSON string and let JSON.parse undo the
        // escapes; the root scanner is string-aware from there.
        const textMatch = content.match(/"text":(\s*"(?:[^"\\]|\\.)*")/);
        if (!textMatch) return null;

        const text = JSON.parse(textMatch[1]).replace(/\n/g, " ");
        const rootFields = extractRootFields(text);

        if (!rootFields.length) return null;

        return rootFields.map(webservice => ({webservice, operationKind}));
    } catch (error) {
        return null;
    }
}

/**
 * Get all webservices from a Restricted component's __generated__ folder
 */
function getRestrictedWebservices(restrictedPath) {
    if (restrictedWebservicesCache.has(restrictedPath)) {
        return restrictedWebservicesCache.get(restrictedPath);
    }

    const generatedDir = join(restrictedPath, "__generated__");
    const webservices = [];

    if (existsSync(generatedDir)) {
        const files = readdirSync(generatedDir).filter(f => f.endsWith(".graphql.ts"));

        for (const file of files) {
            if (file.includes("Fragment_")) continue;
            const results = parseGeneratedFile(join(generatedDir, file));
            if (results) {
                webservices.push(...results);
            }
        }
    }

    restrictedWebservicesCache.set(restrictedPath, webservices);
    return webservices;
}

/******************************************************************************
 * IMPORT RESOLUTION
 ******************************************************************************/

/**
 * Resolve an import path to an absolute file path
 */
function resolveImportPath(importPath, fromFile) {
    let basePath = null;

    if (importPath.startsWith("@/")) {
        basePath = join(SRC_DIR, importPath.slice(2));
    } else if (importPath.startsWith(".")) {
        const fromDir = dirname(fromFile);
        basePath = resolve(fromDir, importPath);
    } else {
        return null;
    }

    const extensions = [".tsx", ".ts", "/index.tsx", "/index.ts"];

    for (const ext of extensions) {
        const fullPath = basePath + ext;
        if (existsSync(fullPath)) {
            const componentDir = ext.startsWith("/") ? basePath : dirname(fullPath);
            return {filePath: fullPath, componentDir};
        }
    }

    return null;
}

/**
 * Extract all imports from a TypeScript/React file
 */
function extractImports(filePath) {
    try {
        const content = readFileSync(filePath, "utf-8");
        const imports = [];
        const importRegex = /import\s+(?:[\w{},\s*]+)\s+from\s+["']([^"']+)["']/g;

        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    } catch (error) {
        return [];
    }
}

/**
 * Check if a component directory is a Restricted component
 */
function isRestrictedComponent(componentDir) {
    return componentDir &&
        componentDir.includes("/restrictedFeatures/") &&
        basename(componentDir).endsWith("Restricted");
}

/**
 * Check if a path is within the components directory
 */
function isComponentPath(filePath) {
    return filePath && filePath.includes("/components/");
}

/**
 * Recursively find all Restricted components used by a file
 */
function findAllRestrictedComponents(filePath, visited = new Set()) {
    if (!filePath || visited.has(filePath)) {
        return new Set();
    }

    visited.add(filePath);

    const restrictedPaths = new Set();
    const imports = extractImports(filePath);

    for (const importPath of imports) {
        const resolved = resolveImportPath(importPath, filePath);

        if (!resolved) continue;

        const {filePath: resolvedFilePath, componentDir} = resolved;

        if (isRestrictedComponent(componentDir)) {
            restrictedPaths.add(componentDir);
        }

        if (isComponentPath(resolvedFilePath)) {
            const childRestricted = findAllRestrictedComponents(resolvedFilePath, visited);
            for (const r of childRestricted) {
                restrictedPaths.add(r);
            }
        }
    }

    return restrictedPaths;
}

/**
 * Get all webservices for a page by recursively analyzing its imports
 */
function getPageWebservices(pageName) {
    const pageIndexPath = join(PAGES_DIR, pageName, "index.tsx");

    if (!existsSync(pageIndexPath)) {
        return [];
    }

    const restrictedPaths = findAllRestrictedComponents(pageIndexPath, new Set());
    const webservicesMap = new Map();

    for (const restrictedPath of restrictedPaths) {
        const webservices = getRestrictedWebservices(restrictedPath);
        for (const ws of webservices) {
            webservicesMap.set(ws.webservice, ws);
        }
    }

    return Array.from(webservicesMap.values());
}

/**
 * Get the app-declared global webservices (chatbot.config.ts).
 *
 * A missing file is not an error — declaring globals is opt-in. A present
 * file whose `globalWebservices` cannot be read, on the other hand, would
 * silently shrink the manifest, so it is reported rather than skipped.
 */
function getDeclaredGlobalWebservices() {
    if (!existsSync(CHATBOT_CONFIG_FILE)) {
        return [];
    }

    const content = readFileSync(CHATBOT_CONFIG_FILE, "utf-8");
    const declared = extractStringArray(content, "globalWebservices");
    if (declared === null) {
        console.warn(
            `  ! ${basename(CHATBOT_CONFIG_FILE)} exists but its globalWebservices ` +
                "array could not be read — the declared globals are missing from the manifest"
        );
        return [];
    }
    return declared;
}

/******************************************************************************
 * GLOBAL WEBSERVICES (PROVIDERS)
 ******************************************************************************/

/**
 * Get all webservices from providers (global webservices)
 */
function getGlobalWebservices() {
    const webservices = [];
    // The consumer's providers AND the framework's own: the global webservices
    // (login, logout, connectedUser...) live in lys-front.
    const providersDirs = [PROVIDERS_DIR, LYS_FRONT_PROVIDERS_DIR];

    for (const dir of providersDirs) {
        if (!existsSync(dir)) {
            // A missing framework directory would silently drop the global
            // webservices from the manifest, so it is reported, not skipped.
            if (dir === LYS_FRONT_PROVIDERS_DIR) {
                console.warn(
                    `  ! lys-front providers not found at ${dir}: the framework's global ` +
                    "webservices (login, logout, connectedUser...) are missing from the manifest"
                );
            }
            continue;
        }

        const providerDirs = readdirSync(dir, {withFileTypes: true})
            .filter(d => d.isDirectory())
            .map(d => d.name);

        for (const providerName of providerDirs) {
            const generatedDir = join(dir, providerName, "__generated__");

            if (!existsSync(generatedDir)) continue;

            const files = readdirSync(generatedDir).filter(f => f.endsWith(".graphql.ts"));

            for (const file of files) {
                if (file.includes("Fragment_")) continue;
                const results = parseGeneratedFile(join(generatedDir, file));
                if (results) {
                    webservices.push(...results.map(result => result.webservice));
                }
            }
        }
    }

    return [...new Set(webservices)].sort();
}

/******************************************************************************
 * MAIN
 ******************************************************************************/

/**
 * Main function
 */
function main() {
    console.log("Generating routes manifest...");

    if (!existsSync(PAGES_DIR)) {
        console.error(
            `No pages directory at ${PAGES_DIR}.\n` +
            "Run this from the project root, or pass it as an argument: " +
            "lys-front-generate-routes /path/to/project"
        );
        process.exit(1);
    }

    const pageDirs = readdirSync(PAGES_DIR, {withFileTypes: true})
        .filter(d => d.isDirectory())
        .map(d => d.name);

    console.log(`Found ${pageDirs.length} page directories`);

    const routes = [];

    for (const pageName of pageDirs) {
        const config = parsePageConfig(pageName);
        if (!config) continue;

        const webservices = getPageWebservices(pageName);

        // Merge detected webservices with extraWebservices from config
        const allWebservices = [
            ...webservices.map(ws => ws.webservice),
            ...config.extraWebservices
        ];
        const uniqueWebservices = [...new Set(allWebservices)];

        const route = {
            name: pageName,
            path: config.path,
            description: config.description,
            webservices: uniqueWebservices
        };

        if (config.chatbotBehaviour) {
            route.chatbot_behaviour = config.chatbotBehaviour;
        }

        if (config.params) {
            route.params = config.params;
        }

        routes.push(route);
    }

    routes.sort((a, b) => a.path.localeCompare(b.path));

    // Global webservices: the ones the providers run everywhere (framework
    // first: login, logout, connectedUser) plus the ones the app declares
    // in chatbot.config.ts. Declared and discovered are merged, not chosen
    // between: the file is the app's say, the providers the framework's.
    const globalWebservices = [...new Set([
        ...getGlobalWebservices(),
        ...getDeclaredGlobalWebservices()
    ])].sort();

    const manifest = {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        globalWebservices,
        routes
    };

    // Ensure public directory exists
    const publicDir = dirname(OUTPUT_FILE);
    if (!existsSync(publicDir)) {
        mkdirSync(publicDir, {recursive: true});
    }

    writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

    // Summary
    const totalRouteWebservices = routes.reduce((sum, r) => sum + r.webservices.length, 0);
    const totalParams = routes.reduce((sum, r) => sum + Object.keys(r.params || {}).length, 0);
    console.log(`Generated ${OUTPUT_FILE}`);
    console.log(`  - ${routes.length} routes`);
    console.log(`  - ${totalRouteWebservices} route webservices`);
    console.log(`  - ${globalWebservices.length} global webservices`);
    console.log(`  - ${totalParams} declared page params`);
}

/**
 * Run only as a program, so the extraction above can be imported and tested.
 *
 * `argv[1]` is the symlink npm installs in `node_modules/.bin`, while
 * `import.meta.url` is already resolved — hence the realpath comparison.
 */
function isRunAsProgram() {
    if (!process.argv[1]) return false;
    try {
        return realpathSync(process.argv[1]) === __filename;
    } catch {
        return false;
    }
}

if (isRunAsProgram()) {
    main();
}

export {extractBraceBlock, parseParamSpec, extractParams, extractChatbotBehaviour, extractStringArray, extractRootFields};
