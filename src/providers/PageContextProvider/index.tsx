import React, {useState, useCallback, useMemo} from "react";
import {PageContextContext} from "./hooks";
import {PageContext, PageContextParamValue} from "./types";

interface PageContextProviderProps {
    children: React.ReactNode;
}

/**
 * PageContextProvider component
 *
 * Provides page context tracking for chatbot context-aware features:
 * - Current page name (e.g., "FinancialDashboardPage")
 * - Page params (e.g., {companyId: "123", year: 2024})
 *
 * This context is sent to the chatbot to:
 * - Filter available tools by page
 * - Inject params into mutations for security
 * - Reduce AI hallucinations by providing explicit context
 *
 * Place this provider above ChatbotProvider in the component tree.
 */
const PageContextProvider: React.FC<PageContextProviderProps> = ({children}) => {
    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [context, setContext] = useState<PageContext>({
        pageName: null,
        params: {}
    });

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Set the current page context (pageName + params).
     * Called by RouteProvider when route or URL params change.
     */
    const setPageContext = useCallback((
        pageName: string,
        params: Record<string, PageContextParamValue> = {}
    ) => {
        setContext({pageName, params});
    }, []);

    /**
     * Clear the page context.
     */
    const clearPageContext = useCallback(() => {
        setContext({pageName: null, params: {}});
    }, []);

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    const contextValue = useMemo(() => ({
        context,
        setPageContext,
        clearPageContext
    }), [context, setPageContext, clearPageContext]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <PageContextContext.Provider value={contextValue}>
            {children}
        </PageContextContext.Provider>
    );
};

export default PageContextProvider;
