import {describe, it, expect} from "vitest";
import {lowerCaseFirstLetter, cn, toSnakeCase, numberToString} from "./stringTools";

describe("lowerCaseFirstLetter", () => {
    it("converts first letter to lowercase", () => {
        expect(lowerCaseFirstLetter("Hello")).toBe("hello");
    });

    it("returns string unchanged when already lowercase", () => {
        expect(lowerCaseFirstLetter("hello")).toBe("hello");
    });

    it("handles empty string", () => {
        expect(lowerCaseFirstLetter("")).toBe("");
    });

    it("handles single character", () => {
        expect(lowerCaseFirstLetter("A")).toBe("a");
    });
});

describe("cn", () => {
    it("joins multiple class names", () => {
        expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
    });

    it("filters out undefined", () => {
        expect(cn("foo", undefined, "bar")).toBe("foo bar");
    });

    it("filters out null", () => {
        expect(cn("foo", null, "bar")).toBe("foo bar");
    });

    it("filters out false", () => {
        expect(cn("foo", false, "bar")).toBe("foo bar");
    });

    it("filters out empty string", () => {
        expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("handles all falsy values", () => {
        expect(cn(undefined, null, false, "")).toBe("");
    });

    it("handles mixed truthy and falsy", () => {
        expect(cn("a", undefined, "b", false, "c", null, "")).toBe("a b c");
    });
});

describe("toSnakeCase", () => {
    it("converts camelCase to snake_case", () => {
        expect(toSnakeCase("camelCase")).toBe("camel_case");
    });

    it("converts PascalCase to snake_case", () => {
        expect(toSnakeCase("PascalCase")).toBe("_pascal_case");
    });

    it("returns already_snake unchanged", () => {
        expect(toSnakeCase("already_snake")).toBe("already_snake");
    });

    it("handles single word", () => {
        expect(toSnakeCase("word")).toBe("word");
    });

    it("handles consecutive uppercase", () => {
        expect(toSnakeCase("getHTTPResponse")).toBe("get_h_t_t_p_response");
    });
});

describe("numberToString", () => {
    it("converts integer", () => {
        expect(numberToString(42)).toBe("42");
    });

    it("converts float", () => {
        expect(numberToString(3.14)).toBe("3.14");
    });

    it("returns empty string for null", () => {
        expect(numberToString(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
        expect(numberToString(undefined)).toBe("");
    });

    it("passes through string that parses as number", () => {
        expect(numberToString("123")).toBe("123");
    });

    it("returns empty string for NaN", () => {
        expect(numberToString(NaN)).toBe("");
    });

    it("returns empty string for non-numeric string", () => {
        expect(numberToString("abc")).toBe("");
    });

    it("converts large number without scientific notation", () => {
        const result = numberToString(1e20);
        expect(result).not.toContain("e");
        expect(result).toBe("100000000000000000000");
    });
});
