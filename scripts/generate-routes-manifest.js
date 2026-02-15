#!/usr/bin/env node
/**
 * Generate routes manifest for chatbot navigation
 * Parses page configs and recursively extracts all webservices from Restricted components
 *
 * Usage: node scripts/generate-routes-manifest.js
 * Output: public/routes-manifest.json
 */

import {readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync} from "fs";
import {join, dirname, resolve, basename} from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");
const SRC_DIR = join(ROOT_DIR, "src");
const PAGES_DIR = join(ROOT_DIR, "src/components/pages");
const PROVIDERS_DIR = join(ROOT_DIR, "src/components/providers");
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
 * Extract extraWebservices array from config content
 */
function extractExtraWebservices(content) {
    const match = content.match(/extraWebservices:\s*\[([^\]]*)\]/);
    if (!match) return [];

    const arrayContent = match[1];
    const webservices = [];
    const stringRegex = /["']([^"']+)["']/g;
    let stringMatch;
    while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
        webservices.push(stringMatch[1]);
    }
    return webservices;
}

/**
 * Extract chatbotBehaviour object from config content
 */
function extractChatbotBehaviour(content) {
    // Match chatbotBehaviour: { ... }
    const behaviourMatch = content.match(/chatbotBehaviour:\s*\{/);
    if (!behaviourMatch) return null;

    const startIndex = behaviourMatch.index + behaviourMatch[0].length - 1;
    let depth = 1;
    let endIndex = startIndex + 1;

    // Find matching closing brace
    while (depth > 0 && endIndex < content.length) {
        if (content[endIndex] === "{") depth++;
        if (content[endIndex] === "}") depth--;
        endIndex++;
    }

    const behaviourContent = content.slice(startIndex, endIndex);

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

    if (!prompt && !contextTools) return null;

    const result = {};
    if (prompt) result.prompt = prompt;
    if (contextTools) result.context_tools = contextTools;
    return result;
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

        const chatbotBehaviour = extractChatbotBehaviour(content);
        const extraWebservices = extractExtraWebservices(content);

        return {path, description, type, chatbotBehaviour, extraWebservices};
    } catch (error) {
        console.error(`Error parsing ${configPath}:`, error.message);
        return null;
    }
}

/******************************************************************************
 * WEBSERVICES EXTRACTION
 ******************************************************************************/

/**
 * Extract webservice name from GraphQL operation text
 */
function extractWebserviceFromText(text) {
    const match = text.match(/(?:query|mutation)\s+\w+[^{]*\{\s*(\w+)/);
    return match ? match[1] : null;
}

/**
 * Parse a generated GraphQL file and extract webservice info
 */
function parseGeneratedFile(filePath) {
    try {
        const content = readFileSync(filePath, "utf-8");

        const kindMatch = content.match(/"operationKind":\s*"(\w+)"/);
        const operationKind = kindMatch ? kindMatch[1] : null;

        const textMatch = content.match(/"text":\s*"([^"]+)"/);
        if (!textMatch) return null;

        const text = textMatch[1].replace(/\\n/g, " ");
        const webservice = extractWebserviceFromText(text);

        if (!webservice) return null;

        return {webservice, operationKind};
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
            const result = parseGeneratedFile(join(generatedDir, file));
            if (result) {
                webservices.push(result);
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

/******************************************************************************
 * GLOBAL WEBSERVICES (PROVIDERS)
 ******************************************************************************/

/**
 * Get all webservices from providers (global webservices)
 */
function getGlobalWebservices() {
    const webservices = [];

    if (!existsSync(PROVIDERS_DIR)) {
        return webservices;
    }

    const providerDirs = readdirSync(PROVIDERS_DIR, {withFileTypes: true})
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const providerName of providerDirs) {
        const generatedDir = join(PROVIDERS_DIR, providerName, "__generated__");

        if (!existsSync(generatedDir)) continue;

        const files = readdirSync(generatedDir).filter(f => f.endsWith(".graphql.ts"));

        for (const file of files) {
            if (file.includes("Fragment_")) continue;
            const result = parseGeneratedFile(join(generatedDir, file));
            if (result) {
                webservices.push(result.webservice);
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

        routes.push(route);
    }

    routes.sort((a, b) => a.path.localeCompare(b.path));

    // Get global webservices from providers
    const globalWebservices = getGlobalWebservices();

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
    console.log(`Generated ${OUTPUT_FILE}`);
    console.log(`  - ${routes.length} routes`);
    console.log(`  - ${totalRouteWebservices} route webservices`);
    console.log(`  - ${globalWebservices.length} global webservices`);
}

main();
