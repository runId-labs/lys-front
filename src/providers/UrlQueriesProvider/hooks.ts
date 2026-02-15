import {createContext, useContext} from "react";
import {UrlQueryValue} from "./types";

const UrlQueriesContext = createContext<{
    hasStagedChanges: boolean;
    appliedParams: URLSearchParams;
    stagedParams: {[key: string]: UrlQueryValue};
    stage: (key: string, value: UrlQueryValue) => void;
    edit: (key: string, value: UrlQueryValue) => void;
    update: (data: {[key: string]: UrlQueryValue}) => void;
    apply: () => void;
}>({
    hasStagedChanges: false,
    appliedParams: new URLSearchParams(),
    stagedParams: {},
    stage: () => console.error("stage not implemented"),
    edit: () => console.error("edit not implemented"),
    update: () => console.error("update not implemented"),
    apply: () => console.error("apply not implemented")
});

/**
 * Hook to access URL query parameters with staging support
 *
 * Features:
 * - appliedParams: Current URL search params
 * - stagedParams: Staged changes not yet applied to URL
 * - edit(): Apply a single change immediately to URL
 * - stage(): Stage a change without updating URL
 * - apply(): Apply all staged changes at once
 * - update(): Update multiple params directly
 * - hasStagedChanges: Whether there are unapplied staged changes
 */
const useUrlQueries = () => {
    return useContext(UrlQueriesContext);
};

export {
    UrlQueriesContext,
    useUrlQueries,
};
