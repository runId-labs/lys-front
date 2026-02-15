import {forwardRef, useCallback, useImperativeHandle, useMemo, useState} from "react";
import {
    LysMutationProviderProps,
    LysMutationRefInterface
} from "./types";
import {LysMutationContext} from "./hooks";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";
import {useMutation, UseMutationConfig} from "react-relay";
import {Disposable, MutationParameters, PayloadError} from "relay-runtime";
import {useAlertMessages} from "../AlertMessageProvider/hooks";
import {extractOperationNames} from "../../tools/relayTools";
import {usePermissionCheck} from "../hooks/usePermissionCheck";
import type {RelayNetworkError} from "../../types/relayTypes";

/**
 * LysMutationProvider - Manages GraphQL mutations with permission checking
 *
 * Features:
 * - Automatic permission checking based on operation names
 * - Queue system for authenticated requests
 * - Error handling with AlertMessageProvider
 * - Conditional rendering based on permissions
 */
const LysMutationProvider = forwardRef<LysMutationRefInterface, LysMutationProviderProps>((props, ref) => {
    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const alertMessage = useAlertMessages();
    const connectedUserInfo = useConnectedUserInfo();
    const [commit, isInFlight] = useMutation(props.mutation, props.commitMutationFn);

    // Extract operation names from mutation (memoized)
    const operationNames = useMemo(() => extractOperationNames(props.mutation), [props.mutation]);

    // Permission check via shared hook
    const hasPermission = usePermissionCheck(operationNames, props.accessParameters, "LysMutationProvider");

    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [disposable, setDisposable] = useState<Disposable | undefined>(undefined);

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Mutation commit wrapper that adds error and success handling
     */
    const lysCommit = useCallback((config: UseMutationConfig<MutationParameters>) => {
        const lysConfig = {...config};

        lysConfig.onError = (error: RelayNetworkError) => {
            // Check for ACCESS_DENIED_ERROR to handle session expiration
            const hasAccessDenied = error?.source?.errors?.some(
                (err) => err.message === "ACCESS_DENIED_ERROR"
            );

            if (hasAccessDenied) {
                // Handle session expiration - redirect to login
                connectedUserInfo.handleSessionExpired();
                config.onError?.(error);
                return;
            }

            alertMessage.merge(
                error?.source?.errors?.map((err) => {
                    let level: "ERROR" | "CRITICAL" = "ERROR";
                    if (err.message === "INTERNAL_ERROR") {
                        level = "CRITICAL";
                    }
                    return {
                        text: err.message,
                        level: level
                    };
                }) ?? []
            );

            config.onError?.(error);
        };

        lysConfig.onCompleted = (response: MutationParameters["response"], errors: PayloadError[] | null) => {
            config.onCompleted?.(response, errors);

            alertMessage.merge(
                errors?.map((error) => ({
                    text: error.message,
                    level: error.severity || "ERROR"
                })) ?? []
            );
        };

        const newDisposable = commit(lysConfig);
        setDisposable(newDisposable);
    }, [alertMessage, commit, connectedUserInfo.handleSessionExpired]);

    const pushCommit = useCallback((config: UseMutationConfig<MutationParameters>) => {
        connectedUserInfo.push(() => lysCommit(config));
    }, [connectedUserInfo.push, lysCommit]);

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    /**
     * Expose ref interface using useImperativeHandle
     */
    useImperativeHandle(ref, () => ({
        isInFlight,
        commit: hasPermission ? pushCommit : undefined,
        disposable: !isInFlight ? disposable : undefined
    }), [hasPermission, pushCommit, isInFlight, disposable]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <LysMutationContext.Provider
            value={[
                hasPermission ? pushCommit : null,
                isInFlight,
                !isInFlight ? disposable : undefined
            ]}
        >
            {(hasPermission || props.notPermissionDisplayType === "show") && props.children}
        </LysMutationContext.Provider>
    );
});

export default LysMutationProvider;
