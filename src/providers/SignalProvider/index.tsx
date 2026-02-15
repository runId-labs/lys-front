import React, {useEffect, useRef, useState, useCallback, useMemo} from "react";
import {SignalContext} from "./hooks";
import {Signal, SignalHandler, SignalProviderProps} from "./types";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";

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
 * SignalProvider component
 *
 * Provides real-time signal handling via Server-Sent Events (SSE).
 * Uses native EventSource API to connect to the SSE endpoint.
 *
 * Connection behavior:
 * - Connects only when a user is authenticated (user.id exists)
 * - Disconnects automatically when user logs out
 * - Non-blocking: errors don't crash the application
 * - Automatically reconnects on connection loss (handled by EventSource)
 *
 * Place this provider after ConnectedUserProvider and before ChatbotProvider
 * in the component tree.
 */
const SignalProvider: React.FC<SignalProviderProps> = ({children}) => {
    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const {user} = useConnectedUserInfo();

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
     * Stop the SSE connection
     */
    const stopConnection = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
        setError(null);
    }, []);

    /**
     * Start the SSE connection
     */
    const startConnection = useCallback((userId: string) => {
        // Close existing connection if any
        stopConnection();

        // Decode Relay ID to get raw UUID for channel subscription
        const rawUserId = decodeRelayId(userId);
        const baseUrl = import.meta.env?.VITE_SSE_ENDPOINT as string || "";
        const url = `${baseUrl}/sse/signals?channel=user:${rawUserId}`;

        // Create EventSource with credentials for cookie auth
        const eventSource = new EventSource(url, {withCredentials: true});
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        eventSource.onmessage = (event) => {
            try {
                const signal: Signal = JSON.parse(event.data);
                dispatchSignal(signal);
            } catch {
                // Ignore parse errors
            }
        };

        eventSource.onerror = () => {
            setError(new Error("SSE connection error"));
            setIsConnected(false);
            // EventSource will automatically try to reconnect
        };
    }, [dispatchSignal, stopConnection]);

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    /**
     * Connect/disconnect based on user authentication state
     */
    useEffect(() => {
        if (user?.id) {
            // User is authenticated - start connection
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

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    const contextValue = useMemo(() => ({
        isConnected,
        error,
        subscribe
    }), [isConnected, error, subscribe]);

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