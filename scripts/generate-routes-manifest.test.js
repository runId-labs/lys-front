import {describe, it, expect} from "vitest";
import {
    extractBraceBlock,
    parseParamSpec,
    extractParams,
    unusableParams,
    extractChatbotBehaviour,
    extractStringArray,
    extractRootFields
} from "./generate-routes-manifest.js";

const configWithParams = `
const chatbotPrompt = \`You are on the orders page.\`;

export const config: PageDescriptionType = {
    name: "orders",
    path: "/orders",
    type: "private",
    chatbotBehaviour: {
        prompt: chatbotPrompt,
        contextTools: {listOrders: "List the orders"},
        specialTools: ["propose_memory", "propose_action"],
        params: {
            orderId: {type: "global_id"},
            status: {type: "enum", values: ["DRAFT", "PAID"], multiple: true, maxItems: 5},
            search: {type: "text"},
        },
    },
};
`;

describe("extractBraceBlock", () => {
    it("returns the block braces included", () => {
        expect(extractBraceBlock("a: {b: 1}", 3)).toBe("{b: 1}");
    });

    it("matches the closing brace across nesting", () => {
        expect(extractBraceBlock("{a: {b: 1}, c: 2}", 0)).toBe("{a: {b: 1}, c: 2}");
    });

    it("returns null when the block is never closed", () => {
        expect(extractBraceBlock("{a: {b: 1}", 0)).toBeNull();
    });

    it("returns null when the index is not an opening brace", () => {
        expect(extractBraceBlock("{a: 1}", 1)).toBeNull();
    });
});

describe("parseParamSpec", () => {
    it("translates maxItems to the manifest key", () => {
        expect(parseParamSpec('{type: "int", multiple: true, maxItems: 5}')).toEqual({
            type: "int",
            multiple: true,
            max_items: 5
        });
    });

    it("still reads maxLength, which unusableParams needs in order to refuse it", () => {
        expect(parseParamSpec('{type: "text", maxLength: 120}')).toEqual({type: "text", max_length: 120});
    });

    it("keeps the declared enum values in order", () => {
        expect(parseParamSpec('{type: "enum", values: ["DRAFT", "PAID"]}')).toEqual({
            type: "enum",
            values: ["DRAFT", "PAID"]
        });
    });

    it("omits what is not declared, so the validator fails closed on it", () => {
        expect(parseParamSpec('{type: "enum"}')).toEqual({type: "enum"});
        expect(parseParamSpec('{type: "text"}')).toEqual({type: "text"});
    });

    it("returns null without a type", () => {
        expect(parseParamSpec("{maxLength: 10}")).toBeNull();
    });
});

describe("extractParams", () => {
    it("extracts every declared param", () => {
        const params = extractParams(configWithParams);
        expect(params).toEqual({
            orderId: {type: "global_id"},
            status: {type: "enum", values: ["DRAFT", "PAID"], multiple: true, max_items: 5},
            search: {type: "text"}
        });
    });

    it("returns null when the page declares none", () => {
        expect(extractParams("chatbotBehaviour: {prompt: `hi`}")).toBeNull();
    });
});

describe("unusableParams", () => {
    it("accepts the declarations the validator uses as written", () => {
        expect(unusableParams("orders", {
            orderId: {type: "global_id"},
            status: {type: "enum", values: ["DRAFT", "PAID"], multiple: true, max_items: 5},
            search: {type: "text"}
        })).toEqual([]);
    });

    it("refuses an enum with nothing to match against", () => {
        const problems = unusableParams("orders", {status: {type: "enum"}});
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('param "status" declares enum without values');
    });

    it("refuses a text param that states its own length", () => {
        const problems = unusableParams("orders", {search: {type: "text", max_length: 40}});
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("declares maxLength, which is not the page's to state");
        // The number is NOT quoted: a deployment may raise the cap, and a message
        // carrying a copy of it would be the copy that goes stale.
        expect(problems[0]).not.toMatch(/\d/);
    });

    it("refuses a maxLength of zero, which truthiness would let through", () => {
        expect(unusableParams("orders", {search: {type: "text", max_length: 0}})).toHaveLength(1);
    });

    it("refuses a maxLength of 0, which states a length like any other", () => {
        expect(unusableParams("orders", {search: {type: "text", max_length: 0}})).toHaveLength(1);
    });

    it("refuses a text param whose length is at the framework cap all the same", () => {
        // The number matching today's cap is not the point: it is a second copy of it.
        expect(unusableParams("orders", {search: {type: "text", max_length: 80}})).toHaveLength(1);
    });

    it("refuses a multiple text, whatever it declares", () => {
        for (const spec of [
            {type: "text", multiple: true},
            {type: "text", multiple: true, max_items: 2},
            {type: "text", multiple: true, max_items: 50}
        ]) {
            const problems = unusableParams("orders", {tags: spec});
            expect(problems).toHaveLength(1);
            expect(problems[0]).toContain("is a multiple text, which is not allowed");
        }
    });

    it("leaves lists to the other types, which carry no prose", () => {
        expect(unusableParams("orders", {
            ids: {type: "global_id", multiple: true, max_items: 50}
        })).toEqual([]);
    });

    it("reports every problem of a page, so one run shows the whole fix", () => {
        expect(unusableParams("orders", {
            status: {type: "enum"},
            search: {type: "text", max_length: 40},
            tags: {type: "text", multiple: true, max_items: 20}
        })).toHaveLength(3);
    });

    it("names the page in each problem", () => {
        const [problem] = unusableParams("dashboard", {status: {type: "enum"}});
        expect(problem.startsWith("dashboard: ")).toBe(true);
    });
});

describe("extractChatbotBehaviour", () => {
    it("resolves a prompt held in a variable and emits the manifest keys", () => {
        const {behaviour} = extractChatbotBehaviour(configWithParams);
        expect(behaviour).toEqual({
            prompt: "You are on the orders page.",
            context_tools: {listOrders: "List the orders"},
            special_tools: ["propose_memory", "propose_action"]
        });
    });

    it("keeps every special tool, not just the last one", () => {
        const {behaviour} = extractChatbotBehaviour(
            'chatbotBehaviour: {specialTools: ["propose_memory", "propose_action"]}'
        );
        expect(behaviour.special_tools).toHaveLength(2);
    });

    it("returns the params of a behaviour that declares nothing else", () => {
        const {behaviour, params} = extractChatbotBehaviour(
            'chatbotBehaviour: {params: {id: {type: "uuid"}}}'
        );
        expect(behaviour).toBeNull();
        expect(params).toEqual({id: {type: "uuid"}});
    });

    it("returns nothing when the page has no chatbotBehaviour", () => {
        expect(extractChatbotBehaviour("const x = 1;")).toEqual({behaviour: null, params: null});
    });
});

describe("extractStringArray", () => {
    it("reads the declared global webservices", () => {
        expect(extractStringArray(
            'export const chatbotConfig = {globalWebservices: ["allDecisions"]};',
            "globalWebservices"
        )).toEqual(["allDecisions"]);
    });

    it("reads every entry, not just the last one", () => {
        expect(extractStringArray(
            'globalWebservices: ["allDecisions", "allContextEvents"]',
            "globalWebservices"
        )).toEqual(["allDecisions", "allContextEvents"]);
    });

    it("keeps extraWebservices reading what the pages declare", () => {
        expect(extractStringArray(
            'extraWebservices: ["allUsers", "createUser"]',
            "extraWebservices"
        )).toEqual(["allUsers", "createUser"]);
    });

    it("returns null when the property is absent, so a present config file is reported", () => {
        expect(extractStringArray("export const chatbotConfig = {};", "globalWebservices")).toBeNull();
    });
});

describe("extractRootFields", () => {
    it("reads every root field of a multi-root document, not just the first", () => {
        const text = "query GetDecisionQuery($id: ID!, $clientId: ID) { decision(id: $id) { id title } allCompanies(clientId: $clientId) { edges { node { id } } } allActions(decisionId: $id, first: 50) { edges { node { id } } } }";
        expect(extractRootFields(text)).toEqual(["decision", "allCompanies", "allActions"]);
    });

    it("never mistakes an argument or a subfield for a root", () => {
        const text = "query X($a: Int) { thing(arg: $a, other: \"v { brace }\") { subfield { deep } } }";
        expect(extractRootFields(text)).toEqual(["thing"]);
    });

    it("handles a mutation and an aliased root", () => {
        const text = "mutation M($i: MyInput!) { createAction(inputs: $i) { id } renamed: otherThing { id } }";
        expect(extractRootFields(text)).toEqual(["createAction", "otherThing"]);
    });

    it("reads a scalar root, alone or between subselection roots", () => {
        expect(extractRootFields("mutation M { ping }")).toEqual(["ping"]);
        expect(extractRootFields("mutation M { ping logout }")).toEqual(["ping", "logout"]);
        expect(extractRootFields("query X { thing { id } ping }")).toEqual(["thing", "ping"]);
    });

    it("ignores braces inside a string argument instead of losing the document", () => {
        const text = 'query X { thing(s: "a { b") { id } allX { id } }';
        expect(extractRootFields(text)).toEqual(["thing", "allX"]);
    });

    it("keeps the field a root directive is attached to, not the directive", () => {
        const text = "query X($s: Boolean!) { thing @include(if: $s) { id } allX { id } }";
        expect(extractRootFields(text)).toEqual(["thing", "allX"]);
    });

    it("reaches no webservice through a fragment spread or __typename", () => {
        expect(extractRootFields("query AppQuery { ...AppFragment }")).toEqual([]);
        expect(extractRootFields("query X { ...AppFragment thing { id } }")).toEqual(["thing"]);
        expect(extractRootFields("query X { __typename thing { id } }")).toEqual(["thing"]);
    });

    it("never takes an object default value in the variable definitions for the selection set", () => {
        const text = "query X($f: Filter = {a: 1}) { realRoot { id } }";
        expect(extractRootFields(text)).toEqual(["realRoot"]);
    });

    it("returns nothing without an operation header", () => {
        expect(extractRootFields("const x = 1;")).toEqual([]);
    });
});
