import {describe, it, expect, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import ErrorBoundaryProvider from "./index";

const ThrowingComponent = ({error}: {error: Error}) => {
    throw error;
};

const SafeComponent = () => <div>Safe content</div>;

describe("ErrorBoundaryProvider", () => {
    it("renders children when no error occurs", () => {
        render(
            <ErrorBoundaryProvider>
                <SafeComponent/>
            </ErrorBoundaryProvider>
        );

        expect(screen.getByText("Safe content")).toBeInTheDocument();
    });

    it("renders fallback when a child throws", () => {
        // Suppress React error boundary console output
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        render(
            <ErrorBoundaryProvider fallback={<div>Error fallback</div>}>
                <ThrowingComponent error={new Error("test error")}/>
            </ErrorBoundaryProvider>
        );

        expect(screen.getByText("Error fallback")).toBeInTheDocument();
        expect(screen.queryByText("Safe content")).not.toBeInTheDocument();

        spy.mockRestore();
    });

    it("renders null when a child throws and no fallback is provided", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        const {container} = render(
            <ErrorBoundaryProvider>
                <ThrowingComponent error={new Error("test error")}/>
            </ErrorBoundaryProvider>
        );

        expect(container.innerHTML).toBe("");

        spy.mockRestore();
    });

    it("calls onError callback in componentDidCatch with the error", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const onError = vi.fn();
        const error = new Error("test error");

        render(
            <ErrorBoundaryProvider onError={onError} fallback={<div>Error</div>}>
                <ThrowingComponent error={error}/>
            </ErrorBoundaryProvider>
        );

        expect(onError).toHaveBeenCalledOnce();
        expect(onError).toHaveBeenCalledWith(error);

        spy.mockRestore();
    });

    it("does not call onError when no error occurs", () => {
        const onError = vi.fn();

        render(
            <ErrorBoundaryProvider onError={onError}>
                <SafeComponent/>
            </ErrorBoundaryProvider>
        );

        expect(onError).not.toHaveBeenCalled();
    });

    it("does not catch errors from outside its subtree", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const onError = vi.fn();

        // ErrorBoundary wraps SafeComponent, ThrowingComponent is a sibling
        // React error boundaries only catch errors in their children
        expect(() => {
            render(
                <div>
                    <ErrorBoundaryProvider onError={onError} fallback={<div>Error</div>}>
                        <SafeComponent/>
                    </ErrorBoundaryProvider>
                    <ThrowingComponent error={new Error("sibling error")}/>
                </div>
            );
        }).toThrow("sibling error");

        // onError should not be called for sibling errors
        expect(onError).not.toHaveBeenCalled();

        spy.mockRestore();
    });
});
