import * as React from "react";

/**
 * Signal received from the server
 * Matches the SignalNode GraphQL type
 */
export interface Signal {
    channel: string | null;
    signal: string;
    params: Record<string, unknown> | null;
}

/**
 * Signal handler function type
 */
export type SignalHandler = (signal: Signal) => void;

/**
 * Return type of useSignalRefresh hook
 */
export interface SignalRefresh {
    version: number;
    params: Record<string, unknown> | null;
}

/**
 * SignalProvider props
 */
export interface SignalProviderProps {
    children: React.ReactNode;
}

/**
 * SignalProvider context value
 */
export interface SignalContextValue {
    /**
     * Whether the signal connection is active
     */
    isConnected: boolean;

    /**
     * Last connection error (if any)
     */
    error: Error | null;

    /**
     * Register a handler for signals
     * Returns an unsubscribe function
     */
    subscribe: (handler: SignalHandler) => () => void;
}