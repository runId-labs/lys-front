import {useCallback} from "react";
import {useWebserviceAccess} from "../WebserviceAccessProvider/hooks";
import {useRouteInfo} from "../RouteProvider/hooks";
import {RouteInterface} from "../../types/routeTypes";

/**
 * Hook that returns a function reporting whether the current user has
 * access to a given route.
 *
 * The returned function accepts either a `RouteInterface` (when the caller
 * already has the route resolved) or a route name (the hook performs the
 * lookup against the `RouteProvider`'s map). `undefined` always returns
 * `false`.
 *
 * Permission semantics for `route.mainWebserviceName`:
 * - `undefined` → no permission gate → access granted.
 * - `string`    → access requires that single webservice.
 * - `string[]`  → any-of: access granted as soon as the user has at least
 *                 one of the listed webservices.
 *
 * Usage:
 * ```tsx
 * const hasAccess = useRouteAccess();
 * hasAccess(route);                // route already resolved
 * hasAccess("AdministrationPage"); // resolved internally via RouteProvider
 * hasAccess(undefined);            // false
 * ```
 */
export const useRouteAccess = () => {
    const {checkWebserviceAccess} = useWebserviceAccess();
    const {getRouteByName} = useRouteInfo();

    return useCallback(
        (routeOrName: RouteInterface | string | undefined): boolean => {
            if (!routeOrName) return false;

            const route = typeof routeOrName === "string"
                ? getRouteByName(routeOrName)
                : routeOrName;

            if (!route) return false;
            if (!route.mainWebserviceName) return true;

            if (Array.isArray(route.mainWebserviceName)) {
                return route.mainWebserviceName.some(checkWebserviceAccess);
            }
            return checkWebserviceAccess(route.mainWebserviceName);
        },
        [checkWebserviceAccess, getRouteByName]
    );
};