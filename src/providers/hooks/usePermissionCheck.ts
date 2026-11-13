import {useCallback, useEffect, useState} from "react";
import {useWebserviceAccess} from "../WebserviceAccessProvider/hooks";
import {useConnectedUserInfo} from "../ConnectedUserProvider/hooks";

interface AccessParameters {
    ownerIds: string[];
}

/**
 * Hook to check permission for a set of operations with OWNER access level handling.
 *
 * - If user has other access levels (ROLE, ORGANIZATION_ROLE, etc.), grant access
 * - If user has only OWNER access level and the caller states the owners
 *   (accessParameters.ownerIds), grant access only to one of them: a control
 *   acting on a given object (edit, delete) hides itself on objects of others
 * - If user has only OWNER access level and no owners are stated, grant access:
 *   the backend decides, filtering the rows (a list) or refusing an object that
 *   is not the user's. The check here only shapes the display; the webservice
 *   is the authority.
 */
export function usePermissionCheck(
    operationNames: string[],
    accessParameters?: AccessParameters | null
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

            // OWNER is the only access level and the caller states the owners:
            // the connected user must be one of them
            if (hasOwnerAccess && accessLevels.length === 1 && accessParameters) {
                const userId = connectedUserInfo.user?.id;
                if (!userId || !accessParameters.ownerIds.includes(userId)) {
                    return false;
                }
            }

            // User has access: through non-OWNER levels, as a stated owner, or
            // as an owner the backend checks itself (no owners stated)
            return true;
        });
    }, [operationNames, webserviceAccess, accessParameters, connectedUserInfo.user?.id]);

    const [hasPermission, setHasPermission] = useState<boolean>(() => checkPermission());

    useEffect(() => {
        setHasPermission(checkPermission());
    }, [checkPermission]);

    return hasPermission;
}
