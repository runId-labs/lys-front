import {forwardRef, useCallback, useEffect, useRef, useState} from "react";
import {useMutation, graphql, useQueryLoader, usePreloadedQuery, useFragment} from "react-relay";
import type {PreloadedQuery} from "react-relay";
import {PayloadError} from "relay-runtime";
import {useIntl} from "react-intl";
import { ConnectedUserContext } from "./hooks";
import {ConnectedUserInterface, ConnectedUserProviderProps, ConnectedUserProviderRefInterface} from "./types";
import {useAlertMessages} from "../AlertMessageProvider/hooks";
import {useLocale} from "../LocaleProvider/hooks";
import {ConnectedUserFragment} from "./ConnectedUserFragment";
import type {ConnectedUserProviderQuery as ConnectedUserProviderQueryType} from "./__generated__/ConnectedUserProviderQuery.graphql";
import type {ConnectedUserProviderRefreshMutation$data} from "./__generated__/ConnectedUserProviderRefreshMutation.graphql";
import type {ConnectedUserProviderLoginMutation$data} from "./__generated__/ConnectedUserProviderLoginMutation.graphql";
import {clearRelayCache} from "../../relay/RelayEnvironment";
import {errorTranslations, isErrorKey} from "../../i18n/errors";
import type {RelayNetworkError} from "../../types/relayTypes";

/**
 * Query definition for connected user
 */
const ConnectedUserProviderQueryNode = graphql`
    query ConnectedUserProviderQuery {
        connectedUser {
            ...ConnectedUserFragment_user
        }
    }
`;

/**
 * Refresh access token mutation (shared between outer and inner components)
 */
const RefreshMutationNode = graphql`mutation ConnectedUserProviderRefreshMutation {
    refreshAccessToken {
        success
        accessTokenExpireIn
        xsrfToken
    }
}`;

/**
 * Inner component that uses preloaded query
 */
const ConnectedUserProviderInner = forwardRef<ConnectedUserProviderRefInterface, ConnectedUserProviderProps & {
    queryRef: PreloadedQuery<ConnectedUserProviderQueryType>;
    onMutationSuccess: () => void;
}>((props, ref) => {
    const {queryRef, onMutationSuccess} = props;

    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const alertMessage = useAlertMessages();
    const intl = useIntl();
    const {updateLocale} = useLocale();

    /*******************************************************************************************************************
     *                                                  QUERIES
     ******************************************************************************************************************/

    /**
     * Fetch connected user from Relay cache
     * Automatically re-renders when cache is updated by mutations
     */
    const data = usePreloadedQuery(ConnectedUserProviderQueryNode, queryRef);

    /**
     * Read fragment data using useFragment
     * Fragment spread masks data - must use useFragment to access it
     */
    const user = useFragment(ConnectedUserFragment, data?.connectedUser ?? null) as ConnectedUserInterface | undefined;

    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [accessTokenExpireIn, setAccessTokenExpireIn] = useState<number | undefined>(undefined)
    const [_webserviceBuffer, setWebserviceBuffer] = useState<(() => void)[]>([])
    const isRefreshInflightRef = useRef<boolean>(false)
    const refreshCallbacksRef = useRef<Array<() => void>>([])

    /*******************************************************************************************************************
     *                                                  MUTATIONS
     ******************************************************************************************************************/

    const [commitLogin, isLoginInflight] = useMutation(
        graphql`mutation ConnectedUserProviderLoginMutation($inputs: LoginInput!) {
            login(inputs: $inputs) {
                success
                accessTokenExpireIn
                xsrfToken
            }
        }`
    )

    const [commitRefresh] = useMutation(RefreshMutationNode)

    const [commitLogout, isLogoutInflight] = useMutation(
        graphql`mutation ConnectedUserProviderLogoutMutation {
            logout {
                succeed
            }
        }`
    )

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Call refresh mutation
     * Used reactively when access token expires
     */
    const commitLysRefresh = useCallback(() => {
        // Prevent multiple simultaneous refresh calls
        if (isRefreshInflightRef.current) {
            return;
        }

        isRefreshInflightRef.current = true;

        commitRefresh({
            variables: {},
            onCompleted: (response: ConnectedUserProviderRefreshMutation$data, errors: PayloadError[] | null) => {
                isRefreshInflightRef.current = false;

                if (!errors || !errors?.length) {
                    // Trigger refetch of connected user query
                    onMutationSuccess();
                }
                setAccessTokenExpireIn(response.refreshAccessToken?.accessTokenExpireIn)
            },
            onError: (error: Error) => {
                isRefreshInflightRef.current = false;

                // Clear cache on refresh failure
                clearRelayCache();
                // Trigger refetch even on error to update UI
                onMutationSuccess();
                setAccessTokenExpireIn(undefined)

                // Report error to user
                const relayError = error as RelayNetworkError;
                if (relayError?.source?.errors) {
                    const locale = intl.locale as "en" | "fr";
                    relayError.source.errors.forEach((err) => {
                        if (err.message !== "WRONG_REFRESH_TOKEN_ERROR") {
                            if (!isErrorKey(err.message)) {
                                console.error("Unhandled server error:", err.message);
                            }
                            alertMessage.merge([{
                                text: isErrorKey(err.message)
                                    ? errorTranslations[err.message][locale]
                                    : errorTranslations.UNKNOWN_ERROR[locale],
                                level: "CRITICAL"
                            }])
                        }
                    })
                } else {
                    // Network error (CORS, connection failed, etc)
                    alertMessage.merge([{
                        text: error.message || "NETWORK_ERROR",
                        level: "CRITICAL"
                    }])
                }
            }
        })
    }, [commitRefresh, alertMessage, onMutationSuccess, intl.locale])

    /**
     * Call login mutation
     */
    const commitLysLogin = useCallback((login: string, password: string) => {
        commitLogin({
            variables: {
                inputs: {
                    login,
                    password
                }
            },
            onCompleted: (response: ConnectedUserProviderLoginMutation$data, errors: PayloadError[] | null) => {
                if (!errors || !errors?.length) {
                    // Trigger refetch of connected user query
                    onMutationSuccess();
                }
                setAccessTokenExpireIn(response.login?.accessTokenExpireIn)
            },
            onError: (error: Error) => {
                const relayError = error as RelayNetworkError;
                relayError?.source?.errors?.forEach((err) => {
                    alertMessage.merge([{
                        text: err.message,
                        level: "CRITICAL"
                    }])
                })
            }
        })
    }, [commitLogin, alertMessage, onMutationSuccess])

    /**
     * Call logout mutation
     */
    const commitLysLogout = useCallback(() => {
        commitLogout({
            variables: {},
            onCompleted: () => {
                // Clear Relay cache
                clearRelayCache();
                // Trigger refetch of connected user query
                onMutationSuccess();
                setAccessTokenExpireIn(undefined)
                alertMessage.merge([{
                    text: intl.formatMessage({id: "lys.services.i18n.messages.logoutSuccess"}),
                    level: "SUCCESS"
                }])
            },
            onError: (error: Error) => {
                const relayError = error as RelayNetworkError;
                relayError?.source?.errors?.forEach((err) => {
                    alertMessage.merge([{
                        text: err.message,
                        level: "CRITICAL"
                    }])
                })
            }
        })
    }, [commitLogout, alertMessage, intl, onMutationSuccess])

    /**
     * Handle session expired (ACCESS_DENIED_ERROR)
     * Attempts to refresh token first, if that fails then disconnects
     * Supports multiple callbacks from different LysQueryProviders failing simultaneously
     * @param onRefreshSuccess Optional callback called after successful token refresh
     */
    const handleSessionExpired = useCallback((onRefreshSuccess?: () => void) => {
        // Store callback to be called when refresh completes
        // This allows multiple LysQueryProviders to register their callbacks
        if (onRefreshSuccess) {
            refreshCallbacksRef.current.push(onRefreshSuccess);
        }

        // Only start refresh if not already in flight
        if (!isRefreshInflightRef.current) {
            isRefreshInflightRef.current = true;

            commitRefresh({
                variables: {},
                onCompleted: (response: ConnectedUserProviderRefreshMutation$data, errors: PayloadError[] | null) => {
                    isRefreshInflightRef.current = false;

                    if (!errors || !errors?.length) {
                        // Refresh succeeded - update expiration
                        setAccessTokenExpireIn(response.refreshAccessToken?.accessTokenExpireIn)
                        onMutationSuccess();
                        // Call ALL registered callbacks to retry failed requests
                        const callbacks = refreshCallbacksRef.current;
                        refreshCallbacksRef.current = [];
                        callbacks.forEach((cb) => {
                            try {
                                cb();
                            } catch (error) {
                                console.error('Error executing refresh callback:', error);
                            }
                        });
                    } else {
                        // Refresh failed - clear callbacks and disconnect user
                        refreshCallbacksRef.current = [];
                        clearRelayCache();
                        onMutationSuccess();
                        setAccessTokenExpireIn(undefined);
                        alertMessage.merge([{
                            text: intl.formatMessage({id: "lys.services.i18n.messages.sessionExpired"}),
                            level: "WARNING"
                        }]);
                    }
                },
                onError: () => {
                    isRefreshInflightRef.current = false;
                    // Clear callbacks on error
                    refreshCallbacksRef.current = [];

                    // Refresh failed - disconnect user
                    clearRelayCache();
                    onMutationSuccess();
                    setAccessTokenExpireIn(undefined);
                    alertMessage.merge([{
                        text: intl.formatMessage({id: "lys.services.i18n.messages.sessionExpired"}),
                        level: "WARNING"
                    }]);
                }
            })
        }
    }, [commitRefresh, onMutationSuccess, alertMessage, intl])

    /**
     * Push webservice to queue or execute immediately
     * Reactive refresh: if token expired, refresh then execute buffered requests
     */
    const push = useCallback((webservice: () => void) => {
        const timeStampSecondNow = Date.now() / 1000

        // Check if token is valid (with 5 second buffer)
        const isValid = accessTokenExpireIn !== undefined
            ? (accessTokenExpireIn - timeStampSecondNow > 5)
            : true  // If no expiration info (public/unauthenticated), consider valid

        // Token valid and not refreshing -> execute immediately
        if (isValid && !isRefreshInflightRef.current) {
            webservice()
            return
        }

        // Token invalid and not refreshing -> trigger refresh
        if (!isValid && !isRefreshInflightRef.current) {
            commitLysRefresh()
        }

        // In all other cases -> buffer the webservice
        // (either refreshing or token invalid)
        setWebserviceBuffer(prev => [...prev, webservice])
    }, [accessTokenExpireIn, commitLysRefresh])

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    // Execute buffered webservices when token becomes valid after refresh
    useEffect(() => {
        const timeStampSecondNow = Date.now() / 1000
        const isValid = accessTokenExpireIn !== undefined
            ? (accessTokenExpireIn - timeStampSecondNow > 5)
            : true  // If no expiration info (public/unauthenticated), consider valid

        if (isValid && !isRefreshInflightRef.current) {
            setWebserviceBuffer(currentBuffer => {
                if (currentBuffer.length > 0) {
                    // Execute all buffered webservices
                    currentBuffer.forEach((webservice) => {
                        try {
                            webservice()
                        } catch (error) {
                            console.error('Error executing buffered webservice:', error)
                        }
                    })
                }
                return []  // Clear buffer
            })
        }
    }, [accessTokenExpireIn])

    // Update locale when user language changes
    useEffect(() => {
        if (user?.language?.code) {
            updateLocale(user.language.code);
        }
    }, [user?.language?.code, updateLocale]);

    // Update reference
    useEffect(() => {
        const data = {
            language: user?.language?.code
        }

        if (typeof ref === 'function') {
            ref(data)
        } else if (ref) {
            ref.current = data
        }
    }, [user?.language?.code, ref])

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <ConnectedUserContext.Provider value={{
            user,
            push,
            logout: [commitLysLogout, isLogoutInflight],
            login: [commitLysLogin, isLoginInflight],
            refresh: [commitLysRefresh, false],
            handleSessionExpired
        }}>
            {props.children}
        </ConnectedUserContext.Provider>
    )
})

ConnectedUserProviderInner.displayName = "ConnectedUserProviderInner";

/**
 * Outer component that manages query loading
 *
 * On mount, attempts to refresh the access token before loading the user query.
 * This handles the case where a page reload occurs after the access token (short-lived JWT)
 * has expired but the refresh token (longer-lived, httpOnly cookie) is still valid.
 * Without this, the initial connectedUser query would fail with an expired JWT,
 * showing the login page even though the session is still valid.
 */
const ConnectedUserProvider = forwardRef<ConnectedUserProviderRefInterface, ConnectedUserProviderProps>((props, ref) => {
    const [queryRef, loadQuery] = useQueryLoader<ConnectedUserProviderQueryType>(ConnectedUserProviderQueryNode);
    // Tracks whether the initial query has been loaded (after mount refresh attempt)
    const queryLoadedRef = useRef(false);

    // Reuse the shared refresh mutation for the initial mount refresh
    const [commitInitialRefresh] = useMutation(RefreshMutationNode);

    // On mount: attempt token refresh, then load user query
    useEffect(() => {
        if (queryLoadedRef.current) return;
        queryLoadedRef.current = true;

        commitInitialRefresh({
            variables: {},
            onCompleted: () => {
                // Refresh succeeded — load user query with fresh access token
                loadQuery({}, {fetchPolicy: 'network-only'});
            },
            onError: () => {
                // Refresh failed (no valid refresh token) — load query anyway
                // This will return null connectedUser, showing the login page
                loadQuery({}, {fetchPolicy: 'network-only'});
            },
        });
    }, [commitInitialRefresh, loadQuery]);

    // Callback to reload query after mutations (login, refresh, logout)
    const handleMutationSuccess = useCallback(() => {
        // Use store-and-network to use cache first, then refetch
        loadQuery({}, {fetchPolicy: 'store-and-network'});
    }, [loadQuery]);

    return queryRef ? (
        <ConnectedUserProviderInner
            ref={ref}
            queryRef={queryRef}
            onMutationSuccess={handleMutationSuccess}
        >
            {props.children}
        </ConnectedUserProviderInner>
    ) : null;
});

ConnectedUserProvider.displayName = "ConnectedUserProvider";

export default ConnectedUserProvider
