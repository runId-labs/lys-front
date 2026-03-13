import {describe, it, expect} from "vitest";
import {render, act, screen} from "@testing-library/react";
import PageContextProvider from "./index";
import {usePageContext} from "./hooks";

/**
 * Test consumer exposing page context
 */
const PageContextConsumer = ({onValue}: {onValue: (ctx: ReturnType<typeof usePageContext>) => void}) => {
    const ctx = usePageContext();
    onValue(ctx);
    return <div>Page: {ctx.context.pageName ?? "none"}</div>;
};

function renderPageContextProvider() {
    let latestValue: ReturnType<typeof usePageContext> | null = null;

    const result = render(
        <PageContextProvider>
            <PageContextConsumer onValue={(v) => {latestValue = v;}}/>
        </PageContextProvider>
    );

    return {result, getValue: () => latestValue!};
}

describe("PageContextProvider", () => {
    it("renders children", () => {
        renderPageContextProvider();

        expect(screen.getByText("Page: none")).toBeInTheDocument();
    });

    it("starts with null pageName and empty params", () => {
        const {getValue} = renderPageContextProvider();

        expect(getValue().context.pageName).toBeNull();
        expect(getValue().context.params).toEqual({});
    });

    it("sets page context with name and params", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("DashboardPage", {companyId: "123", year: 2024});
        });

        expect(getValue().context.pageName).toBe("DashboardPage");
        expect(getValue().context.params).toEqual({companyId: "123", year: 2024});
    });

    it("sets page context with name only (default empty params)", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("HomePage");
        });

        expect(getValue().context.pageName).toBe("HomePage");
        expect(getValue().context.params).toEqual({});
    });

    it("clears page context", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("DashboardPage", {id: "1"});
        });

        expect(getValue().context.pageName).toBe("DashboardPage");

        act(() => {
            getValue().clearPageContext();
        });

        expect(getValue().context.pageName).toBeNull();
        expect(getValue().context.params).toEqual({});
    });

    it("overwrites previous context on new setPageContext", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("Page1", {a: 1});
        });

        act(() => {
            getValue().setPageContext("Page2", {b: 2});
        });

        expect(getValue().context.pageName).toBe("Page2");
        expect(getValue().context.params).toEqual({b: 2});
    });

    it("merges additional params via updatePageParams", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("DashboardPage", {companyId: "123"});
        });

        act(() => {
            getValue().updatePageParams({year: 2024, active: true});
        });

        expect(getValue().context.pageName).toBe("DashboardPage");
        expect(getValue().context.params).toEqual({companyId: "123", year: 2024, active: true});
    });

    it("overwrites existing param keys via updatePageParams", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("Page", {a: 1, b: 2});
        });

        act(() => {
            getValue().updatePageParams({b: 99, c: 3});
        });

        expect(getValue().context.params).toEqual({a: 1, b: 99, c: 3});
    });

    it("preserves pageName when updatePageParams is called", () => {
        const {getValue} = renderPageContextProvider();

        act(() => {
            getValue().setPageContext("MyPage", {x: 10});
        });

        act(() => {
            getValue().updatePageParams({y: 20});
        });

        expect(getValue().context.pageName).toBe("MyPage");
    });
});

describe("usePageContext (outside provider)", () => {
    it("returns default context with no-op functions", () => {
        let ctx: ReturnType<typeof usePageContext> | null = null;

        render(
            <PageContextConsumer onValue={(v) => {ctx = v;}}/>
        );

        expect(ctx!.context.pageName).toBeNull();
        expect(ctx!.context.params).toEqual({});

        // Should not throw
        ctx!.setPageContext("test");
        ctx!.updatePageParams({foo: "bar"});
        ctx!.clearPageContext();
    });
});
