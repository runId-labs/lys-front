import {describe, expect, it} from "vitest";
import {errorTranslations, isErrorKey} from "./errors";

describe("errorTranslations", () => {
    it("provides both en and fr translations for every key", () => {
        Object.entries(errorTranslations).forEach(([key, translation]) => {
            expect(translation.en, `${key}.en`).toBeTruthy();
            expect(translation.fr, `${key}.fr`).toBeTruthy();
        });
    });

    it("includes the newly added subscription/discount error keys", () => {
        const newKeys = [
            "USER_ALREADY_LICENSED",
            "USER_NOT_LICENSED",
            "NO_ACTIVE_SUBSCRIPTION",
            "SUBSCRIPTION_EXPIRED",
            "SUBSCRIPTION_INACTIVE",
            "SUBSCRIPTION_ALREADY_EXISTS",
            "QUOTA_EXCEEDED",
            "FEATURE_NOT_AVAILABLE",
            "DOWNGRADE_RULE_NOT_FOUND",
            "DISCOUNT_NOT_FOUND",
            "DISCOUNT_NOT_AVAILABLE",
            "DISCOUNT_ALREADY_GRANTED",
            "DISCOUNT_WITHOUT_PRICE"
        ];

        newKeys.forEach((key) => {
            expect(isErrorKey(key)).toBe(true);
        });
    });
});

describe("isErrorKey", () => {
    it("returns true for a known error key", () => {
        expect(isErrorKey("UNKNOWN_ERROR")).toBe(true);
    });

    it("returns false for an unknown key", () => {
        expect(isErrorKey("NOT_A_REAL_ERROR_KEY")).toBe(false);
    });
});
