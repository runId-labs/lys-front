import {createContext, useContext} from "react";
import {AlertMessageInterface} from "./types";

/**
 * Alert message context
 */
const AlertMessageContext = createContext<{
    merge(messages: AlertMessageInterface[]): void
}>({
    merge: () => {
        console.warn("AlertMessageProvider not initialized")
    }
});

/**
 * Hook to access alert messages
 */
function useAlertMessages() {
    return useContext(AlertMessageContext)
}

export {
    AlertMessageContext,
    useAlertMessages
}
