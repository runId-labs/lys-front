import {JSXElementConstructor} from "react";
import {PageTemplate, PageProps} from "./pageTypes";

/**
 * Route interface
 */
export interface RouteInterface {
    // route name
    name: string
    // translation key
    transPrefix: string
    // route path
    path: string
    // route associated component
    component: JSXElementConstructor<PageProps>
    // page template
    template?: PageTemplate | undefined
    //page type
    type: "private" | "public"
    // route bread crumb (array of route names)
    breadcrumbs?: string[]
    // extra option array to configure a specific route behaviour
    options?: {[key: string] : string | number | boolean}
    // main webservice of the route (to check access)
    mainWebserviceName?: string | undefined
    // functional description for AI context (chatbot navigation)
    description?: string
}
