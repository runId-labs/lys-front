import * as React from "react";
import {TranslationType} from "./i18nTypes";
import {PageTemplate, PageProps} from "./pageTypes";

export interface ComponentDescriptionType {
    translation?: TranslationType | undefined
}

/**
 * A declarable page-param type, mirrored from the lys validator
 * (`lys/apps/ai/utils/page_params.py`). Everything but `text` is a closed shape:
 * a value either parses or it is dropped, and no value that parses can carry an
 * instruction. `text` is the one type that can bring prose into the prompt, so it
 * only exists under an explicit cap.
 */
export type ChatbotParamType =
    | "global_id"
    | "uuid"
    | "int"
    | "bool"
    | "date"
    | "enum"
    | "text"

/** Options that apply whatever the param type is. */
interface ChatbotParamListOptions {
    /** List-valued param (a multi-select filter). One invalid item drops the whole list. */
    multiple?: boolean
    /** Cap on a list-valued param's length. Defaults to 50 server-side. */
    maxItems?: number
    /**
     * The model may SET this param (`set_page_params`, `navigate` arrival
     * filters). Reading is every declared param; writing is only the ones
     * marked here — off by default, so a page opts in per param.
     */
    writable?: boolean
    /**
     * Component state, not a URL filter: the value travels through
     * `updatePageParams` (page context), never through the URL. Reading is
     * the same declared-schema boundary; writing routes to the page context
     * instead of `useUrlQueries` — an internal flag never lands in the URL.
     */
    internal?: boolean
}

/**
 * One declared param, discriminated on `type` so an option a type ignores cannot
 * be set: `values` belongs to `enum`, `maxLength` to `text`. Both are required
 * because the validator fails closed on a declaration it cannot use — an `enum`
 * without values and a `text` without a cap accept nothing at all.
 *
 * Written in camelCase here, like the rest of the page description;
 * `scripts/generate-routes-manifest.js` emits the manifest keys
 * (`max_length`, `max_items`) the validator reads.
 */
export type ChatbotParamSpec = ChatbotParamListOptions & (
    | { type: "enum"; values: string[] }
    | { type: "text"; maxLength: number }
    | { type: Exclude<ChatbotParamType, "enum" | "text"> }
)

export interface ChatbotBehaviourType {
    prompt?: string;
    contextTools?: Record<string, string>;
    /**
     * Special tools the page opts into (`propose_memory`, `propose_action`...).
     * A tool the page does not list is not offered to the model on that page:
     * the manifest entry is the gate, the same way `params` is for screen state.
     */
    specialTools?: string[];
    /**
     * Declared URL params the chatbot may read. This is a contract, not an
     * enforcement point: the guarantee is the lys validator
     * (`validate_page_params`), which renders to the model only what the routes
     * manifest declares and drops the rest with a `[PageParams]` log line.
     * Declaring a param here changes nothing until the manifest carries it, and
     * nothing on this side can widen what the server accepts.
     *
     * Lifted to the route level in the generated manifest (that is where the
     * validator reads it), so a page declares it next to the prompt that must
     * document each key — meaning, and the default when the param is absent.
     */
    params?: Record<string, ChatbotParamSpec>;
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
