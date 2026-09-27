import {describe, it, expect} from "vitest";
import {
    extractBraceBlock,
    parseParamSpec,
    extractParams,
    extractChatbotBehaviour
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
            search: {type: "text", maxLength: 120},
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
    it("translates maxLength and maxItems to the manifest keys", () => {
        expect(parseParamSpec('{type: "text", maxLength: 120}')).toEqual({type: "text", max_length: 120});
        expect(parseParamSpec('{type: "int", multiple: true, maxItems: 5}')).toEqual({
            type: "int",
            multiple: true,
            max_items: 5
        });
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
            search: {type: "text", max_length: 120}
        });
    });

    it("returns null when the page declares none", () => {
        expect(extractParams("chatbotBehaviour: {prompt: `hi`}")).toBeNull();
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
