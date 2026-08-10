import "./styles.scss";
import * as React from "react";
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react";
import {
    GraphQLTaggedNode,
    OperationType,
} from "relay-runtime";
import {LysQueryProviderProps, LysQueryRefInterface} from "./types";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";
import {extractOperationNames} from "../../tools/relayTools";
import {useAlertMessages} from "../AlertMessageProvider/hooks";
import {AlertLevelType} from "../AlertMessageProvider/types";
import type {RelayNetworkError} from "../../types/relayTypes";
import {useRefreshSignal} from "./RefreshSignalContext";
import {PreloadedQuery, usePreloadedQuery, useQueryLoader} from "react-relay";
import {LysQueryContext} from "./hooks";
import ErrorBoundaryProvider from "../ErrorBoundaryProvider";
import {usePermissionCheck} from "../hooks/usePermissionCheck";
import {useLysLoadingFallback} from "./LysLoadingContext";

/**
 * Extract node types from a GraphQL query
 * Traverses the query structure to find all concreteType values ending with "Node"
 */
function extractNodeTypes(query: GraphQLTaggedNode): string[] {
    const nodeTypes = new Set<string>();

    const traverse = (obj: unknown): void => {
        if (!obj || typeof obj !== "object") return;

        if ("concreteType" in obj) {
            const concreteType = (obj as {concreteType: string}).concreteType;
            // Only include types ending with "Node" (not Connection, Edge, etc.)
            if (concreteType && concreteType.endsWith("Node")) {
                nodeTypes.add(concreteType);
            }
        }

        // Traverse nested objects and arrays
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) {
                value.forEach(traverse);
            } else if (typeof value === "object") {
                traverse(value);
            }
        }
    };

    traverse(query);
    return Array.from(nodeTypes);
}

/**
 * Provider child component (mounted only when the query is loaded)
 * Extracts data from the preloaded query and passes it to parent
 */
const LysQueryProviderChild: React.ComponentType<{
    query: GraphQLTaggedNode;
    queryReference: PreloadedQuery<OperationType>;
    setData: (data: OperationType["response"]) => void;
}> = ({query, queryReference, setData}) => {
    const data = usePreloadedQuery(query, queryReference);

    useEffect(() => {
        setData(data);
    }, [setData, data]);

    return null;
};

/**
 * QueryErrorBoundary - Handles GraphQL query errors with session recovery
 *
 * Responsibilities:
 * - Catches errors thrown by Suspense/usePreloadedQuery via ErrorBoundaryProvider
 * - Categorizes errors: ACCESS_DENIED (session expired) vs GraphQL errors vs network errors
 * - Triggers session recovery with retry callback on ACCESS_DENIED
 * - Routes other errors to AlertMessageProvider
 * - Prevents duplicate error handling via errorProcessedRef
 * - Breaks ErrorBoundary re-render loops via hasError state
 */
const QueryErrorBoundary: React.ComponentType<{
    query: GraphQLTaggedNode;
    queryReference: PreloadedQuery<OperationType>;
    setData: (data: OperationType["response"]) => void;
    reloadQuery: () => void;
}> = ({query, queryReference, setData, reloadQuery}) => {
    const connectedUserInfo = useConnectedUserInfo();
    const alertMessage = useAlertMessages();

    // Prevent duplicate error handling (ErrorBoundary may call onError multiple times)
    const errorProcessedRef = useRef(false);

    // Break ErrorBoundary re-render loops: when true, unmounts the boundary entirely
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback((error: RelayNetworkError) => {
        if (errorProcessedRef.current) {
            return;
        }
        errorProcessedRef.current = true;

        // Relay errors can have GraphQL errors in error.source.errors
        const gqlErrors = error?.source?.errors;

        // Check for ACCESS_DENIED_ERROR (session expiration)
        // - First in source.errors if available
        // - Then in error.message as fallback (Relay embeds error codes in message)
        const hasAccessDenied = gqlErrors?.some(
            (err) => err.message === "ACCESS_DENIED_ERROR"
        ) || error.message?.includes("ACCESS_DENIED_ERROR");

        if (hasAccessDenied) {
            // CRITICAL: Set hasError to stop the ErrorBoundary render loop.
            // Without this, ErrorBoundary clears its state and re-renders children,
            // which throws the same error again causing an infinite loop.
            setHasError(true);

            // Handle session expiration - attempt token refresh
            // Pass retry callback to reload query after successful refresh
            connectedUserInfo.handleSessionExpired(() => {
                errorProcessedRef.current = false;
                setHasError(false);
                reloadQuery();
            });
            return;
        }

        // Display errors - prefer extracted GraphQL errors over raw message
        if (gqlErrors && gqlErrors.length > 0) {
            alertMessage.merge(
                gqlErrors.map((gqlError) => ({
                    text: gqlError.message,
                    level: (gqlError.severity || "ERROR") as AlertLevelType
                }))
            );
        } else {
            // Network or other errors - display original message
            alertMessage.merge([{
                text: error.message,
                level: "CRITICAL"
            }]);
        }

        setHasError(true);
    }, [connectedUserInfo, alertMessage, reloadQuery]);

    if (hasError) {
        return null;
    }

    return (
        <ErrorBoundaryProvider onError={handleError}>
            <React.Suspense fallback={null}>
                <LysQueryProviderChild
                    query={query}
                    queryReference={queryReference}
                    setData={setData}
                />
            </React.Suspense>
        </ErrorBoundaryProvider>
    );
};

// Stable default references — a literal default value (`parameters = {}`) is
// re-evaluated on every call, so callers who don't pass these props feed a new
// object into the load effect's dependency array (below) on every render.
const DEFAULT_QUERY_PARAMETERS = {};
const DEFAULT_QUERY_OPTIONS = {fetchPolicy: 'store-and-network' as const};

/**
 * LysQueryProvider - Manages GraphQL queries with permission checking
 *
 * Features:
 * - Automatic permission checking based on operation names
 * - Queue system for authenticated requests
 * - Error handling with QueryErrorBoundary
 * - Loading state management
 */
function LysQueryProviderInner<TQuery extends OperationType = OperationType>(
    {
        query,
        initialQueryReference,
        parameters = DEFAULT_QUERY_PARAMETERS,
        options = DEFAULT_QUERY_OPTIONS,
        accessParameters,
        children,
        as: Container = "div",
        loadingFallback
    }: LysQueryProviderProps<TQuery>,
    ref: React.Ref<LysQueryRefInterface<TQuery>>
) {
    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const connectedUserInfo = useConnectedUserInfo();
    const refreshSignal = useRefreshSignal();
    const contextFallback = useLysLoadingFallback();
    const effectiveFallback = loadingFallback !== undefined ? loadingFallback : contextFallback;

    const [
        queryReference,
        loadQuery,
        disposeQuery
    ] = useQueryLoader(query, initialQueryReference);

    // Extract node types from query (memoized)
    const nodeTypes = useMemo(() => extractNodeTypes(query), [query]);

    // Extract operation names from query (memoized)
    const operationNames = useMemo(() => extractOperationNames(query), [query]);

    // Permission check via shared hook
    const hasPermission = usePermissionCheck(operationNames, accessParameters, "LysQueryProvider");

    // Track last processed refresh signal version
    const lastRefreshVersionRef = useRef(0);

    // Track which queryReference the current `data` was resolved from, so isLoading (below)
    // can tell "in flight" apart from "resolved" on a reload — not just on the first load.
    const resolvedQueryReferenceRef = useRef<PreloadedQuery<TQuery> | null | undefined>(null);

    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [data, setData] = useState<TQuery["response"] | undefined>(undefined);
    const [load, setLoad] = useState<boolean>(false);

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    const reloadQuery = useCallback(() => {
        disposeQuery();
        setLoad(true);
    }, [disposeQuery]);

    // Called from LysQueryProviderChild's effect once Suspense/usePreloadedQuery resolves for
    // this specific queryReference. Recorded alongside the data so isLoading can tell whether
    // the data on hand actually corresponds to the query currently in flight.
    const handleChildData = useCallback((newData: TQuery["response"]) => {
        resolvedQueryReferenceRef.current = queryReference;
        setData(newData);
    }, [queryReference]);

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    /**
     * Load query when permission granted and load requested
     */
    useEffect(() => {
        if (hasPermission && load && !queryReference) {
            setLoad(false);
            connectedUserInfo.push(() => loadQuery(parameters, options));
        }
    }, [hasPermission, load, queryReference, connectedUserInfo.push, loadQuery, parameters, options]);

    /**
     * Handle refresh signal from ChatbotProvider
     * Reloads query when a refresh is triggered for any of this query's node types
     */
    useEffect(() => {
        // Check if this is a new signal we haven't processed yet
        if (refreshSignal.version > lastRefreshVersionRef.current) {
            // Check if any of our node types are in the refresh signal
            const shouldRefresh = nodeTypes.some(nodeType =>
                refreshSignal.nodes.includes(nodeType)
            );

            if (shouldRefresh) {
                lastRefreshVersionRef.current = refreshSignal.version;
                reloadQuery();
            }
        }
    }, [refreshSignal, nodeTypes, reloadQuery]);

    /**
     * Expose ref interface using useImperativeHandle
     *
     * isLoading covers the whole in-flight window, not just the one render before
     * loadQuery() is dispatched: `load` flips back to false as soon as the query loader
     * is called (see the effect above), but the query reference stays set — and data
     * stays stale (or undefined, on a first load) — until Relay actually resolves it. A
     * consumer polling `!isLoading && !data` to decide whether to call load() would
     * otherwise see a false "idle" window mid-flight and re-trigger, disposing the
     * in-flight query before it ever resolves (infinite retrigger loop). Comparing against
     * resolvedQueryReferenceRef (not just `data === undefined`) keeps this correct on a
     * reload too, where `data` still holds the previous, stale result.
     */
    const isLoading = load || (!!queryReference && resolvedQueryReferenceRef.current !== queryReference);

    useImperativeHandle(ref, () => ({
        hasPermission,
        data,
        isLoading,
        load: reloadQuery
    }), [hasPermission, data, isLoading, reloadQuery]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <LysQueryContext.Provider value={[data, reloadQuery]}>
            {hasPermission && (
                <Container className={Container === "div" ? "lys-query-container" : undefined}>
                    {/* Loading indicator (only for block container) */}
                    {Container === "div" && !queryReference && load && effectiveFallback}

                    {/* Error boundary for GraphQL errors - isolated to query execution only */}
                    {queryReference && (
                        <QueryErrorBoundary
                            query={query}
                            queryReference={queryReference}
                            setData={handleChildData}
                            reloadQuery={reloadQuery}
                        />
                    )}

                    {/* Children wrapped in Suspense to catch useFragment suspensions */}
                    <React.Suspense fallback={Container === "div" ? effectiveFallback : null}>
                        {children}
                    </React.Suspense>
                </Container>
            )}
        </LysQueryContext.Provider>
    );
}

// Cast to preserve generics with forwardRef
const LysQueryProvider = forwardRef(LysQueryProviderInner) as <TQuery extends OperationType = OperationType>(
    props: LysQueryProviderProps<TQuery> & { ref?: React.Ref<LysQueryRefInterface<TQuery>> }
) => ReturnType<typeof LysQueryProviderInner>;

export default LysQueryProvider;
