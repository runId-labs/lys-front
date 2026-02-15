import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { transformSync } from "@babel/core";
import path from "path";

// Relay plugin that transforms graphql tags into imports of __generated__ files
const relay = {
    name: "vite:relay",
    transform(src: string, id: string) {
        if (/\.(t|j)sx?$/.test(id) && src.includes("graphql`")) {
            const out = transformSync(src, {
                plugins: [["babel-plugin-relay", { eagerEsModules: true }]],
                code: true,
                filename: id,
                sourceMaps: true,
            });
            if (!out?.code) {
                throw new Error(`vite:relay: Failed to transform ${id}`);
            }
            return { code: out.code, map: out.map };
        }
    },
};

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: ["./src/test/setup.ts"],
    },
    plugins: [
        react(),
        relay,
        dts({
            outDir: "dist",
            insertTypesEntry: true,
        }),
    ],
    build: {
        lib: {
            entry: {
                index: path.resolve(__dirname, "src/index.ts"),
                "tools/index": path.resolve(__dirname, "src/tools/index.ts"),
                "types/index": path.resolve(__dirname, "src/types/index.ts"),
                "providers/index": path.resolve(__dirname, "src/providers/index.ts"),
                "templates/index": path.resolve(__dirname, "src/templates/index.ts"),
                "relay/index": path.resolve(__dirname, "src/relay/index.ts"),
                "i18n/index": path.resolve(__dirname, "src/i18n/index.ts"),
            },
            formats: ["es"],
        },
        rollupOptions: {
            external: [
                "react",
                "react-dom",
                "react/jsx-runtime",
                "react-relay",
                "relay-runtime",
                "react-router-dom",
                "react-intl",
            ],
            output: {
                preserveModules: false,
            },
        },
        sourcemap: true,
        minify: false,
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler",
            },
        },
    },
});
