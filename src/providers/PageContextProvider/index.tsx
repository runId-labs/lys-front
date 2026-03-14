import React, {useState, useCallback, useMemo} from "react";
import {PageContextContext} from "./hooks";
import {PageContextParamValue} from "./types";

interface PageContextProviderProps {
    children: React.ReactNode;
}

/**
 * Internal state separating URL-sourced params from component-sourced params.
 * The exposed `context.params` is the merge of both (internalParams takes priority).
 *
 * This separation prevents RouteProvider's setPageContext (which replaces urlParams)
 * from wiping out params set by page components via updatePageParams (e.g., year, currentLevers).
 */
interface InternalState {
    pageName: string | null;
    urlParams: Record<string, PageContextParamValue>;
    internalParams: Record<string, PageContextParamValue>;
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

    const [state, setState] = useState<InternalState>({
        pageName: null,
        urlParams: {},
        internalParams: {},
    });

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Set the current page context (pageName + URL params).
     * Called by RouteProvider when route or URL params change.
     * Replaces urlParams but preserves internalParams.
     * Clears internalParams only when pageName changes (navigation to a different page).
     */
    const setPageContext = useCallback((
        pageName: string,
        params: Record<string, PageContextParamValue> = {}
    ) => {
        setState(prev => ({
            pageName,
            urlParams: params,
            // Clear internal params on page change, preserve on same page
            internalParams: prev.pageName === pageName ? prev.internalParams : {},
        }));
    }, []);

    /**
     * Merge additional params into the internal params.
     * Used by page components to add dynamic state (e.g., year, live slider values)
     * without being overwritten by RouteProvider's URL param updates.
     */
    const updatePageParams = useCallback((
        additionalParams: Record<string, PageContextParamValue>
    ) => {
        setState(prev => ({
            ...prev,
            internalParams: {...prev.internalParams, ...additionalParams}
        }));
    }, []);

    /**
     * Clear the page context.
     */
    const clearPageContext = useCallback(() => {
        setState({pageName: null, urlParams: {}, internalParams: {}});
    }, []);

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    /**
     * Exposed context merges urlParams and internalParams.
     * internalParams take priority over urlParams.
     */
    const contextValue = useMemo(() => ({
        context: {
            pageName: state.pageName,
            params: {...state.urlParams, ...state.internalParams},
        },
        setPageContext,
        updatePageParams,
        clearPageContext
    }), [state, setPageContext, updatePageParams, clearPageContext]);

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
