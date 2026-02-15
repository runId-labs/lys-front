import {describe, it, expect} from "vitest";
import {extractOperationNames, checkOperationsPermission} from "./relayTools";
import {GraphQLTaggedNode} from "relay-runtime";

/**
 * Create a minimal mock matching Relay's internal ConcreteRequest structure
 */
function mockGraphQLNode(selectionNames: string[]): GraphQLTaggedNode {
    return {
        operation: {
            selections: selectionNames.map(name => ({name})),
        },
    } as unknown as GraphQLTaggedNode;
}

describe("extractOperationNames", () => {
    it("extracts operation names from selections", () => {
        const node = mockGraphQLNode(["createUser", "updateUser"]);
        expect(extractOperationNames(node)).toEqual(["createUser", "updateUser"]);
    });

    it("returns empty array when no selections", () => {
        const node = {
            operation: {selections: []},
        } as unknown as GraphQLTaggedNode;
        expect(extractOperationNames(node)).toEqual([]);
    });

    it("returns empty array when no operation key", () => {
        const node = {} as unknown as GraphQLTaggedNode;
        expect(extractOperationNames(node)).toEqual([]);
    });

    it("skips selections without name", () => {
        const node = {
            operation: {
                selections: [
                    {name: "validOp"},
                    {kind: "LinkedField"},
                    {name: "anotherOp"},
                ],
            },
        } as unknown as GraphQLTaggedNode;
        expect(extractOperationNames(node)).toEqual(["validOp", "anotherOp"]);
    });
});

describe("checkOperationsPermission", () => {
    it("returns true when all operations pass", () => {
        const check = () => true;
        expect(checkOperationsPermission(["op1", "op2"], check)).toBe(true);
    });

    it("returns false when one operation fails", () => {
        const check = (name: string) => name !== "op2";
        expect(checkOperationsPermission(["op1", "op2"], check)).toBe(false);
    });

    it("returns false for empty array", () => {
        const check = () => true;
        expect(checkOperationsPermission([], check)).toBe(false);
    });

    it("returns false when all operations fail", () => {
        const check = () => false;
        expect(checkOperationsPermission(["op1"], check)).toBe(false);
    });
});
