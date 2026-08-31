import React, {useEffect, useRef, useState, useCallback, useMemo} from "react";
import {SignalContext} from "./hooks";
import {Signal, SignalHandler, SignalProviderProps, SignalReconnectHandler} from "./types";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";
import {
    HEARTBEAT_EVENT,
    MIN_FORCED_RETRY_INTERVAL_MS,
    RECONNECT_BASE_DELAY_MS,
    RECONNECT_MAX_DELAY_MS,
    STALE_CONNECTION_TIMEOUT_MS
} from "./consts";

/**
 * Decode Relay Global ID to extract raw UUID.
 * Relay IDs are base64 encoded strings in format "NodeType:uuid"
 */
const decodeRelayId = (relayId: string): string => {
    try {
        const decoded = atob(relayId);
        const parts = decoded.split(":");
        return parts.length > 1 ? parts[1] : relayId;
    } catch {
        return relayId;
    }
};

/**
 * Full jitter backoff: a delay drawn uniformly in [0, capped].
 *
 * Every browser tab holds its own connection, so an API restart wakes them all at the
 * same instant. Spreading each attempt over the whole window is what keeps that from
 * landing as a single burst on the API.
 */
const reconnectDelay = (attempt: number): number => {
    const capped = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** attempt);
    return Math.random() * capped;
};

/**
 * SignalProvider component
 *
 * Provides real-time signal handling via Server-Sent Events (SSE).
 * Uses native EventSource API to connect to the SSE endpoint.
 *
 * Connection behavior:
 * - Connects only when a user is authenticated (user.id exists)
 * - Disconnects automatically when user logs out
 * - Non-blocking: errors don't crash the application
 *
 * Reconnection behavior:
 * EventSource only retries transport drops on its own. Per specification, an attempt
 * answered with anything other than 200 — a 401 on an expired access token, a 502 during
 * an API rollout — moves readyState to CLOSED for good. This provider therefore layers an
 * application-level loop over the native one:
 * - a drop that closes a connection which had opened is retried with an exponential
 *   backoff, capped and jittered;
 * - a connection that closes without ever opening is most likely a rejected request, so
 *   the token refresh already owned by ConnectedUserProvider is given one chance to fix
 *   it. A refresh failure disconnects the user, which stops the loop rather than hammering
 *   an endpoint that keeps answering 401;
 * - a connection that stops carrying heartbeats is treated as dead and reopened;
 * - regaining network or focus retries immediately instead of waiting out the backoff.
 *
 * No missed message is replayed: signals carry no event id and the server keeps no
 * history. Consumers that must be accurate after an outage subscribe to reconnections
 * (see useSignalReconnect) and refetch.
 *
 * Place this provider after ConnectedUserProvider and before ChatbotProvider
 * in the component tree.
 */
const SignalProvider: React.FC<SignalProviderProps> = ({children}) => {
    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const {user, push} = useConnectedUserInfo();

    /*******************************************************************************************************************
     *                                                  REFS
     ******************************************************************************************************************/

    /**
     * EventSource instance
     */
    const eventSourceRef = useRef<EventSource | null>(null);

    /**
     * Set of registered signal handlers
     */
    const handlersRef = useRef<Set<SignalHandler>>(new Set());

    /**
     * Set of registered reconnection handlers
     */
    const reconnectHandlersRef = useRef<Set<SignalReconnectHandler>>(new Set());

    /**
     * Pending reconnection timer
     */
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Pending stale-connection timer
     */
    const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Number of consecutive failed attempts, reset on every successful open
     */
    const attemptRef = useRef(0);

    /**
     * Whether at least one connection ever opened, used to tell a reconnection
     * from the first connection
     */
    const hasEverOpenedRef = useRef(false);

    /**
     * User id of the connection to (re)open, kept out of the callbacks so the
     * reconnection loop never depends on a render
     */
    const userIdRef = useRef<string | null>(null);

    /**
     * When the last attempt was started, used to space wake-up retries
     */
    const lastAttemptAtRef = useRef(0);

    /**
     * Indirection breaking the cycle between startConnection and scheduleReconnect
     */
    const startConnectionRef = useRef<(userId: string) => void>(() => {});

    /**
     * Connected user queue, kept in a ref: its identity changes with the token expiry and
     * must not invalidate the connection callbacks
     */
    const pushRef = useRef(push);
    pushRef.current = push;

    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Dispatch a signal to all registered handlers
     */
    const dispatchSignal = useCallback((signal: Signal) => {
        handlersRef.current.forEach((handler) => {
            try {
                handler(signal);
            } catch (err) {
                console.error("[SignalProvider] Handler error:", err);
            }
        });
    }, []);

    /**
     * Notify all registered handlers that the connection was re-established
     */
    const dispatchReconnect = useCallback(() => {
        reconnectHandlersRef.current.forEach((handler) => {
            try {
                handler();
            } catch (err) {
                console.error("[SignalProvider] Reconnect handler error:", err);
            }
        });
    }, []);

    /**
     * Subscribe a handler to receive signals
     * Returns an unsubscribe function
     */
    const subscribe = useCallback((handler: SignalHandler): (() => void) => {
        handlersRef.current.add(handler);
        return () => {
            handlersRef.current.delete(handler);
        };
    }, []);

    /**
     * Subscribe a handler to reconnections
     * Returns an unsubscribe function
     */
    const subscribeReconnect = useCallback((handler: SignalReconnectHandler): (() => void) => {
        reconnectHandlersRef.current.add(handler);
        return () => {
            reconnectHandlersRef.current.delete(handler);
        };
    }, []);

    /**
     * Clear every pending timer
     */
    const clearTimers = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (staleTimerRef.current) {
            clearTimeout(staleTimerRef.current);
            staleTimerRef.current = null;
        }
    }, []);

    /**
     * Close the EventSource without touching the reconnection state
     */
    const closeEventSource = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    /**
     * Stop the SSE connection and cancel any pending reconnection
     */
    const stopConnection = useCallback(() => {
        clearTimers();
        closeEventSource();
        userIdRef.current = null;
        attemptRef.current = 0;
        lastAttemptAtRef.current = 0;
        setIsConnected(false);
        setError(null);
    }, [clearTimers, closeEventSource]);

    /**
     * Schedule the next attempt with an exponential, jittered, capped delay
     */
    const scheduleReconnect = useCallback(() => {
        const userId = userIdRef.current;
        if (!userId || reconnectTimerRef.current) {
            return;
        }

        const delay = reconnectDelay(attemptRef.current);
        attemptRef.current += 1;

        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            startConnectionRef.current(userId);
        }, delay);
    }, []);

    /**
     * Reconnect as soon as allowed, dropping any pending backoff
     *
     * Used when the cause of the outage is known to be over: network back, tab focused
     * again, connection found stalled. The backoff is reset, but attempts stay spaced by
     * MIN_FORCED_RETRY_INTERVAL_MS: these events fire repeatedly and on many clients at
     * once, and retrying on each one turns a resume into a burst on the API.
     */
    const reconnectNow = useCallback(() => {
        const userId = userIdRef.current;
        if (!userId) {
            return;
        }

        clearTimers();
        attemptRef.current = 0;

        const sinceLastAttempt = Date.now() - lastAttemptAtRef.current;
        if (sinceLastAttempt >= MIN_FORCED_RETRY_INTERVAL_MS) {
            startConnectionRef.current(userId);
            return;
        }

        // Jittered on top of the remaining wait: clients whose last attempt was
        // simultaneous would otherwise leave the window at the same instant too.
        const wait = MIN_FORCED_RETRY_INTERVAL_MS - sinceLastAttempt + reconnectDelay(0);
        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            startConnectionRef.current(userId);
        }, wait);
    }, [clearTimers]);

    /**
     * Arm the stale-connection watchdog
     *
     * Only armed once a heartbeat has been seen: against a server that does not emit any,
     * an idle connection would otherwise be torn down every STALE_CONNECTION_TIMEOUT_MS.
     */
    const armStaleWatchdog = useCallback(() => {
        if (staleTimerRef.current) {
            clearTimeout(staleTimerRef.current);
        }
        staleTimerRef.current = setTimeout(() => {
            staleTimerRef.current = null;
            setIsConnected(false);
            setError(new Error("SSE connection stalled"));
            reconnectNow();
        }, STALE_CONNECTION_TIMEOUT_MS);
    }, [reconnectNow]);

    /**
     * Open the EventSource and wire its handlers
     */
    const openEventSource = useCallback((userId: string) => {
        // The user may have logged out while the attempt was queued behind a token refresh
        if (userIdRef.current !== userId) {
            return;
        }

        closeEventSource();

        // Decode Relay ID to get raw UUID for channel subscription
        const rawUserId = decodeRelayId(userId);
        const baseUrl = import.meta.env?.VITE_SSE_ENDPOINT as string || "";
        const url = `${baseUrl}/sse/signals?channel=user:${rawUserId}`;

        // Create EventSource with credentials for cookie auth
        const eventSource = new EventSource(url, {withCredentials: true});
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            const isReconnection = hasEverOpenedRef.current;

            hasEverOpenedRef.current = true;
            attemptRef.current = 0;
            setIsConnected(true);
            setError(null);

            if (isReconnection) {
                dispatchReconnect();
            }
        };

        eventSource.addEventListener(HEARTBEAT_EVENT, () => {
            armStaleWatchdog();
        });

        eventSource.onmessage = (event) => {
            armStaleWatchdog();
            try {
                const signal: Signal = JSON.parse(event.data);
                dispatchSignal(signal);
            } catch {
                // Ignore parse errors
            }
        };

        eventSource.onerror = () => {
            // A previous EventSource that was already replaced
            if (eventSourceRef.current !== eventSource) {
                return;
            }

            setIsConnected(false);
            setError(new Error("SSE connection error"));

            // Still CONNECTING: the native retry is running, leave it alone
            if (eventSource.readyState !== EventSource.CLOSED) {
                return;
            }

            closeEventSource();
            scheduleReconnect();
        };
    }, [armStaleWatchdog, closeEventSource, dispatchReconnect, dispatchSignal, scheduleReconnect]);

    /**
     * Start the SSE connection
     *
     * The attempt is queued on the connected user: an expired access token is refreshed
     * before the stream is opened, instead of opening it against a certain 401.
     */
    const startConnection = useCallback((userId: string) => {
        clearTimers();
        closeEventSource();
        userIdRef.current = userId;
        lastAttemptAtRef.current = Date.now();

        pushRef.current(() => openEventSource(userId));
    }, [clearTimers, closeEventSource, openEventSource]);

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    /**
     * Keep the indirection current. Assigned in an effect rather than during render:
     * only timers and queued callbacks read it, and they all run after commit.
     */
    useEffect(() => {
        startConnectionRef.current = startConnection;
    }, [startConnection]);

    /**
     * Connect/disconnect based on user authentication state
     */
    useEffect(() => {
        if (user?.id) {
            // User is authenticated - start connection
            hasEverOpenedRef.current = false;
            startConnection(user.id);
        } else {
            // User is not authenticated - stop connection
            stopConnection();
        }

        // Cleanup on unmount or user change
        return () => {
            stopConnection();
        };
    }, [user?.id, startConnection, stopConnection]);

    /**
     * Retry immediately when the browser regains network or the tab comes back to the
     * foreground, rather than waiting out a backoff whose cause is already over
     */
    useEffect(() => {
        if (!user?.id) {
            return;
        }

        const retryIfDown = () => {
            if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
                reconnectNow();
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                retryIfDown();
            }
        };

        window.addEventListener("online", retryIfDown);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener("online", retryIfDown);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [user?.id, reconnectNow]);

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    const contextValue = useMemo(() => ({
        isConnected,
        error,
        subscribe,
        subscribeReconnect
    }), [isConnected, error, subscribe, subscribeReconnect]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <SignalContext.Provider value={contextValue}>
            {children}
        </SignalContext.Provider>
    );
};

export default SignalProvider;
