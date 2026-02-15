import {describe, it, expect} from "vitest";
import {
    isEmpty,
    validators,
    cleanParameters,
    getNestedValue,
    setNestedValue,
} from "./validationTools";

describe("isEmpty", () => {
    it("returns true for null", () => {
        expect(isEmpty(null)).toBe(true);
    });

    it("returns true for undefined", () => {
        expect(isEmpty(undefined)).toBe(true);
    });

    it("returns true for empty string", () => {
        expect(isEmpty("")).toBe(true);
    });

    it("returns true for whitespace-only string", () => {
        expect(isEmpty("   ")).toBe(true);
    });

    it("returns true for empty array", () => {
        expect(isEmpty([])).toBe(true);
    });

    it("returns true for empty object", () => {
        expect(isEmpty({})).toBe(true);
    });

    it("returns false for non-empty string", () => {
        expect(isEmpty("text")).toBe(false);
    });

    it("returns false for non-empty array", () => {
        expect(isEmpty([1])).toBe(false);
    });

    it("returns false for non-empty object", () => {
        expect(isEmpty({a: 1})).toBe(false);
    });

    it("returns false for 0", () => {
        expect(isEmpty(0)).toBe(false);
    });

    it("returns false for false", () => {
        expect(isEmpty(false)).toBe(false);
    });
});

describe("validators", () => {
    describe("required", () => {
        it("fails for empty string", () => {
            const v = validators.required("required");
            expect(v.method("")).toBe(false);
        });

        it("passes for non-empty string", () => {
            const v = validators.required("required");
            expect(v.method("text")).toBe(true);
        });

        it("fails for empty array", () => {
            const v = validators.required("required");
            expect(v.method([])).toBe(false);
        });

        it("passes for non-empty array", () => {
            const v = validators.required("required");
            expect(v.method(["a"])).toBe(true);
        });

        it("stores the error message", () => {
            const v = validators.required("Field is required");
            expect(v.errorMessage).toBe("Field is required");
        });
    });

    describe("email", () => {
        it("passes for valid email", () => {
            const v = validators.email("invalid");
            expect(v.method("user@example.com")).toBe(true);
        });

        it("fails for invalid email", () => {
            const v = validators.email("invalid");
            expect(v.method("not-an-email")).toBe(false);
        });

        it("passes for empty value (skip validation)", () => {
            const v = validators.email("invalid");
            expect(v.method("")).toBe(true);
        });

        it("passes for undefined value (skip validation)", () => {
            const v = validators.email("invalid");
            expect(v.method(undefined)).toBe(true);
        });
    });

    describe("minLength", () => {
        it("fails when below min", () => {
            const v = validators.minLength(5, "too short");
            expect(v.method("abc")).toBe(false);
        });

        it("passes when at min", () => {
            const v = validators.minLength(5, "too short");
            expect(v.method("abcde")).toBe(true);
        });

        it("passes for empty value (skip validation)", () => {
            const v = validators.minLength(5, "too short");
            expect(v.method("")).toBe(true);
        });
    });

    describe("maxLength", () => {
        it("fails when above max", () => {
            const v = validators.maxLength(3, "too long");
            expect(v.method("abcde")).toBe(false);
        });

        it("passes when at max", () => {
            const v = validators.maxLength(3, "too long");
            expect(v.method("abc")).toBe(true);
        });

        it("passes for empty value (skip validation)", () => {
            const v = validators.maxLength(3, "too long");
            expect(v.method("")).toBe(true);
        });
    });

    describe("pattern", () => {
        it("passes when matches pattern", () => {
            const v = validators.pattern(/^[A-Z]+$/, "uppercase only");
            expect(v.method("ABC")).toBe(true);
        });

        it("fails when does not match", () => {
            const v = validators.pattern(/^[A-Z]+$/, "uppercase only");
            expect(v.method("abc")).toBe(false);
        });

        it("passes for empty value (skip validation)", () => {
            const v = validators.pattern(/^[A-Z]+$/, "uppercase only");
            expect(v.method("")).toBe(true);
        });
    });

    describe("min", () => {
        it("fails when below min", () => {
            const v = validators.min(10, "too low");
            expect(v.method(5)).toBe(false);
        });

        it("passes when at min", () => {
            const v = validators.min(10, "too low");
            expect(v.method(10)).toBe(true);
        });

        it("passes when above min", () => {
            const v = validators.min(10, "too low");
            expect(v.method(15)).toBe(true);
        });

        it("passes for empty value (skip validation)", () => {
            const v = validators.min(10, "too low");
            expect(v.method(undefined)).toBe(true);
        });
    });

    describe("max", () => {
        it("fails when above max", () => {
            const v = validators.max(10, "too high");
            expect(v.method(15)).toBe(false);
        });

        it("passes when at max", () => {
            const v = validators.max(10, "too high");
            expect(v.method(10)).toBe(true);
        });

        it("passes when below max", () => {
            const v = validators.max(10, "too high");
            expect(v.method(5)).toBe(true);
        });

        it("passes for empty value (skip validation)", () => {
            const v = validators.max(10, "too high");
            expect(v.method(undefined)).toBe(true);
        });
    });

    describe("custom", () => {
        it("passes when custom function returns true", () => {
            const v = validators.custom((val) => val === "yes", "must be yes");
            expect(v.method("yes")).toBe(true);
        });

        it("fails when custom function returns false", () => {
            const v = validators.custom((val) => val === "yes", "must be yes");
            expect(v.method("no")).toBe(false);
        });
    });
});

describe("cleanParameters", () => {
    it("trims strings", () => {
        expect(cleanParameters({name: "  hello  "})).toEqual({name: "hello"});
    });

    it("converts empty strings to undefined", () => {
        expect(cleanParameters({name: ""})).toEqual({name: undefined});
    });

    it("converts whitespace-only strings to undefined", () => {
        expect(cleanParameters({name: "   "})).toEqual({name: undefined});
    });

    it("handles nested objects recursively", () => {
        expect(cleanParameters({
            user: {name: "  John  ", email: ""}
        })).toEqual({
            user: {name: "John", email: undefined}
        });
    });

    it("leaves non-string values unchanged", () => {
        expect(cleanParameters({count: 42, active: true})).toEqual({count: 42, active: true});
    });

    it("leaves arrays unchanged", () => {
        expect(cleanParameters({tags: ["a", "b"]})).toEqual({tags: ["a", "b"]});
    });
});

describe("getNestedValue", () => {
    it("gets simple key", () => {
        expect(getNestedValue({name: "John"}, "name")).toBe("John");
    });

    it("gets dot-path value", () => {
        expect(getNestedValue({a: {b: {c: "deep"}}}, "a.b.c")).toBe("deep");
    });

    it("returns undefined for invalid path", () => {
        expect(getNestedValue({a: 1}, "b.c")).toBe(undefined);
    });

    it("returns undefined when traversing non-object", () => {
        expect(getNestedValue({a: "string"}, "a.b")).toBe(undefined);
    });

    it("gets array value at key", () => {
        expect(getNestedValue({tags: ["a", "b"]}, "tags")).toEqual(["a", "b"]);
    });
});

describe("setNestedValue", () => {
    it("sets simple key", () => {
        expect(setNestedValue({}, "name", "John")).toEqual({name: "John"});
    });

    it("sets dot-path value", () => {
        expect(setNestedValue({}, "a.b.c", "deep")).toEqual({a: {b: {c: "deep"}}});
    });

    it("creates new object (immutable)", () => {
        const original = {a: 1};
        const result = setNestedValue(original, "b", 2);
        expect(result).toEqual({a: 1, b: 2});
        expect(result).not.toBe(original);
    });

    it("overwrites existing value", () => {
        expect(setNestedValue({a: {b: 1}}, "a.b", 2)).toEqual({a: {b: 2}});
    });

    it("preserves sibling keys in nested objects", () => {
        expect(setNestedValue({a: {b: 1, c: 2}}, "a.b", 99)).toEqual({a: {b: 99, c: 2}});
    });
});
