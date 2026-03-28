import {useCallback, useMemo, useTransition} from "react";
import {useNavigate} from "react-router-dom";
import {useWebserviceAccess} from "../WebserviceAccessProvider/hooks";
import {generateUrlByRoute} from "../../tools/routeTools";
import {RouteInterface} from "../../types/routeTypes";

const EMPTY_PARAMS: {[key: string]: string} = {};

export interface RestrictedLink {
    hasPermission: boolean;
    navigate: (() => void) | undefined;
}

/**
 * Hook to check route permission and provide navigation callback.
 *
 * Combines permission checking (via WebserviceAccessProvider) with
 * navigation (via react-router) for a given route.
 *
 * Usage:
 * ```tsx
 * const link = useRestrictedLink(route);
 * if (link.hasPermission) {
 *     <button onClick={link.navigate}>Go</button>
 * }
 * ```
 */
export function useRestrictedLink(
    route: RouteInterface | undefined,
    parameters: {[key: string]: string} = EMPTY_PARAMS,
    queryParameters: {[key: string]: string} = EMPTY_PARAMS
): RestrictedLink {
    const {checkWebserviceAccess} = useWebserviceAccess();
    const routerNavigate = useNavigate();
    const [, startTransition] = useTransition();

    const hasPermission = useMemo(() => {
        if (!route) return false;
        if (!route.mainWebserviceName) return true;
        return checkWebserviceAccess(route.mainWebserviceName);
    }, [route, checkWebserviceAccess]);

    const navigate = useCallback(() => {
        if (!route) return;
        startTransition(() => { routerNavigate(generateUrlByRoute(route, parameters, queryParameters)); });
    }, [route, routerNavigate, startTransition, parameters, queryParameters]);

    return {
        hasPermission,
        navigate: hasPermission ? navigate : undefined,
    };
}