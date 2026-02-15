import {describe, it, expect, vi} from "vitest";
import {render, screen, act} from "@testing-library/react";
import AlertMessageProvider from "./index";
import {useAlertMessages} from "./hooks";
import {DatedAlertMessageType} from "./types";

/**
 * Test component that exposes the merge function
 */
const TestConsumer = ({onMount}: {onMount: (merge: (messages: {text: string; level: string}[]) => void) => void}) => {
    const {merge} = useAlertMessages();
    onMount(merge);
    return <div>Consumer</div>;
};

/**
 * Helper to render AlertMessageProvider with a test consumer
 */
function renderWithAlertProvider(alertGeneratorSpy?: ReturnType<typeof vi.fn>) {
    const alertGenerator = alertGeneratorSpy ?? vi.fn(() => null);
    let mergeFn: (messages: {text: string; level: string}[]) => void = () => {};

    render(
        <AlertMessageProvider alertGenerator={alertGenerator}>
            <TestConsumer onMount={(merge) => {mergeFn = merge;}}/>
        </AlertMessageProvider>
    );

    return {alertGenerator, merge: mergeFn};
}

describe("AlertMessageProvider", () => {
    it("renders children", () => {
        render(
            <AlertMessageProvider alertGenerator={() => null}>
                <div>Child content</div>
            </AlertMessageProvider>
        );

        expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("calls alertGenerator with empty messages initially", () => {
        const alertGenerator = vi.fn(() => null);

        render(
            <AlertMessageProvider alertGenerator={alertGenerator}>
                <div>Child</div>
            </AlertMessageProvider>
        );

        expect(alertGenerator).toHaveBeenCalledWith([], expect.any(Function));
    });

    it("merges messages and assigns unique IDs", () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const {alertGenerator, merge} = renderWithAlertProvider();

        act(() => {
            merge([
                {text: "Info message", level: "INFO"},
                {text: "Success message", level: "SUCCESS"},
            ]);
        });

        const lastCall = alertGenerator.mock.calls[alertGenerator.mock.calls.length - 1];
        const messages: DatedAlertMessageType[] = lastCall[0];

        expect(messages).toHaveLength(2);
        expect(messages[0].text).toBe("Info message");
        expect(messages[0].level).toBe("INFO");
        expect(messages[0].id).toMatch(/^alert-\d+-\d+$/);
        expect(messages[0].createdAt).toBeInstanceOf(Date);
        expect(messages[1].text).toBe("Success message");
        // IDs should be unique
        expect(messages[0].id).not.toBe(messages[1].id);

        vi.restoreAllMocks();
    });

    it("logs ERROR and CRITICAL to console.error", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const {merge} = renderWithAlertProvider();

        act(() => {
            merge([{text: "Error msg", level: "ERROR"}]);
        });

        expect(errorSpy).toHaveBeenCalledWith("[ERROR]", "Error msg");

        act(() => {
            merge([{text: "Critical msg", level: "CRITICAL"}]);
        });

        expect(errorSpy).toHaveBeenCalledWith("[CRITICAL]", "Critical msg");

        errorSpy.mockRestore();
    });

    it("logs WARNING to console.warn", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const {merge} = renderWithAlertProvider();

        act(() => {
            merge([{text: "Warning msg", level: "WARNING"}]);
        });

        expect(warnSpy).toHaveBeenCalledWith("[WARNING]", "Warning msg");

        warnSpy.mockRestore();
    });

    it("logs INFO and SUCCESS to console.log", () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const {merge} = renderWithAlertProvider();

        act(() => {
            merge([{text: "Info msg", level: "INFO"}]);
        });

        expect(logSpy).toHaveBeenCalledWith("[INFO]", "Info msg");

        act(() => {
            merge([{text: "Success msg", level: "SUCCESS"}]);
        });

        expect(logSpy).toHaveBeenCalledWith("[SUCCESS]", "Success msg");

        logSpy.mockRestore();
    });

    it("does not add messages when given an empty array", () => {
        const alertGenerator = vi.fn(() => null);
        let mergeFn: (messages: {text: string; level: string}[]) => void = () => {};

        render(
            <AlertMessageProvider alertGenerator={alertGenerator}>
                <TestConsumer onMount={(merge) => {mergeFn = merge;}}/>
            </AlertMessageProvider>
        );

        const callCountBefore = alertGenerator.mock.calls.length;

        act(() => {
            mergeFn([]);
        });

        // Should not trigger a re-render (no state change)
        expect(alertGenerator.mock.calls.length).toBe(callCountBefore);
    });

    it("removes a message by index", () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const alertGenerator = vi.fn(() => null);
        let mergeFn: (messages: {text: string; level: string}[]) => void = () => {};

        render(
            <AlertMessageProvider alertGenerator={alertGenerator}>
                <TestConsumer onMount={(merge) => {mergeFn = merge;}}/>
            </AlertMessageProvider>
        );

        // Add two messages
        act(() => {
            mergeFn([
                {text: "First", level: "INFO"},
                {text: "Second", level: "INFO"},
            ]);
        });

        // Get the remove function from the last call
        const lastCallAfterMerge = alertGenerator.mock.calls[alertGenerator.mock.calls.length - 1];
        const removeFn = lastCallAfterMerge[1];

        // Remove first message (index 0)
        act(() => {
            removeFn(0);
        });

        const finalCall = alertGenerator.mock.calls[alertGenerator.mock.calls.length - 1];
        const remainingMessages: DatedAlertMessageType[] = finalCall[0];

        expect(remainingMessages).toHaveLength(1);
        expect(remainingMessages[0].text).toBe("Second");

        vi.restoreAllMocks();
    });

    it("accumulates messages across multiple merge calls", () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const {alertGenerator, merge} = renderWithAlertProvider();

        act(() => {
            merge([{text: "First", level: "INFO"}]);
        });

        act(() => {
            merge([{text: "Second", level: "INFO"}]);
        });

        const lastCall = alertGenerator.mock.calls[alertGenerator.mock.calls.length - 1];
        const messages: DatedAlertMessageType[] = lastCall[0];

        expect(messages).toHaveLength(2);
        expect(messages[0].text).toBe("First");
        expect(messages[1].text).toBe("Second");

        vi.restoreAllMocks();
    });
});
