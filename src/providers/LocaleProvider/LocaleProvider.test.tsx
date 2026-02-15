import {describe, it, expect} from "vitest";
import {render, act, screen} from "@testing-library/react";
import {useIntl} from "react-intl";
import LocaleProvider from "./index";
import {useLocale} from "./hooks";

/**
 * Test consumer exposing locale context and intl
 */
const LocaleConsumer = ({onValue}: {onValue: (ctx: ReturnType<typeof useLocale> & {intlLocale: string; message: string}) => void}) => {
    const ctx = useLocale();
    const intl = useIntl();
    const message = intl.formatMessage({id: "greeting", defaultMessage: "fallback"});
    onValue({...ctx, intlLocale: intl.locale, message});
    return <div>Locale: {ctx.locale}</div>;
};

const messageSources: Record<string, Record<string, string>> = {
    en: {greeting: "Hello"},
    fr: {greeting: "Bonjour"},
};

function renderLocaleProvider(defaultLocale = "en") {
    let latestValue: ReturnType<typeof useLocale> & {intlLocale: string; message: string} | null = null;

    const result = render(
        <LocaleProvider defaultLocale={defaultLocale} messageSources={messageSources}>
            <LocaleConsumer onValue={(v) => {latestValue = v;}}/>
        </LocaleProvider>
    );

    return {result, getValue: () => latestValue!};
}

describe("LocaleProvider", () => {
    it("renders children", () => {
        renderLocaleProvider();

        expect(screen.getByText(/Locale:/)).toBeInTheDocument();
    });

    it("provides default locale", () => {
        const {getValue} = renderLocaleProvider("en");

        expect(getValue().locale).toBe("en");
        expect(getValue().intlLocale).toBe("en");
    });

    it("provides messages for the current locale", () => {
        const {getValue} = renderLocaleProvider("en");

        expect(getValue().message).toBe("Hello");
    });

    it("updates locale dynamically", () => {
        const {getValue} = renderLocaleProvider("en");

        expect(getValue().locale).toBe("en");
        expect(getValue().message).toBe("Hello");

        act(() => {
            getValue().updateLocale("fr");
        });

        expect(getValue().locale).toBe("fr");
        expect(getValue().intlLocale).toBe("fr");
        expect(getValue().message).toBe("Bonjour");
    });

    it("returns empty messages for unknown locale", () => {
        const {getValue} = renderLocaleProvider("de" as any);

        // Unknown locale falls back to empty messages
        expect(getValue().locale).toBe("de");
        expect(getValue().message).toBe("fallback");
    });

    it("useLocale throws outside provider", () => {
        const ThrowingConsumer = () => {
            useLocale();
            return null;
        };

        expect(() => render(<ThrowingConsumer/>)).toThrow("useLocale must be used within LocaleProvider");
    });
});
