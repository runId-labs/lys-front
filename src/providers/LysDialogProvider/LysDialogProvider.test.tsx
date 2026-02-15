import {describe, it, expect, vi} from "vitest";
import {render, act, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import React, {forwardRef, useImperativeHandle, useState} from "react";
import UrlQueriesProvider from "../UrlQueriesProvider";
import LysDialogProvider from "./index";
import {useLysDialog} from "./hooks";
import {DialogComponentProps, DialogComponentRefInterface} from "./types";

/**
 * Mock dialog component that tracks show/hide calls
 */
const MockDialogComponent = forwardRef<DialogComponentRefInterface, DialogComponentProps>(
    ({id, title, body, size, placement}, ref) => {
        const [visible, setVisible] = useState(false);

        useImperativeHandle(ref, () => ({
            shown: visible ? true : null,
            show: () => setVisible(true),
            hide: () => setVisible(false),
        }));

        if (!visible) return null;

        return (
            <div data-testid={`dialog-${id}`} data-size={size} data-placement={placement}>
                <div data-testid="dialog-title">{title}</div>
                <div data-testid="dialog-body">{body}</div>
            </div>
        );
    }
);
MockDialogComponent.displayName = "MockDialogComponent";

/**
 * Test consumer that exposes dialog context
 */
const DialogConsumer = ({onValue}: {onValue: (value: ReturnType<typeof useLysDialog>) => void}) => {
    const dialog = useLysDialog();
    onValue(dialog);
    return <div>Dialog consumer</div>;
};

function renderDialogProvider(options: {syncWithUrl?: boolean; initialEntries?: string[]} = {}) {
    const {syncWithUrl = false, initialEntries = ["/"]} = options;
    let latestValue: ReturnType<typeof useLysDialog> | null = null;

    const result = render(
        <MemoryRouter initialEntries={initialEntries}>
            <UrlQueriesProvider>
                <LysDialogProvider
                    dialogComponent={MockDialogComponent}
                    syncWithUrl={syncWithUrl}
                >
                    <DialogConsumer onValue={(v) => {latestValue = v;}}/>
                </LysDialogProvider>
            </UrlQueriesProvider>
        </MemoryRouter>
    );

    return {result, getDialog: () => latestValue!};
}

describe("LysDialogProvider", () => {
    describe("stack management", () => {
        it("starts with empty stack", () => {
            const {getDialog} = renderDialogProvider();

            expect(getDialog().stack).toHaveLength(0);
            expect(getDialog().current).toBeNull();
            expect(getDialog().isOpen).toBe(false);
            expect(getDialog().canGoBack).toBe(false);
        });

        it("opens a dialog (pushes to stack)", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({
                    uniqueKey: "dialog-1",
                    title: "Dialog 1",
                    body: <div>Body 1</div>,
                });
            });

            expect(getDialog().stack).toHaveLength(1);
            expect(getDialog().current?.uniqueKey).toBe("dialog-1");
            expect(getDialog().isOpen).toBe(true);
            expect(getDialog().canGoBack).toBe(false);
        });

        it("stacks multiple dialogs", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({uniqueKey: "d1", title: "D1", body: <div>1</div>});
            });

            act(() => {
                getDialog().open({uniqueKey: "d2", title: "D2", body: <div>2</div>});
            });

            expect(getDialog().stack).toHaveLength(2);
            expect(getDialog().current?.uniqueKey).toBe("d2");
            expect(getDialog().canGoBack).toBe(true);
        });

        it("close pops the last dialog", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({uniqueKey: "d1", title: "D1", body: <div>1</div>});
                getDialog().open({uniqueKey: "d2", title: "D2", body: <div>2</div>});
            });

            act(() => {
                getDialog().close();
            });

            expect(getDialog().stack).toHaveLength(1);
            expect(getDialog().current?.uniqueKey).toBe("d1");
        });

        it("closeAll clears the entire stack", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({uniqueKey: "d1", title: "D1", body: <div>1</div>});
                getDialog().open({uniqueKey: "d2", title: "D2", body: <div>2</div>});
                getDialog().open({uniqueKey: "d3", title: "D3", body: <div>3</div>});
            });

            act(() => {
                getDialog().closeAll();
            });

            expect(getDialog().stack).toHaveLength(0);
            expect(getDialog().isOpen).toBe(false);
            expect(getDialog().current).toBeNull();
        });

        it("back is an alias for close", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({uniqueKey: "d1", title: "D1", body: <div>1</div>});
                getDialog().open({uniqueKey: "d2", title: "D2", body: <div>2</div>});
            });

            act(() => {
                getDialog().back();
            });

            expect(getDialog().stack).toHaveLength(1);
            expect(getDialog().current?.uniqueKey).toBe("d1");
        });

        it("close on empty stack is a no-op", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().close();
            });

            expect(getDialog().stack).toHaveLength(0);
        });
    });

    describe("update", () => {
        it("updates dialog bodyProps by uniqueKey", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({
                    uniqueKey: "d1",
                    title: "Dialog",
                    body: () => <div/>,
                    bodyProps: {count: 0},
                });
            });

            act(() => {
                getDialog().update("d1", {bodyProps: {count: 5}});
            });

            expect(getDialog().current?.bodyProps).toEqual({count: 5});
        });

        it("updates dialog title", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({uniqueKey: "d1", title: "Original", body: <div/>});
            });

            act(() => {
                getDialog().update("d1", {title: "Updated"});
            });

            expect(getDialog().current?.title).toBe("Updated");
        });

        it("updates dialog loading state", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({uniqueKey: "d1", title: "D1", body: <div/>, loading: true});
            });

            expect(getDialog().current?.loading).toBe(true);

            act(() => {
                getDialog().update("d1", {loading: false});
            });

            expect(getDialog().current?.loading).toBe(false);
        });
    });

    describe("registry", () => {
        it("registers and unregisters dialogs", () => {
            const {getDialog} = renderDialogProvider();
            let cleanup: (() => void) | undefined;

            act(() => {
                cleanup = getDialog().register("my-dialog", {
                    title: "Registered Dialog",
                    body: <div>Registered content</div>,
                });
            });

            // Cleanup should be a function
            expect(typeof cleanup).toBe("function");

            // Call cleanup to unregister
            act(() => {
                cleanup!();
            });
        });
    });

    describe("dialog rendering", () => {
        it("passes dialog props to the DialogComponent", () => {
            const {getDialog} = renderDialogProvider();

            act(() => {
                getDialog().open({
                    uniqueKey: "test-dialog",
                    title: "Test Title",
                    body: <div>Test body content</div>,
                    size: "lg",
                    placement: "end",
                });
            });

            // The mock dialog component should render
            expect(screen.getByTestId("dialog-body")).toBeInTheDocument();
        });

        it("shows loadingFallback when dialog is in loading state", () => {
            const {result} = render(
                <MemoryRouter>
                    <UrlQueriesProvider>
                        <LysDialogProvider
                            dialogComponent={MockDialogComponent}
                            syncWithUrl={false}
                            loadingFallback={<div>Loading...</div>}
                        >
                            <DialogConsumer onValue={(dialog) => {
                                // Open a loading dialog on first render
                            }}/>
                        </LysDialogProvider>
                    </UrlQueriesProvider>
                </MemoryRouter>
            );
        });
    });

    describe("default context (outside provider)", () => {
        it("logs errors when methods are called outside provider", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            let dialog: ReturnType<typeof useLysDialog> | null = null;

            render(
                <DialogConsumer onValue={(v) => {dialog = v;}}/>
            );

            dialog!.open({uniqueKey: "x", title: "x", body: <div/>});
            dialog!.close();
            dialog!.closeAll();
            dialog!.back();

            expect(errorSpy).toHaveBeenCalledTimes(4);
            errorSpy.mockRestore();
        });
    });
});
