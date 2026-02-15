import * as React from "react";
import {TranslationType} from "./i18nTypes";
import {PageTemplate, PageProps} from "./pageTypes";

export interface ComponentDescriptionType {
    translation?: TranslationType | undefined
}

export interface ChatbotBehaviourType {
    prompt?: string;
    contextTools?: Record<string, string>;
}

export type PageDescriptionType = ComponentDescriptionType & {
    name: string
    component: React.ComponentType<PageProps>
    template?: PageTemplate | undefined
    type: "public" | "private"
    path: string
    breadcrumbs?: string[];
    options?: {[key: string] : string | number | boolean}
    mainWebserviceName?: string | undefined
    description?: string
    chatbotBehaviour?: ChatbotBehaviourType
    extraWebservices?: string[]
}
