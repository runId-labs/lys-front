/**
 * Page context types for chatbot context-aware features.
 */

/**
 * Allowed types for page context params.
 * Includes objects to support complex types like orderBy: {fieldName: boolean}
 */
export type PageContextParamValue = string | number | boolean | object | null;

/**
 * Represents the current page context sent to the chatbot.
 */
export interface PageContext {
    pageName: string | null;
    params: Record<string, PageContextParamValue>;
}

/**
 * Context value provided by PageContextProvider.
 */
export interface PageContextValue {
    context: PageContext;
    /** Set pageName and params (called by RouteProvider) */
    setPageContext: (pageName: string, params?: Record<string, PageContextParamValue>) => void;
    /** Clear all context */
    clearPageContext: () => void;
}
