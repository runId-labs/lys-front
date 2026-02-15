import * as React from "react";
import {Suspense, useCallback, useEffect, useMemo, useState} from "react";
import {graphql, usePreloadedQuery, useQueryLoader, PreloadedQuery} from "react-relay";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";
import {WebserviceAccessProviderProps} from "./types";
import {WebserviceAccessContext} from "./hooks";
import ErrorBoundaryProvider from "../ErrorBoundaryProvider";
import {WebserviceAccessProviderQuery} from "./__generated__/WebserviceAccessProviderQuery.graphql";
import {useWebserviceAccessProviderTranslations} from "./translations";
import {toSnakeCase} from "../../tools/stringTools";

const query = graphql`
    query WebserviceAccessProviderQuery {
        allAccessibleWebservices {
            edges {
                node {
                    code
                    userAccessLevels {
                        code
                    }
                }
            }
        }
    }
`;

/**
 * Type for webservice data with access levels
 */
type WebserviceData = {
    code: string;
    accessLevels: string[];
};

/**
 * Inner component that executes the query
 * Isolated so ErrorBoundary only catches query errors, not children errors
 */
const QueryExecutor: React.FC<{
    queryRef: PreloadedQuery<WebserviceAccessProviderQuery>;
    onData: (webservices: WebserviceData[]) => void;
}> = ({queryRef, onData}) => {
    const data = usePreloadedQuery<WebserviceAccessProviderQuery>(query, queryRef);

    const webservicesData = useMemo(() => {
        return data?.allAccessibleWebservices?.edges
            ?.map((edge) => ({
                code: edge?.node?.code,
                accessLevels: edge?.node?.userAccessLevels?.map((level) => level.code) || []
            }))
            .filter((ws): ws is WebserviceData => ws.code !== null && ws.code !== undefined) || [];
    }, [data]);

    useEffect(() => {
        onData(webservicesData);
    }, [webservicesData, onData]);

    return null;
};

QueryExecutor.displayName = "QueryExecutor";

/**
 * WebserviceAccess provider
 * Manages loading of accessible webservices for current user
 * Auto-reloads when user changes
 */
const WebserviceAccessProvider: React.ComponentType<WebserviceAccessProviderProps> = ({children}) => {
    const {user, handleSessionExpired} = useConnectedUserInfo();
    const {t} = useWebserviceAccessProviderTranslations();

    const [queryRef, loadQuery, disposeQuery] = useQueryLoader<WebserviceAccessProviderQuery>(query);
    const [hasError, setHasError] = useState(false);
    const [webservicesMap, setWebservicesMap] = useState<Map<string, string[]>>(new Map());

    // Load webservice accesses when user changes
    useEffect(() => {
        if (!hasError) {
            loadQuery({}, {fetchPolicy: "network-only"});
        } else {
            disposeQuery();
        }
    }, [user, loadQuery, disposeQuery, hasError]);

    // Callback when query data is received
    const handleQueryData = useCallback((webservicesData: WebserviceData[]) => {
        const newMap = new Map<string, string[]>();
        webservicesData.forEach((ws) => {
            newMap.set(ws.code, ws.accessLevels);
        });
        setWebservicesMap(newMap);
    }, []);

    // Error handler for query errors only
    const handleQueryError = useCallback((error: Error) => {
        const relayError = error as Error & {errors?: Array<{message: string}>};
        if (error.message === "ACCESS_DENIED_ERROR" ||
            (error.message?.includes("ACCESS_DENIED_ERROR")) ||
            (relayError.errors?.some((e) => e.message === "ACCESS_DENIED_ERROR"))) {
            console.log("WebserviceAccessProvider: Session expired, redirecting to login");
            handleSessionExpired();
            return;
        }
        console.error("WebserviceAccessProvider query failed - continuing without permissions:", error);
        setHasError(true);
    }, [handleSessionExpired]);

    // Check webservice access
    const checkWebserviceAccess = useCallback((webserviceName: string) => {
        const snakeCaseName = toSnakeCase(webserviceName);
        return webservicesMap.has(snakeCaseName);
    }, [webservicesMap]);

    // Get access levels for a webservice
    const getWebserviceAccessLevels = useCallback((webserviceName: string): string[] => {
        const snakeCaseName = toSnakeCase(webserviceName);
        return webservicesMap.get(snakeCaseName) || [];
    }, [webservicesMap]);

    // Context value
    const contextValue = useMemo(() => ({
        checkWebserviceAccess,
        getWebserviceAccessLevels
    }), [checkWebserviceAccess, getWebserviceAccessLevels]);

    if (hasError) {
        return (
            <div style={{padding: '2rem', textAlign: 'center'}}>
                <h3>{t("errorTitle")}</h3>
                <p>{t("errorMessage")}</p>
            </div>
        );
    }

    return (
        <>
            {/* Query execution isolated in its own ErrorBoundary */}
            {queryRef && (
                <ErrorBoundaryProvider onError={handleQueryError}>
                    <Suspense fallback={<div>{t("loadingPermissions")}</div>}>
                        <QueryExecutor queryRef={queryRef} onData={handleQueryData} />
                    </Suspense>
                </ErrorBoundaryProvider>
            )}

            {/* Children rendered OUTSIDE the ErrorBoundary */}
            <WebserviceAccessContext.Provider value={contextValue}>
                {children}
            </WebserviceAccessContext.Provider>
        </>
    );
};

WebserviceAccessProvider.displayName = "WebserviceAccessProvider";

export default WebserviceAccessProvider;
