import * as React from "react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import {useSearchParams} from "react-router-dom";
import {UrlQueriesContext} from "./hooks";
import {UrlQueriesProviderProps, UrlQueryValue} from "./types";

/**
 * UrlQueriesProvider - Manages URL query parameters with staging support
 *
 * Features:
 * - Synchronizes URL search params with React state
 * - Supports staged changes via stagedParams
 * - Type conversion (string → number/boolean)
 * - Batch updates with apply()
 *
 * Use cases:
 * - Filter bars: Stage multiple filter changes, apply all at once
 * - Form state: Keep form state in URL for sharing/bookmarking
 * - Pagination: Track page/limit in URL
 */
const UrlQueriesProvider: React.ComponentType<UrlQueriesProviderProps> = ({children}) => {
    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const [searchParams, setSearchParams] = useSearchParams();

    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [initialized, setInitialized] = useState<boolean>(false);
    const [stagedParams, setStagedParams] = useState<{[key: string]: UrlQueryValue}>({});

    /*******************************************************************************************************************
     *                                                  REFS
     ******************************************************************************************************************/

    /**
     * The URL as last known: rendered, or written by a flush not rendered yet.
     *
     * A flush builds on it, not on setSearchParams' `prev`: react-router computes
     * `prev` from the render the setter was created in, so a write through a setter
     * captured earlier — a stream handler holding the update() of the render it
     * started in, a flush landing before the previous one re-rendered — rebuilt the
     * URL from a stale snapshot and erased what was written since.
     */
    const renderedSearchParamsRef = useRef(searchParams);
    const latestSearchParamsRef = useRef(searchParams);
    const setSearchParamsRef = useRef(setSearchParams);
    if (renderedSearchParamsRef.current !== searchParams) {
        renderedSearchParamsRef.current = searchParams;
        latestSearchParamsRef.current = searchParams;
    }
    setSearchParamsRef.current = setSearchParams;

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    /**
     * Check if staged params differ from current URL
     */
    const hasStagedChanges: boolean = useMemo(() => {
        return Object.keys(stagedParams).some(key =>
            stagedParams[key]?.toString() !== searchParams.get(key)
        );
    }, [searchParams, stagedParams]);

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Stage a change without updating URL
     * Useful for filter bars where user configures multiple filters before applying
     */
    const stage = useCallback((key: string, value: UrlQueryValue) => {
        setStagedParams(prev => {
            if (prev[key]?.toString() === value?.toString()) {
                return prev;
            }
            return {...prev, [key]: value};
        });
    }, []);

    /**
     * Apply all staged changes to URL
     */
    const apply = useCallback(() => {
        const newSearchParams = new URLSearchParams();

        Object.entries(stagedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                newSearchParams.set(key, value.toString());
            }
        });

        // A flush queued after this builds on what apply wrote, not on the render.
        latestSearchParamsRef.current = newSearchParams;
        setSearchParams(newSearchParams);
    }, [stagedParams, setSearchParams]);

    /**
     * Batched update: accumulates changes from multiple update() calls
     * within the same microtask and flushes them in a single setSearchParams call.
     *
     * Why batching is needed:
     * react-router's setSearchParams does NOT chain functional updates like React's
     * setState — each call gets the same `prev` snapshot. When multiple components
     * call update() in the same effect cycle (e.g. ClientProvider sets clientId while
     * DashboardFiltersFeature resets companyId), the last call would overwrite the first.
     * Batching via queueMicrotask merges all pending changes into one setSearchParams call.
     */
    const pendingUpdatesRef = useRef<{[key: string]: UrlQueryValue}>({});
    const flushScheduledRef = useRef(false);

    const update = useCallback((data: {[key: string]: UrlQueryValue}) => {
        Object.assign(pendingUpdatesRef.current, data);

        if (!flushScheduledRef.current) {
            flushScheduledRef.current = true;
            queueMicrotask(() => {
                flushScheduledRef.current = false;
                const pending = {...pendingUpdatesRef.current};
                pendingUpdatesRef.current = {};

                const next = new URLSearchParams(latestSearchParamsRef.current);
                Object.entries(pending).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        next.set(key, value.toString());
                    } else {
                        next.delete(key);
                    }
                });
                latestSearchParamsRef.current = next;
                setSearchParamsRef.current(next);
            });
        }
    }, []);

    /**
     * Apply a single change to the URL, in the same batch as update().
     *
     * Not a direct setSearchParams: react-router hands every call of one cycle the
     * same `prev` snapshot, so an immediate edit and a batched update in the same
     * cycle overwrote each other — the dialog stack sync (dStack) erased the filters
     * the chatbot had just written when its action closed a panel.
     */
    const edit = useCallback((key: string, value: UrlQueryValue) => {
        stage(key, value);
        update({[key]: value});
    }, [stage, update]);

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    /**
     * Initialize stagedParams from URL on mount
     * Converts string values to appropriate types (number, boolean)
     */
    useEffect(() => {
        const newTmpParameters: {[key: string]: UrlQueryValue} = {};

        searchParams.forEach((value, key) => {
            // Convert to number if possible
            if (!isNaN(+value)) {
                newTmpParameters[key] = Number(value);
            }
            // Convert to boolean if "true" or "false"
            else if (value === "true" || value === "false") {
                newTmpParameters[key] = value === "true";
            }
            // Keep as string
            else {
                newTmpParameters[key] = value;
            }
        });

        if (Object.keys(newTmpParameters).length) {
            setStagedParams(newTmpParameters);
        }

        setInitialized(true);
    }, [searchParams]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <UrlQueriesContext.Provider
            value={{
                hasStagedChanges,
                appliedParams: searchParams,
                stagedParams,
                stage,
                edit,
                update,
                apply
            }}
        >
            {initialized && children}
        </UrlQueriesContext.Provider>
    );
};

export default UrlQueriesProvider;
