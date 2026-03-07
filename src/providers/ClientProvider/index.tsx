import * as React from "react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {ClientContext} from "./hooks";
import {ClientProviderProps} from "./types";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";
import {useUrlQueries} from "../UrlQueriesProvider/hooks";

const SESSION_KEY = "lys_clientId";
const URL_PARAM_KEY = "clientId";

/**
 * ClientProvider - Manages the current client ID selection
 *
 * Features:
 * - For client users: clientId is locked to user.clientId
 * - For admin users: clientId is selectable
 * - Persisted in sessionStorage (survives page navigation)
 * - Synced to URL query param (visible for debugging)
 * - Automatically clears on logout (user becomes undefined)
 *
 * Must be placed after ConnectedUserProvider and inside UrlQueriesProvider.
 */
const ClientProvider: React.ComponentType<ClientProviderProps> = ({children}) => {
    const {user} = useConnectedUserInfo();
    const {update: updateUrl, appliedParams} = useUrlQueries();
    const location = useLocation();

    const isLocked = !!user?.clientId;
    const prevUserRef = useRef(user);

    const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
        // URL param takes priority (e.g. shared link), then sessionStorage
        return appliedParams.get(URL_PARAM_KEY) || sessionStorage.getItem(SESSION_KEY);
    });

    /**
     * Clear selection on logout (user was defined, now undefined)
     */
    useEffect(() => {
        const wasLoggedIn = prevUserRef.current !== undefined;
        const isLoggedOut = user === undefined;
        prevUserRef.current = user;

        if (wasLoggedIn && isLoggedOut) {
            sessionStorage.removeItem(SESSION_KEY);
            setSelectedClientId(null);
            updateUrl({[URL_PARAM_KEY]: null});
        }
    }, [user, updateUrl]);

    /**
     * Sync clientId to URL on selection change or page navigation
     * Uses UrlQueriesProvider.update (same setSearchParams as other components)
     * to avoid conflicts when multiple params change in the same effect cycle
     */
    useEffect(() => {
        if (isLocked) return;

        if (selectedClientId) {
            updateUrl({[URL_PARAM_KEY]: selectedClientId});
        } else {
            updateUrl({[URL_PARAM_KEY]: null});
        }
    }, [selectedClientId, location.pathname, isLocked, updateUrl]);

    /**
     * Resolved clientId: locked from user profile or manual selection
     */
    const clientId = useMemo(() => {
        if (user?.clientId) {
            return user.clientId;
        }
        return selectedClientId;
    }, [user?.clientId, selectedClientId]);

    /**
     * Update the selected client ID (persists to sessionStorage + URL)
     */
    const setClientId = useCallback((id: string | null) => {
        if (isLocked) return;
        if (id) {
            sessionStorage.setItem(SESSION_KEY, id);
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
        setSelectedClientId(id);
    }, [isLocked]);

    const value = useMemo(() => ({
        clientId,
        setClientId,
        isLocked
    }), [clientId, setClientId, isLocked]);

    return (
        <ClientContext.Provider value={value}>
            {children}
        </ClientContext.Provider>
    );
};

ClientProvider.displayName = "ClientProvider";

export default ClientProvider;