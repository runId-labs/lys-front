import {describe, it, expect} from "vitest";
import {generateI18nMessage, mergeI18nMessages} from "./i18nTools";

describe("generateI18nMessage", () => {
    it("generates flat translations for each locale", () => {
        const table = {
            greeting: {
                translation: {
                    en: "Hello",
                    fr: "Bonjour",
                },
            },
        };

        const result = generateI18nMessage(["en", "fr"], table);
        expect(result.en).toEqual({greeting: "Hello"});
        expect(result.fr).toEqual({greeting: "Bonjour"});
    });

    it("handles nested translations", () => {
        const table = {
            user: {
                name: {
                    translation: {
                        en: "Name",
                        fr: "Nom",
                    },
                },
                email: {
                    translation: {
                        en: "Email",
                        fr: "Courriel",
                    },
                },
            },
        };

        const result = generateI18nMessage(["en"], table);
        expect(result.en["user.name"]).toBe("Name");
        expect(result.en["user.email"]).toBe("Email");
    });

    it("returns empty object for missing locale", () => {
        const table = {
            greeting: {
                translation: {
                    en: "Hello",
                },
            },
        };

        const result = generateI18nMessage(["de"], table);
        expect(result.de).toEqual({});
    });

    it("applies prefix to keys", () => {
        const table = {
            title: {
                translation: {
                    en: "Dashboard",
                },
            },
        };

        const result = generateI18nMessage(["en"], table, "app.pages");
        expect(result.en["app.pages.title"]).toBe("Dashboard");
    });

    it("handles empty table", () => {
        const result = generateI18nMessage(["en"], {});
        expect(result.en).toEqual({});
    });

    it("handles deeply nested structure", () => {
        const table = {
            a: {
                b: {
                    c: {
                        translation: {
                            en: "deep value",
                        },
                    },
                },
            },
        };

        const result = generateI18nMessage(["en"], table);
        expect(result.en["a.b.c"]).toBe("deep value");
    });
});

describe("mergeI18nMessages", () => {
    it("merges two translation tables", () => {
        const table1 = {en: {hello: "Hello"}, fr: {hello: "Bonjour"}};
        const table2 = {en: {bye: "Goodbye"}, fr: {bye: "Au revoir"}};

        const result = mergeI18nMessages(["en", "fr"], table1, table2);
        expect(result.en).toEqual({hello: "Hello", bye: "Goodbye"});
        expect(result.fr).toEqual({hello: "Bonjour", bye: "Au revoir"});
    });

    it("last wins on overlapping keys", () => {
        const table1 = {en: {key: "first"}};
        const table2 = {en: {key: "second"}};

        const result = mergeI18nMessages(["en"], table1, table2);
        expect(result.en.key).toBe("second");
    });

    it("handles empty tables", () => {
        const result = mergeI18nMessages(["en"], {}, {});
        expect(result.en).toEqual({});
    });

    it("handles locale present in one table but not another", () => {
        const table1 = {en: {hello: "Hello"}};
        const table2 = {fr: {hello: "Bonjour"}};

        const result = mergeI18nMessages(["en", "fr"], table1, table2);
        expect(result.en).toEqual({hello: "Hello"});
        expect(result.fr).toEqual({hello: "Bonjour"});
    });

    it("handles multiple tables", () => {
        const t1 = {en: {a: "1"}};
        const t2 = {en: {b: "2"}};
        const t3 = {en: {c: "3"}};

        const result = mergeI18nMessages(["en"], t1, t2, t3);
        expect(result.en).toEqual({a: "1", b: "2", c: "3"});
    });
});
