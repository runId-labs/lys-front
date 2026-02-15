import * as React from "react";
import {
    Disposable,
    GraphQLTaggedNode,
    IEnvironment,
    MutationConfig,
    MutationParameters,
} from "relay-runtime";
import {UseMutationConfig} from "react-relay";

/**
 * Access parameters for owner-based permission checking
 */
interface AccessParameters {
    ownerIds: string[];
}

interface HasPermissionRefInterface {
    hasPermission: boolean;
}

interface LysMutationRefInterface<TMutation extends MutationParameters = MutationParameters> {
    commit: ((config: UseMutationConfig<TMutation>) => void) | undefined;
    isInFlight: boolean;
    disposable: Disposable | undefined;
}

interface LysMutationProviderProps<TMutation extends MutationParameters = MutationParameters> {
    mutation: GraphQLTaggedNode;
    commitMutationFn?: ((environment: IEnvironment, config: MutationConfig<TMutation>) => Disposable) | undefined;
    notPermissionDisplayType?: "hide" | "show" | undefined;
    accessParameters?: AccessParameters | null;
    children?: React.ReactNode;
}

export type {
    AccessParameters,
    HasPermissionRefInterface,
    LysMutationRefInterface,
    LysMutationProviderProps
};
