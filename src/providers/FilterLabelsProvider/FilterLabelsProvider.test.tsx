import {describe, it, expect, vi, beforeEach} from "vitest";
import {render, screen} from "@testing-library/react";
import FilterLabelsProvider from "./index";
import {useFilterLabels} from "./hooks";

const STORAGE_KEY = "lys-filter-labels";

/**
 * Test component that exposes setLabel/getLabel
 */
const TestConsumer = ({testKey, onResult}: {testKey?: string; onResult: (result: {setLabel: (key: string, label: string) => void; getLabel: (key: string) => string}) => void}) => {
    const filterLabels = useFilterLabels();
    onResult(filterLabels);
    return <div>Label: {testKey ? filterLabels.getLabel(testKey) : "none"}</div>;
};

describe("FilterLabelsProvider", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("renders children", () => {
        render(
            <FilterLabelsProvider>
                <div>Child content</div>
            </FilterLabelsProvider>
        );

        expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("returns the key itself when no label is stored", () => {
        let result: {getLabel: (key: string) => string} | null = null;

        render(
            <FilterLabelsProvider>
                <TestConsumer onResult={(r) => {result = r;}}/>
            </FilterLabelsProvider>
        );

        expect(result!.getLabel("unknown-key")).toBe("unknown-key");
    });

    it("stores and retrieves labels via localStorage", () => {
        let result: {setLabel: (key: string, label: string) => void; getLabel: (key: string) => string} | null = null;

        render(
            <FilterLabelsProvider>
                <TestConsumer onResult={(r) => {result = r;}}/>
            </FilterLabelsProvider>
        );

        result!.setLabel("status-active", "Active");

        // Verify it was saved to localStorage
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored["status-active"]).toBe("Active");

        // Verify getLabel retrieves it
        expect(result!.getLabel("status-active")).toBe("Active");
    });

    it("stores multiple labels", () => {
        let result: {setLabel: (key: string, label: string) => void; getLabel: (key: string) => string} | null = null;

        render(
            <FilterLabelsProvider>
                <TestConsumer onResult={(r) => {result = r;}}/>
            </FilterLabelsProvider>
        );

        result!.setLabel("key1", "Label 1");
        result!.setLabel("key2", "Label 2");

        expect(result!.getLabel("key1")).toBe("Label 1");
        expect(result!.getLabel("key2")).toBe("Label 2");
    });

    it("overwrites existing label for the same key", () => {
        let result: {setLabel: (key: string, label: string) => void; getLabel: (key: string) => string} | null = null;

        render(
            <FilterLabelsProvider>
                <TestConsumer onResult={(r) => {result = r;}}/>
            </FilterLabelsProvider>
        );

        result!.setLabel("key1", "Original");
        result!.setLabel("key1", "Updated");

        expect(result!.getLabel("key1")).toBe("Updated");
    });

    it("handles corrupted localStorage gracefully", () => {
        // Set invalid JSON in localStorage
        localStorage.setItem(STORAGE_KEY, "not-valid-json");

        let result: {getLabel: (key: string) => string} | null = null;

        render(
            <FilterLabelsProvider>
                <TestConsumer onResult={(r) => {result = r;}}/>
            </FilterLabelsProvider>
        );

        // Should return key itself (fallback behavior)
        expect(result!.getLabel("some-key")).toBe("some-key");
    });

    it("handles localStorage errors gracefully on save", () => {
        const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });

        let result: {setLabel: (key: string, label: string) => void} | null = null;

        render(
            <FilterLabelsProvider>
                <TestConsumer onResult={(r) => {result = r;}}/>
            </FilterLabelsProvider>
        );

        // Should not throw
        expect(() => result!.setLabel("key", "value")).not.toThrow();

        setItemSpy.mockRestore();
    });

    it("provides default behavior outside provider (via context default)", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        let result: {setLabel: (key: string, label: string) => void; getLabel: (key: string) => string} | null = null;

        // Render consumer WITHOUT provider
        render(
            <TestConsumer onResult={(r) => {result = r;}}/>
        );

        // getLabel returns key itself (default behavior)
        expect(result!.getLabel("test-key")).toBe("test-key");

        // setLabel logs a warning
        result!.setLabel("key", "value");
        expect(warnSpy).toHaveBeenCalledWith("FilterLabelsProvider not initialized: setLabel");

        warnSpy.mockRestore();
    });
});
