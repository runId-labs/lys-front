/**
 * ClientProvider props
 */
export interface ClientProviderProps {
    children: React.ReactNode;
}

/**
 * Client context value
 */
export interface ClientContextValue {
    /**
     * Current client ID (from user profile or manual selection).
     * Null if no client is selected.
     */
    clientId: string | null;

    /**
     * Update the selected client ID.
     * Pass null to clear the selection.
     * No-op if the client ID is locked (client user).
     */
    setClientId: (id: string | null) => void;

    /**
     * Whether the client ID is locked (user is a client user).
     * When locked, setClientId is a no-op and the selector should be hidden.
     */
    isLocked: boolean;
}
