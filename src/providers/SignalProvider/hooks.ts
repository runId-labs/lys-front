import {createContext, useContext, useEffect} from "react";
import {SignalContextValue, SignalHandler} from "./types";

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