import {createContext, useContext} from "react";
import {UseMutationConfig} from "react-relay";
import {Disposable, MutationParameters} from "relay-runtime";

const LysMutationContext = createContext<[
    ((config: UseMutationConfig<MutationParameters>) => void) | null,
    boolean,
    Disposable | undefined
]>([
    null,
    false,
    undefined
]);

/**
 * Hook to access mutation commit function and state from LysMutationProvider
 */
function useLysMutation<TMutation extends MutationParameters = MutationParameters>(): [
    ((config: UseMutationConfig<TMutation>) => void) | null,
    boolean,
    Disposable | undefined
] {
    return useContext(LysMutationContext) as [
        ((config: UseMutationConfig<TMutation>) => void) | null,
        boolean,
        Disposable | undefined
    ];
}

export {
    LysMutationContext,
    useLysMutation
};
