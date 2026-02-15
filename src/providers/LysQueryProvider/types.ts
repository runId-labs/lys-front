import {GraphQLTaggedNode} from "relay-runtime";
import {PreloadedQuery} from "react-relay/relay-hooks/EntryPointTypes";
import {UseQueryLoaderLoadQueryOptions} from "react-relay/relay-hooks/useQueryLoader";
import * as React from "react";
import {OperationType} from "relay-runtime";

/**
 * Access parameters for owner-based permission checking
 */
interface AccessParameters {
    ownerIds: string[];
}

interface LysQueryRefInterface<TQuery extends OperationType = OperationType> {
    hasPermission: boolean;
    data: TQuery["response"] | undefined;
    isLoading: boolean;
    load: () => void;
}

interface LysQueryProviderProps<TQuery extends OperationType = OperationType> {
    query: GraphQLTaggedNode;
    initialQueryReference?: PreloadedQuery<TQuery> | null;
    parameters?: TQuery["variables"];
    options?: UseQueryLoaderLoadQueryOptions;
    accessParameters?: AccessParameters | null;
    children?: React.ReactNode;
    /**
     * Container element type. Use "span" for inline usage.
     * Loading overlay is disabled when using "span".
     * @default "div"
     */
    as?: "div" | "span";
    /**
     * Custom loading fallback. Overrides the context-level default from LysLoadingContext.
     */
    loadingFallback?: React.ReactNode;
}

type LysQueryContextType<TQuery extends OperationType = OperationType> = [
    data: TQuery["response"] | undefined,
    load: () => void
];

export type {
    AccessParameters,
    LysQueryRefInterface,
    LysQueryProviderProps,
    LysQueryContextType
};
