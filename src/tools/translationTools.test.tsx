import {describe, it, expect} from "vitest";
import {render} from "@testing-library/react";
import {IntlProvider} from "react-intl";
import {createComponentTranslations} from "./translationTools";

describe("createComponentTranslations", () => {
    describe("config generation", () => {
        it("creates config with translation object", () => {
            const {config} = createComponentTranslations("TestFeature", {
                hello: {en: "Hello", fr: "Bonjour"},
            });

            expect(config.translation).toEqual({
                hello: {en: "Hello", fr: "Bonjour"},
            });
        });
    });

    describe("translation path inference", () => {
        it("infers features path for Feature suffix", () => {
            const {translationPath} = createComponentTranslations("LoginFeature", {
                title: {en: "Login", fr: "Connexion"},
            });

            expect(translationPath).toBe("lys.components.features.loginFeature");
        });

        it("infers elements path for Element suffix", () => {
            const {translationPath} = createComponentTranslations("ButtonElement", {
                label: {en: "Click", fr: "Cliquer"},
            });

            expect(translationPath).toBe("lys.components.elements.buttonElement");
        });

        it("infers pages path for Page suffix", () => {
            const {translationPath} = createComponentTranslations("DashboardPage", {
                title: {en: "Dashboard", fr: "Tableau de bord"},
            });

            expect(translationPath).toBe("lys.components.pages.dashboardPage");
        });

        it("infers restrictedFeatures path for Restricted suffix", () => {
            const {translationPath} = createComponentTranslations("AdminRestricted", {
                denied: {en: "Access denied", fr: "Accès refusé"},
            });

            expect(translationPath).toBe("lys.components.restrictedFeatures.adminRestricted");
        });

        it("infers providers path for Provider suffix", () => {
            const {translationPath} = createComponentTranslations("AlertProvider", {
                error: {en: "Error", fr: "Erreur"},
            });

            expect(translationPath).toBe("lys.components.providers.alertProvider");
        });

        it("throws for unknown component type", () => {
            expect(() => createComponentTranslations("SomeThing", {
                key: {en: "v", fr: "v"},
            })).toThrow("Cannot infer component type");
        });
    });

    describe("useTranslations hook", () => {
        it("translates keys using IntlProvider messages", () => {
            const {useTranslations} = createComponentTranslations("TestFeature", {
                greeting: {en: "Hello", fr: "Bonjour"},
                farewell: {en: "Goodbye", fr: "Au revoir"},
            });

            const messages = {
                "lys.components.features.testFeature.greeting": "Hello World",
                "lys.components.features.testFeature.farewell": "Goodbye World",
            };

            let translated: {greeting: string; farewell: string} | null = null;

            const Consumer = () => {
                const {t} = useTranslations();
                translated = {
                    greeting: t("greeting"),
                    farewell: t("farewell"),
                };
                return null;
            };

            render(
                <IntlProvider locale="en" messages={messages}>
                    <Consumer/>
                </IntlProvider>
            );

            expect(translated!.greeting).toBe("Hello World");
            expect(translated!.farewell).toBe("Goodbye World");
        });

        it("returns the message ID when key is missing", () => {
            const {useTranslations} = createComponentTranslations("TestFeature", {
                missing: {en: "Missing", fr: "Manquant"},
            });

            let result: string | null = null;

            const Consumer = () => {
                const {t} = useTranslations();
                result = t("missing");
                return null;
            };

            render(
                <IntlProvider locale="en" messages={{}}>
                    <Consumer/>
                </IntlProvider>
            );

            // When key is not in messages, intl returns the message ID
            expect(result).toBe("lys.components.features.testFeature.missing");
        });

        it("returns the raw key when fallbackToKey is true and key is missing", () => {
            const {useTranslations} = createComponentTranslations("TestFeature", {
                missing: {en: "Missing", fr: "Manquant"},
            });

            let result: string | null = null;

            const Consumer = () => {
                const {t} = useTranslations();
                result = t("missing", {fallbackToKey: true});
                return null;
            };

            render(
                <IntlProvider locale="en" messages={{}}>
                    <Consumer/>
                </IntlProvider>
            );

            expect(result).toBe("missing");
        });

        it("supports interpolation values", () => {
            const {useTranslations} = createComponentTranslations("TestFeature", {
                welcome: {en: "Welcome {name}", fr: "Bienvenue {name}"},
            });

            const messages = {
                "lys.components.features.testFeature.welcome": "Welcome {name}",
            };

            let result: string | null = null;

            const Consumer = () => {
                const {t} = useTranslations();
                result = t("welcome", {values: {name: "Alice"}});
                return null;
            };

            render(
                <IntlProvider locale="en" messages={messages}>
                    <Consumer/>
                </IntlProvider>
            );

            expect(result).toBe("Welcome Alice");
        });
    });

    describe("translationKeys", () => {
        it("exposes translation keys", () => {
            const {translationKeys} = createComponentTranslations("TestFeature", {
                title: {en: "Title", fr: "Titre"},
                body: {en: "Body", fr: "Corps"},
            });

            expect(translationKeys).toEqual(["title", "body"]);
        });
    });

    describe("custom pathBase", () => {
        it("uses custom path base", () => {
            const {translationPath} = createComponentTranslations(
                "TestFeature",
                {key: {en: "v", fr: "v"}},
                "app.custom."
            );

            expect(translationPath).toBe("app.custom.features.testFeature");
        });
    });
});
