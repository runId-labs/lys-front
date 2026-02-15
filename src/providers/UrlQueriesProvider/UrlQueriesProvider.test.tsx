import {describe, it, expect, vi} from "vitest";
import {render, act, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import UrlQueriesProvider from "./index";
import {useUrlQueries} from "./hooks";

/**
 * Test consumer exposing the URL queries context
 */
const TestConsumer = ({onValue}: {onValue: (value: ReturnType<typeof useUrlQueries>) => void}) => {
    const urlQueries = useUrlQueries();
    onValue(urlQueries);
    return <div>Consumer</div>;
};

function renderUrlQueriesProvider(initialEntries: string[] = ["/"]) {
    let latestValue: ReturnType<typeof useUrlQueries> | null = null;

    const result = render(
        <MemoryRouter initialEntries={initialEntries}>
            <UrlQueriesProvider>
                <TestConsumer onValue={(v) => {latestValue = v;}}/>
            </UrlQueriesProvider>
        </MemoryRouter>
    );

    return {result, getValue: () => latestValue!};
}

describe("UrlQueriesProvider", () => {
    it("renders children after initialization", () => {
        renderUrlQueriesProvider();
        expect(screen.getByText("Consumer")).toBeInTheDocument();
    });

    it("initializes stagedParams from URL search params", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=2&name=test"]);

        expect(getValue().stagedParams).toEqual({page: 2, name: "test"});
    });

    it("converts numeric URL values to numbers", () => {
        const {getValue} = renderUrlQueriesProvider(["/?count=42&price=9.99"]);

        expect(getValue().stagedParams.count).toBe(42);
        expect(getValue().stagedParams.price).toBe(9.99);
    });

    it("converts boolean URL values to booleans", () => {
        const {getValue} = renderUrlQueriesProvider(["/?active=true&deleted=false"]);

        expect(getValue().stagedParams.active).toBe(true);
        expect(getValue().stagedParams.deleted).toBe(false);
    });

    it("keeps string URL values as strings", () => {
        const {getValue} = renderUrlQueriesProvider(["/?name=hello&status=active"]);

        expect(getValue().stagedParams.name).toBe("hello");
        expect(getValue().stagedParams.status).toBe("active");
    });

    it("stage stages a change without updating URL", () => {
        const {getValue} = renderUrlQueriesProvider();

        act(() => {
            getValue().stage("filter", "new-value");
        });

        expect(getValue().stagedParams.filter).toBe("new-value");
        // URL should not have changed
        expect(getValue().appliedParams.get("filter")).toBeNull();
    });

    it("stage does not update state when value is unchanged", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1"]);

        const initialStaged = getValue().stagedParams;

        act(() => {
            getValue().stage("page", 1);
        });

        // Should be the same reference (no re-render trigger)
        expect(getValue().stagedParams).toBe(initialStaged);
    });

    it("edit applies a change immediately to URL", () => {
        const {getValue} = renderUrlQueriesProvider();

        act(() => {
            getValue().edit("page", 3);
        });

        expect(getValue().appliedParams.get("page")).toBe("3");
        expect(getValue().stagedParams.page).toBe(3);
    });

    it("edit removes param when value is null", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1"]);

        act(() => {
            getValue().edit("page", null);
        });

        expect(getValue().appliedParams.get("page")).toBeNull();
    });

    it("edit removes param when value is undefined", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1"]);

        act(() => {
            getValue().edit("page", undefined);
        });

        expect(getValue().appliedParams.get("page")).toBeNull();
    });

    it("apply applies all staged changes to URL", () => {
        const {getValue} = renderUrlQueriesProvider();

        act(() => {
            getValue().stage("page", 2);
            getValue().stage("size", 10);
        });

        // URL should not have changed yet
        expect(getValue().appliedParams.get("page")).toBeNull();
        expect(getValue().appliedParams.get("size")).toBeNull();

        act(() => {
            getValue().apply();
        });

        expect(getValue().appliedParams.get("page")).toBe("2");
        expect(getValue().appliedParams.get("size")).toBe("10");
    });

    it("update applies multiple params at once to URL", () => {
        const {getValue} = renderUrlQueriesProvider();

        act(() => {
            getValue().update({page: 1, size: 25, sort: "name"});
        });

        expect(getValue().appliedParams.get("page")).toBe("1");
        expect(getValue().appliedParams.get("size")).toBe("25");
        expect(getValue().appliedParams.get("sort")).toBe("name");
    });

    it("update removes params with null/undefined values", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1&size=10"]);

        act(() => {
            getValue().update({page: null, size: undefined});
        });

        expect(getValue().appliedParams.get("page")).toBeNull();
        expect(getValue().appliedParams.get("size")).toBeNull();
    });

    it("hasStagedChanges is false when staged params match URL", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1"]);

        expect(getValue().hasStagedChanges).toBe(false);
    });

    it("hasStagedChanges is true when staged params differ from URL", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1"]);

        act(() => {
            getValue().stage("page", 2);
        });

        expect(getValue().hasStagedChanges).toBe(true);
    });

    it("hasStagedChanges returns to false after apply", () => {
        const {getValue} = renderUrlQueriesProvider(["/?page=1"]);

        act(() => {
            getValue().stage("page", 2);
        });

        expect(getValue().hasStagedChanges).toBe(true);

        act(() => {
            getValue().apply();
        });

        expect(getValue().hasStagedChanges).toBe(false);
    });
});
