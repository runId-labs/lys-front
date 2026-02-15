import {createContext, useCallback, useContext} from "react";
import {GraphQLTaggedNode} from "relay-runtime";
import {extractOperationNames, checkOperationsPermission as checkOperationsPermissionUtil} from "../../tools/relayTools";

/**
 * Webservice access context
 */
const WebserviceAccessContext = createContext<{
    checkWebserviceAccess(webservice: string): boolean;
    getWebserviceAccessLevels(webservice: string): string[];
}>({
    checkWebserviceAccess: () => {
        console.warn("WebserviceAccessProvider not initialized: checkWebserviceAccess");
        return false;
    },
    getWebserviceAccessLevels: () => {
        console.warn("WebserviceAccessProvider not initialized: getWebserviceAccessLevels");
        return [];
    }
});

/**
 * Hook to access webservice permissions
 *
 * Provides:
 * - checkWebserviceAccess(name): Check permission by webservice name (string)
 * - checkOperationsPermission(operation): Check permission by GraphQL operation (mutation/query)
 * - getWebserviceAccessLevels(name): Get access levels for a webservice
 */
function useWebserviceAccess() {
    const {checkWebserviceAccess, getWebserviceAccessLevels} = useContext(WebserviceAccessContext);

    /**
     * Check permission for a GraphQL operation (mutation or query)
     * Extracts operation names from the GraphQL node and checks all permissions
     */
    const checkOperationsPermission = useCallback((operation: GraphQLTaggedNode): boolean => {
        const operationNames = extractOperationNames(operation);
        return checkOperationsPermissionUtil(operationNames, checkWebserviceAccess);
    }, [checkWebserviceAccess]);

    return {
        checkWebserviceAccess,
        checkOperationsPermission,
        getWebserviceAccessLevels
    };
}

export {
    WebserviceAccessContext,
    useWebserviceAccess
}
