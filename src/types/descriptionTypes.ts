import * as React from "react";
import {TranslationType} from "./i18nTypes";
import {PageTemplate, PageProps} from "./pageTypes";

export interface ComponentDescriptionType {
    translation?: TranslationType | undefined
}

export interface ChatbotBehaviourType {
    prompt?: string;
    contextTools?: Record<string, string>;
    /** Mapped to `RouteInterface.autoOpenChatbot`. */
    autoOpenOnEnter?: boolean;
    /** Mapped to `RouteInterface.showChatbotWelcome`. */
    showWelcomeMessage?: boolean;
}

export type PageDescriptionType = ComponentDescriptionType & {
    name: string
    component: React.ComponentType<PageProps>
    template?: PageTemplate | undefined
    type: "public" | "private"
    path: string
    breadcrumbs?: string[];
    options?: {[key: string] : string | number | boolean}
    /**
     * Webservice(s) gating access to the page.
     * - `string`: single webservice — user needs access to it.
     * - `string[]`: any-of semantics — user needs access to at least one.
     * - `undefined`: page has no permission gate.
     */
    mainWebserviceName?: string | string[] | undefined
    description?: string
    chatbotBehaviour?: ChatbotBehaviourType
    extraWebservices?: string[]
}
