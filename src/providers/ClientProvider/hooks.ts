import {createContext, useContext} from "react";
import {ClientContextValue} from "./types";

/**
 * Client context
 */
const ClientContext = createContext<ClientContextValue>({
    clientId: null,
    setClientId: () => {
        console.warn("ClientProvider not initialized: setClientId");
    },
    isLocked: false
});

/**
 * Hook to access the current client ID context.
 *
 * - For client users (user.clientId is set): returns the user's clientId, locked.
 * - For admin/super-admin users: returns the manually selected clientId, changeable.
 *
 * Must be used within ClientProvider.
 */
function useClientId(): ClientContextValue {
    return useContext(ClientContext);
}

export {
    ClientContext,
    useClientId
};
