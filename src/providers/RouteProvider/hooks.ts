import {createContext, useContext} from "react";
import {RouteInterface} from "../../types/routeTypes";

/**
 * Shape of the value exposed by the route context.
 */
export interface RouteContextValue {
    /** Currently active route (the one matching the URL). */
    route: RouteInterface | null;
    /** Default route used as fallback for authenticated users (e.g. home page). */
    defaultPrivateRoute: RouteInterface | null;
    /** Default route used as fallback for anonymous users (e.g. login page). */
    defaultPublicRoute: RouteInterface | null;
    /** All known routes keyed by route name for O(1) lookup. */
    allRoutes: Record<string, RouteInterface>;
    /** Look up a route by its name. */
    getRouteByName: (name: string) => RouteInterface | undefined;
}

const RouteContext = createContext<RouteContextValue>({
    route: null,
    defaultPrivateRoute: null,
    defaultPublicRoute: null,
    allRoutes: {},
    getRouteByName: () => undefined,
});

/**
 * Hook to access the active route, default routes and the route map.
 */
const useRouteInfo = () => useContext(RouteContext);

export {RouteContext, useRouteInfo};