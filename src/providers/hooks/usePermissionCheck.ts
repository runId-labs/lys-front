import {useCallback, useEffect, useState} from "react";
import {useWebserviceAccess} from "../WebserviceAccessProvider/hooks";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";

interface AccessParameters {
    ownerIds: string[];
}

/**
 * Hook to check permission for a set of operations with OWNER access level handling.
 *
 * - If user has only OWNER access level for a webservice, check ownerIds
 * - If user has other access levels (ROLE, ORGANIZATION_ROLE, etc.), grant access
 * - Warn if OWNER is in access levels but accessParameters is not provided
 */
export function usePermissionCheck(
    operationNames: string[],
    accessParameters?: AccessParameters | null,
    providerName: string = "Provider"
): boolean {
    const webserviceAccess = useWebserviceAccess();
    const connectedUserInfo = useConnectedUserInfo();

    const checkPermission = useCallback(() => {
        if (!operationNames.length) {
            return false;
        }

        return operationNames.every(operationName => {
            // First check if user has access to this webservice
            if (!webserviceAccess.checkWebserviceAccess(operationName)) {
                return false;
            }

            // Get access levels for this webservice
            const accessLevels = webserviceAccess.getWebserviceAccessLevels(operationName);

            // Check if OWNER is in the access levels
            const hasOwnerAccess = accessLevels.includes("OWNER");

            // If OWNER is the only access level
            if (hasOwnerAccess && accessLevels.length === 1) {
                // accessParameters is required for OWNER-only access
                if (!accessParameters) {
                    console.warn(
                        `${providerName}: Operation "${operationName}" requires OWNER access but accessParameters is not defined. ` +
                        `Please provide accessParameters={{ ownerIds: [...] }} to enable owner-based access control.`
                    );
                    return false;
                }

                // Check if connected user is in ownerIds
                const userId = connectedUserInfo.user?.id;
                if (!userId || !accessParameters.ownerIds.includes(userId)) {
                    return false;
                }
            } else if (hasOwnerAccess && !accessParameters) {
                // OWNER is one of multiple access levels, but accessParameters not provided
                // User has access through other levels, but warn about missing owner config
                console.warn(
                    `${providerName}: Operation "${operationName}" has OWNER access level but accessParameters is not defined. ` +
                    `Owner-based access control will not work. Consider providing accessParameters={{ ownerIds: [...] }}.`
                );
            }

            // User has access (either through non-OWNER levels or passed OWNER check)
            return true;
        });
    }, [operationNames, webserviceAccess, accessParameters, connectedUserInfo.user?.id, providerName]);

    const [hasPermission, setHasPermission] = useState<boolean>(() => checkPermission());

    useEffect(() => {
        setHasPermission(checkPermission());
    }, [checkPermission]);

    return hasPermission;
}
