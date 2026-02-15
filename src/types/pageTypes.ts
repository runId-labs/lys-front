import * as React from "react";
import {RouteInterface} from "./routeTypes";

/**
 * Page component properties interface
 */
export interface PageProps {
    route: RouteInterface
}

/**
 * Page template properties interface
 */
interface PageTemplateProps {
    route: RouteInterface
}

/**
 * Page template type
 */
export type PageTemplate = React.ComponentType<PageTemplateProps>;
