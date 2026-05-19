import * as React from "react";
import {useCallback, useEffect, useMemo} from "react";
import {RouteInterface} from "../../types/routeTypes";
import {RouteContext} from "./hooks";
import {usePageContext} from "../PageContextProvider/hooks";
import {useUrlQueries} from "../UrlQueriesProvider/hooks";
import {useChatbot} from "../ChatbotProvider/hooks";
import PublicAppTemplate from "../../templates/PublicAppTemplate";

/**
 * Shape expected from any template component plugged into `RouteProvider`.
 *
 * Templates receive the same triplet (active route + default routes) so they
 * can render the page chrome and trigger any post-mount redirects.
 */
export interface RouteTemplateProps {
    route: RouteInterface;
    defaultPrivateRoute: RouteInterface;
    defaultPublicRoute: RouteInterface;
    children: React.ReactNode;
}

export interface RouteProviderProps {
    route: RouteInterface;
    routes: RouteInterface[];
    defaultPrivateRoute: RouteInterface;
    defaultPublicRoute: RouteInterface;
    /**
     * Template used when the active route's `type` is `"private"`.
     * Projects inject their own private template (e.g. with sidebar/topbar)
     * because the layout is project-specific.
     */
    privateTemplate: React.ComponentType<RouteTemplateProps>;
    /**
     * Optional override for public pages. Defaults to the generic
     * `PublicAppTemplate` shipped with lys-front (handles connected-user
     * redirects).
     */
    publicTemplate?: React.ComponentType<RouteTemplateProps>;
    children: React.ReactNode;
}

/**
 * Generic route provider:
 * - Exposes the active route, the route map and helpers via `useRouteInfo`.
 * - Wires the chatbot's `pageContext` to the current route + URL params.
 * - Auto-opens the chatbot for routes flagged with `autoOpenChatbot`.
 * - Renders the project-supplied template matching the route type.
 *
 * The two templates are injected as props so projects keep ownership of their
 * page chrome (sidebar, navbar, branding…) while reusing all the route plumbing.
 */
const RouteProvider: React.FC<RouteProviderProps> = ({
    route,
    routes,
    defaultPrivateRoute,
    defaultPublicRoute,
    privateTemplate: PrivateTemplate,
    publicTemplate: PublicTemplate = PublicAppTemplate,
    children,
}) => {
    /*******************************************************************************************************************
     *                                                  HOOKS
     ******************************************************************************************************************/

    const {setPageContext} = usePageContext();
    const {appliedParams} = useUrlQueries();
    const {setIsChatbotMode} = useChatbot();

    /*******************************************************************************************************************
     *                                                  EFFECTS
     ******************************************************************************************************************/

    /**
     * Update page context when route or URL params change so the chatbot can
     * reason about where the user currently is.
     * `orderBy` / `orderDir` get folded into a single GraphQL-friendly object
     * (e.g. `{createdAt: false}` for DESC) because consumers downstream expect
     * that shape.
     */
    useEffect(() => {
        const params: Record<string, string | number | boolean | object | null> = {};
        let orderByField: string | null = null;
        let orderDir: string | null = null;

        appliedParams.forEach((value, key) => {
            if (key === "orderBy") {
                orderByField = value;
                return;
            }
            if (key === "orderDir") {
                orderDir = value;
                return;
            }
            if (value !== "" && !isNaN(Number(value))) {
                params[key] = Number(value);
            } else {
                params[key] = value;
            }
        });

        if (orderByField) {
            const isAscending = orderDir !== "DESC";
            params.orderBy = {[orderByField]: isAscending};
        }

        setPageContext(route.name, params);
    }, [route.name, appliedParams, setPageContext]);

    /**
     * Auto-open the chatbot for routes that opt in.
     * Fires once on route change so the user can still close it manually
     * and it stays closed for the rest of the visit on that page.
     */
    useEffect(() => {
        if (route.autoOpenChatbot) {
            setIsChatbotMode(true);
        }
    }, [route.name, route.autoOpenChatbot, setIsChatbotMode]);

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    const allRoutes = useMemo(() => {
        const routesMap: Record<string, RouteInterface> = {};
        routes.forEach(r => {
            routesMap[r.name] = r;
        });
        return routesMap;
    }, [routes]);

    const getRouteByName = useCallback(
        (name: string): RouteInterface | undefined => allRoutes[name],
        [allRoutes]
    );

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <RouteContext.Provider value={{
            route,
            defaultPrivateRoute,
            defaultPublicRoute,
            allRoutes,
            getRouteByName,
        }}>
            {route.type === "public" && (
                <PublicTemplate
                    route={route}
                    defaultPublicRoute={defaultPublicRoute}
                    defaultPrivateRoute={defaultPrivateRoute}
                >
                    {children}
                </PublicTemplate>
            )}
            {route.type === "private" && (
                <PrivateTemplate
                    route={route}
                    defaultPublicRoute={defaultPublicRoute}
                    defaultPrivateRoute={defaultPrivateRoute}
                >
                    {children}
                </PrivateTemplate>
            )}
        </RouteContext.Provider>
    );
};

export default RouteProvider;