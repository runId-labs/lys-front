import {createContext, useContext} from "react";
import {ConnectedUserInterface} from "./types";

/**
 * Connected user context
 */
const ConnectedUserContext = createContext<{
    user: ConnectedUserInterface | undefined
    push(webservice: () => void): void
    login: [(login: string, password: string) => void, boolean],
    logout: [() => void, boolean],
    refresh: [() => void, boolean],
    handleSessionExpired: (onRefreshSuccess?: () => void) => void
}>({
    user: undefined,
    push: () => {
        console.warn("ConnectedUserProvider not initialized: push")
    },
    login: [() => {
        console.warn("ConnectedUserProvider not initialized: login")
    }, false],
    logout: [() => {
        console.warn("ConnectedUserProvider not initialized: logout")
    }, false],
    refresh: [() => {
        console.warn("ConnectedUserProvider not initialized: refresh")
    }, false],
    handleSessionExpired: () => {
        console.warn("ConnectedUserProvider not initialized: handleSessionExpired")
    }
});

/**
 * Hook to access connected user info
 */
function useConnectedUserInfo() {
    return useContext(ConnectedUserContext)
}

export {
    ConnectedUserContext,
    useConnectedUserInfo
}
