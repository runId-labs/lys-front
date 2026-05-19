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
    /**
     * Webservice(s) gating access to the route.
     * - `string`: single webservice — user needs access to it.
     * - `string[]`: any-of semantics — user needs access to at least one.
     * - `undefined`: route has no permission gate.
     */
    mainWebserviceName?: string | string[] | undefined
    // functional description for AI context (chatbot navigation)
    description?: string
    /** If true, the chatbot is automatically opened when the user enters this route. */
    autoOpenChatbot?: boolean
    /**
     * If true, an empty-conversation welcome message is shown in the chatbot.
     * The message is resolved against the translation key `<transPrefix>chatbotWelcome`;
     * if no translation exists, react-intl displays the key as-is.
     */
    showChatbotWelcome?: boolean
}
