import {describe, it, expect, vi, beforeEach} from "vitest";
import {render, act, screen} from "@testing-library/react";
import React from "react";
import {ConnectedUserContext} from "../ConnectedUserProvider/hooks";
import {WebserviceAccessContext} from "../WebserviceAccessProvider/hooks";
import {AlertMessageContext} from "../AlertMessageProvider/hooks";
import {createMockConnectedUserContext, createMockWebserviceAccessContext} from "../../test/test-utils";
import RefreshSignalContext, {RefreshSignal} from "./RefreshSignalContext";
import LysLoadingContext from "./LysLoadingContext";
import {useLysQuery} from "./hooks";

/**
 * Mock react-relay
 */
let mockQueryRef: object | null = null;
let mockLoadQuery: ReturnType<typeof vi.fn>;
let mockDisposeQuery: ReturnType<typeof vi.fn>;
let mockPreloadedData: Record<string, unknown> = {};
let mockPreloadedError: Error | null = null;

vi.mock("react-relay", () => ({
    graphql: (strings: TemplateStringsArray) => ({__mock: true, text: strings[0]}),
    useQueryLoader: () => [mockQueryRef, mockLoadQuery, mockDisposeQuery],
    usePreloadedQuery: () => {
        if (mockPreloadedError) throw mockPreloadedError;
        return mockPreloadedData;
    },
}));

vi.mock("./styles.scss", () => ({}));

// Import after mocks
import LysQueryProvider from "./index";

/**
 * Mock query node simulating a compiled Relay ConcreteRequest
 */
const mockQuery = {
    params: {name: "TestQuery"},
    operation: {
        selections: [{name: "testWebservice"}],
    },
} as any;

/**
 * Test consumer exposing LysQuery context
 */
const QueryConsumer = ({onValue}: {onValue: (ctx: ReturnType<typeof useLysQuery>) => void}) => {
    const ctx = useLysQuery();
    onValue(ctx);
    return <div>Query consumer</div>;
};

function renderLysQueryProvider(options: {
    hasAccess?: boolean;
    accessLevels?: string[];
    user?: any;
    queryRef?: object | null;
    refreshSignal?: RefreshSignal;
    loadingFallback?: React.ReactNode;
    contextLoadingFallback?: React.ReactNode;
    as?: "div" | "span";
} = {}) {
    const {
        hasAccess = true,
        accessLevels = ["ROLE"],
        user,
        queryRef,
        refreshSignal = {nodes: [], version: 0},
        loadingFallback,
        contextLoadingFallback,
        as: container,
    } = options;

    if (queryRef !== undefined) mockQueryRef = queryRef;

    const connCtx = createMockConnectedUserContext(user !== undefined ? {user} : {});
    const wsCtx = createMockWebserviceAccessContext({
        checkWebserviceAccess: () => hasAccess,
        getWebserviceAccessLevels: () => accessLevels,
    });
    const alertMerge = vi.fn();
    let latestCtx: ReturnType<typeof useLysQuery> | null = null;

    const result = render(
        <AlertMessageContext.Provider value={{merge: alertMerge}}>
            <ConnectedUserContext.Provider value={connCtx}>
                <WebserviceAccessContext.Provider value={wsCtx}>
                    <RefreshSignalContext.Provider value={refreshSignal}>
                        <LysLoadingContext.Provider value={{loadingFallback: contextLoadingFallback ?? null}}>
                            <LysQueryProvider
                                query={mockQuery}
                                loadingFallback={loadingFallback}
                                as={container}
                            >
                                <QueryConsumer onValue={(ctx) => {latestCtx = ctx;}}/>
                            </LysQueryProvider>
                        </LysLoadingContext.Provider>
                    </RefreshSignalContext.Provider>
                </WebserviceAccessContext.Provider>
            </ConnectedUserContext.Provider>
        </AlertMessageContext.Provider>
    );

    return {result, getCtx: () => latestCtx!, alertMerge, connCtx};
}

describe("LysQueryProvider", () => {
    beforeEach(() => {
        mockQueryRef = null;
        mockLoadQuery = vi.fn();
        mockDisposeQuery = vi.fn();
        mockPreloadedData = {};
        mockPreloadedError = null;
    });

    describe("permission checking", () => {
        it("renders children when user has permission", () => {
            mockQueryRef = {__id: "ref"};

            renderLysQueryProvider({hasAccess: true});

            expect(screen.getByText("Query consumer")).toBeInTheDocument();
        });

        it("hides children when user lacks permission", () => {
            mockQueryRef = {__id: "ref"};

            renderLysQueryProvider({hasAccess: false});

            expect(screen.queryByText("Query consumer")).not.toBeInTheDocument();
        });
    });

    describe("context value", () => {
        it("provides data from preloaded query", () => {
            mockQueryRef = {__id: "ref"};
            mockPreloadedData = {viewer: {name: "Test"}};

            const {getCtx} = renderLysQueryProvider({hasAccess: true});

            const [data] = getCtx();
            expect(data).toEqual({viewer: {name: "Test"}});
        });

        it("provides a reload function", () => {
            mockQueryRef = {__id: "ref"};

            const {getCtx} = renderLysQueryProvider({hasAccess: true});

            const [, reload] = getCtx();
            expect(typeof reload).toBe("function");
        });

        it("reload calls disposeQuery", () => {
            mockQueryRef = {__id: "ref"};

            const {getCtx} = renderLysQueryProvider({hasAccess: true});

            act(() => {
                const [, reload] = getCtx();
                reload();
            });

            expect(mockDisposeQuery).toHaveBeenCalled();
        });
    });

    describe("refresh signal", () => {
        it("does not reload when refresh signal has no matching node types", () => {
            mockQueryRef = {__id: "ref"};

            const {rerender} = render(
                <AlertMessageContext.Provider value={{merge: vi.fn()}}>
                    <ConnectedUserContext.Provider value={createMockConnectedUserContext()}>
                        <WebserviceAccessContext.Provider value={createMockWebserviceAccessContext()}>
                            <RefreshSignalContext.Provider value={{nodes: [], version: 0}}>
                                <LysLoadingContext.Provider value={{loadingFallback: null}}>
                                    <LysQueryProvider query={mockQuery}>
                                        <div>Child</div>
                                    </LysQueryProvider>
                                </LysLoadingContext.Provider>
                            </RefreshSignalContext.Provider>
                        </WebserviceAccessContext.Provider>
                    </ConnectedUserContext.Provider>
                </AlertMessageContext.Provider>
            );

            mockDisposeQuery.mockClear();

            act(() => {
                rerender(
                    <AlertMessageContext.Provider value={{merge: vi.fn()}}>
                        <ConnectedUserContext.Provider value={createMockConnectedUserContext()}>
                            <WebserviceAccessContext.Provider value={createMockWebserviceAccessContext()}>
                                <RefreshSignalContext.Provider value={{nodes: ["SomeNode"], version: 1}}>
                                    <LysLoadingContext.Provider value={{loadingFallback: null}}>
                                        <LysQueryProvider query={mockQuery}>
                                            <div>Child</div>
                                        </LysQueryProvider>
                                    </LysLoadingContext.Provider>
                                </RefreshSignalContext.Provider>
                            </WebserviceAccessContext.Provider>
                        </ConnectedUserContext.Provider>
                    </AlertMessageContext.Provider>
                );
            });

            // No matching node types in our mock query, so disposeQuery should NOT be called
            expect(mockDisposeQuery).not.toHaveBeenCalled();
        });
    });

    describe("container element", () => {
        it("renders with div container by default", () => {
            mockQueryRef = {__id: "ref"};

            const {result} = renderLysQueryProvider({hasAccess: true});

            expect(result.container.querySelector(".lys-query-container")).toBeInTheDocument();
        });

        it("renders without lys-query-container class when as=span", () => {
            mockQueryRef = {__id: "ref"};

            const {result} = renderLysQueryProvider({hasAccess: true, as: "span"});

            expect(result.container.querySelector(".lys-query-container")).not.toBeInTheDocument();
            expect(result.container.querySelector("span")).toBeInTheDocument();
        });
    });

    describe("error recovery (QueryErrorBoundary)", () => {
        it("routes GraphQL errors to alertMessage", () => {
            mockQueryRef = {__id: "ref"};
            const relayError = new Error("Relay error") as Error & {source?: {errors?: Array<{message: string; severity?: string}>}};
            relayError.source = {
                errors: [
                    {message: "FIELD_VALIDATION_ERROR", severity: "WARNING"},
                    {message: "ANOTHER_ERROR"},
                ]
            };
            mockPreloadedError = relayError;

            // Suppress React error boundary console.error
            const spy = vi.spyOn(console, "error").mockImplementation(() => {});

            const {alertMerge} = renderLysQueryProvider({hasAccess: true});

            expect(alertMerge).toHaveBeenCalledWith([
                {text: "FIELD_VALIDATION_ERROR", level: "WARNING"},
                {text: "ANOTHER_ERROR", level: "ERROR"},
            ]);

            spy.mockRestore();
        });

        it("routes network errors to alertMessage with CRITICAL level", () => {
            mockQueryRef = {__id: "ref"};
            mockPreloadedError = new Error("Network failure");

            const spy = vi.spyOn(console, "error").mockImplementation(() => {});

            const {alertMerge} = renderLysQueryProvider({hasAccess: true});

            expect(alertMerge).toHaveBeenCalledWith([
                {text: "Network failure", level: "CRITICAL"},
            ]);

            spy.mockRestore();
        });

        it("triggers handleSessionExpired on ACCESS_DENIED_ERROR", () => {
            mockQueryRef = {__id: "ref"};
            const relayError = new Error("ACCESS_DENIED_ERROR") as Error & {source?: {errors?: Array<{message: string}>}};
            relayError.source = {
                errors: [{message: "ACCESS_DENIED_ERROR"}]
            };
            mockPreloadedError = relayError;

            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            const handleSessionExpired = vi.fn();

            const connCtx = createMockConnectedUserContext({handleSessionExpired});
            const wsCtx = createMockWebserviceAccessContext();
            const alertMerge = vi.fn();

            render(
                <AlertMessageContext.Provider value={{merge: alertMerge}}>
                    <ConnectedUserContext.Provider value={connCtx}>
                        <WebserviceAccessContext.Provider value={wsCtx}>
                            <RefreshSignalContext.Provider value={{nodes: [], version: 0}}>
                                <LysLoadingContext.Provider value={{loadingFallback: null}}>
                                    <LysQueryProvider query={mockQuery}>
                                        <div>Child</div>
                                    </LysQueryProvider>
                                </LysLoadingContext.Provider>
                            </RefreshSignalContext.Provider>
                        </WebserviceAccessContext.Provider>
                    </ConnectedUserContext.Provider>
                </AlertMessageContext.Provider>
            );

            expect(handleSessionExpired).toHaveBeenCalled();
            expect(alertMerge).not.toHaveBeenCalled();

            spy.mockRestore();
        });

        it("detects ACCESS_DENIED_ERROR in error message fallback", () => {
            mockQueryRef = {__id: "ref"};
            mockPreloadedError = new Error("Something ACCESS_DENIED_ERROR happened");

            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            const handleSessionExpired = vi.fn();

            const connCtx = createMockConnectedUserContext({handleSessionExpired});
            const wsCtx = createMockWebserviceAccessContext();
            const alertMerge = vi.fn();

            render(
                <AlertMessageContext.Provider value={{merge: alertMerge}}>
                    <ConnectedUserContext.Provider value={connCtx}>
                        <WebserviceAccessContext.Provider value={wsCtx}>
                            <RefreshSignalContext.Provider value={{nodes: [], version: 0}}>
                                <LysLoadingContext.Provider value={{loadingFallback: null}}>
                                    <LysQueryProvider query={mockQuery}>
                                        <div>Child</div>
                                    </LysQueryProvider>
                                </LysLoadingContext.Provider>
                            </RefreshSignalContext.Provider>
                        </WebserviceAccessContext.Provider>
                    </ConnectedUserContext.Provider>
                </AlertMessageContext.Provider>
            );

            expect(handleSessionExpired).toHaveBeenCalled();
            expect(alertMerge).not.toHaveBeenCalled();

            spy.mockRestore();
        });
    });

    describe("default context (outside provider)", () => {
        it("provides default values when used outside provider", () => {
            let ctx: ReturnType<typeof useLysQuery> | null = null;

            render(
                <QueryConsumer onValue={(v) => {ctx = v;}}/>
            );

            const [data, reload] = ctx!;
            expect(data).toBeUndefined();
            expect(typeof reload).toBe("function");
        });
    });
});
