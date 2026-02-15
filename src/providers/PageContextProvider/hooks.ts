import {createContext, useContext, useMemo} from "react";
import {PageContext, PageContextValue} from "./types";

export const PageContextContext = createContext<PageContextValue | null>(null);

/**
 * Default context value when PageContextProvider is not in the tree.
 * All functions are no-ops, allowing the app to work without the provider.
 */
const DEFAULT_CONTEXT: PageContext = {
    pageName: null,
    params: {}
};

/**
 * Hook to access page context.
 * Returns a working context even if PageContextProvider is not mounted.
 * This allows the app to function without the provider (graceful degradation).
 */
export const usePageContext = (): PageContextValue => {
    const context = useContext(PageContextContext);

    // Memoize fallback to avoid creating new objects on each render
    const fallback = useMemo<PageContextValue>(() => ({
        context: DEFAULT_CONTEXT,
        setPageContext: () => {},
        clearPageContext: () => {}
    }), []);

    return context ?? fallback;
};
