import * as React from "react";
import {
    useCallback,
    useEffect,
    useMemo,
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
     * Apply change immediately to URL
     */
    const edit = useCallback((key: string, value: UrlQueryValue) => {
        stage(key, value);
        setSearchParams(prev => {
            if (value !== undefined && value !== null) {
                prev.set(key, value.toString());
            } else {
                prev.delete(key);
            }
            return prev;
        });
    }, [stage, setSearchParams]);

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

        setSearchParams(newSearchParams);
    }, [stagedParams, setSearchParams]);

    /**
     * Update multiple parameters at once
     */
    const update = useCallback((data: {[key: string]: UrlQueryValue}) => {
        setSearchParams(prev => {
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    prev.set(key, value.toString());
                } else {
                    prev.delete(key);
                }
            });
            return prev;
        });
    }, [setSearchParams]);

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
