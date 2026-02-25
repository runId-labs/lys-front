import {createContext, useContext, useEffect, useState} from "react";
import {SignalContextValue, SignalHandler, SignalRefresh} from "./types";

/**
 * Signal context with default no-op values
 */
export const SignalContext = createContext<SignalContextValue>({
    isConnected: false,
    error: null,
    subscribe: () => {
        console.warn("SignalProvider not initialized: subscribe");
        return () => {};
    }
});

/**
 * Hook to access signal provider state
 */
export function useSignal(): SignalContextValue {
    return useContext(SignalContext);
}

/**
 * Hook to subscribe to signals with automatic cleanup
 *
 * @param handler - Function called when a signal is received
 * @param deps - Dependencies array for the handler (like useEffect)
 *
 * @example
 * ```tsx
 * useSignalSubscription((signal) => {
 *     if (signal.signal === "FINANCIAL_IMPORT_COMPLETED") {
 *         // Handle import completion
 *         refetchData();
 *     }
 * }, [refetchData]);
 * ```
 */
export function useSignalSubscription(
    handler: SignalHandler,
    deps: React.DependencyList = []
): void {
    const {subscribe} = useSignal();

    useEffect(() => {
        const unsubscribe = subscribe(handler);
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscribe, ...deps]);
}

/**
 * Hook that returns a version counter and params, incremented each time a matching signal is received.
 * Use version as a useEffect dependency to trigger query reloads on specific signals.
 * Use params to filter based on signal data before reloading.
 *
 * Matches on both signal.signal and signal.params.type_id for compatibility
 * with notification-wrapped signals.
 *
 * @param signalKeys - One or more signal names to listen for
 * @returns {SignalRefresh} version counter and params of the last matching signal
 *
 * @example
 * ```tsx
 * const {version, params} = useSignalRefresh("PORTFOLIO_ANALYSIS_COMPLETED");
 *
 * useEffect(() => {
 *     const data = params?.data as Record<string, unknown>;
 *     if (version > 0 && data?.year === year && queryRef?.hasPermission) {
 *         queryRef?.load();
 *     }
 * }, [version]);
 * ```
 */
export function useSignalRefresh(...signalKeys: string[]): SignalRefresh {
    const [version, setVersion] = useState(0);
    const [params, setParams] = useState<Record<string, unknown> | null>(null);

    useSignalSubscription((signal) => {
        const typeId = signal.params?.type_id as string | undefined;
        if (signalKeys.includes(signal.signal) || (typeId && signalKeys.includes(typeId))) {
            setParams(signal.params);
            setVersion(v => v + 1);
        }
    }, signalKeys);

    return {version, params};
}