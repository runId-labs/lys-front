import {describe, it, expect, vi, beforeEach} from "vitest";
import {render, act, screen} from "@testing-library/react";
import {ConnectedUserContext} from "../ConnectedUserProvider/hooks";
import {WebserviceAccessContext} from "../WebserviceAccessProvider/hooks";
import {AlertMessageContext} from "../AlertMessageProvider/hooks";
import {createMockConnectedUserContext, createMockWebserviceAccessContext} from "../../test/test-utils";
import {useLysMutation} from "./hooks";

/**
 * Mock react-relay useMutation
 */
type CommitFn = (config: {
    variables: Record<string, unknown>;
    onCompleted?: (response: any, errors: any[] | null) => void;
    onError?: (error: any) => void;
}) => {dispose: () => void};

let mockCommit: CommitFn;
let mockIsInFlight: boolean;

vi.mock("react-relay", () => ({
    graphql: (strings: TemplateStringsArray) => ({__mock: true, text: strings[0]}),
    useMutation: () => [
        (...args: any[]) => mockCommit(...args),
        mockIsInFlight,
    ],
}));

// Import after mocks
import LysMutationProvider from "./index";

/**
 * Mock mutation node simulating a compiled Relay ConcreteRequest
 */
const mockMutation = {
    params: {name: "TestMutation"},
    operation: {
        selections: [{name: "testWebservice"}],
    },
} as any;

/**
 * Test consumer exposing LysMutation context
 */
const MutationConsumer = ({onValue}: {onValue: (ctx: ReturnType<typeof useLysMutation>) => void}) => {
    const ctx = useLysMutation();
    onValue(ctx);
    return <div>Mutation consumer</div>;
};

function renderLysMutationProvider(options: {
    hasAccess?: boolean;
    accessLevels?: string[];
    notPermissionDisplayType?: "hide" | "show";
    handleSessionExpired?: () => void;
} = {}) {
    const {
        hasAccess = true,
        accessLevels = ["ROLE"],
        notPermissionDisplayType,
        handleSessionExpired,
    } = options;

    const connCtx = createMockConnectedUserContext({
        handleSessionExpired: handleSessionExpired ?? (() => {}),
    });
    const wsCtx = createMockWebserviceAccessContext({
        checkWebserviceAccess: () => hasAccess,
        getWebserviceAccessLevels: () => accessLevels,
    });
    const alertMerge = vi.fn();
    let latestCtx: ReturnType<typeof useLysMutation> | null = null;

    const result = render(
        <AlertMessageContext.Provider value={{merge: alertMerge}}>
            <ConnectedUserContext.Provider value={connCtx}>
                <WebserviceAccessContext.Provider value={wsCtx}>
                    <LysMutationProvider
                        mutation={mockMutation}
                        notPermissionDisplayType={notPermissionDisplayType}
                    >
                        <MutationConsumer onValue={(ctx) => {latestCtx = ctx;}}/>
                    </LysMutationProvider>
                </WebserviceAccessContext.Provider>
            </ConnectedUserContext.Provider>
        </AlertMessageContext.Provider>
    );

    return {result, getCtx: () => latestCtx!, alertMerge, connCtx};
}

describe("LysMutationProvider", () => {
    beforeEach(() => {
        mockCommit = vi.fn(() => ({dispose: vi.fn()}));
        mockIsInFlight = false;
    });

    describe("permission checking", () => {
        it("renders children when user has permission", () => {
            renderLysMutationProvider({hasAccess: true});

            expect(screen.getByText("Mutation consumer")).toBeInTheDocument();
        });

        it("hides children when user lacks permission", () => {
            renderLysMutationProvider({hasAccess: false});

            expect(screen.queryByText("Mutation consumer")).not.toBeInTheDocument();
        });

        it("shows children when notPermissionDisplayType is show", () => {
            renderLysMutationProvider({hasAccess: false, notPermissionDisplayType: "show"});

            expect(screen.getByText("Mutation consumer")).toBeInTheDocument();
        });
    });

    describe("context value", () => {
        it("provides commit function when has permission", () => {
            const {getCtx} = renderLysMutationProvider({hasAccess: true});

            const [commit] = getCtx();
            expect(commit).not.toBeNull();
            expect(typeof commit).toBe("function");
        });

        it("provides null commit when no permission", () => {
            renderLysMutationProvider({hasAccess: false, notPermissionDisplayType: "show"});

            // Consumer is rendered thanks to notPermissionDisplayType: "show"
            // but commit should be null
            let ctx: ReturnType<typeof useLysMutation> | null = null;
            render(
                <AlertMessageContext.Provider value={{merge: vi.fn()}}>
                    <ConnectedUserContext.Provider value={createMockConnectedUserContext()}>
                        <WebserviceAccessContext.Provider value={createMockWebserviceAccessContext({
                            checkWebserviceAccess: () => false,
                            getWebserviceAccessLevels: () => [],
                        })}>
                            <LysMutationProvider
                                mutation={mockMutation}
                                notPermissionDisplayType="show"
                            >
                                <MutationConsumer onValue={(v) => {ctx = v;}}/>
                            </LysMutationProvider>
                        </WebserviceAccessContext.Provider>
                    </ConnectedUserContext.Provider>
                </AlertMessageContext.Provider>
            );

            const [commit] = ctx!;
            expect(commit).toBeNull();
        });

        it("provides isInFlight status", () => {
            mockIsInFlight = true;

            const {getCtx} = renderLysMutationProvider({hasAccess: true});

            const [, isInFlight] = getCtx();
            expect(isInFlight).toBe(true);
        });
    });

    describe("commit", () => {
        it("calls underlying relay commit", () => {
            const {getCtx} = renderLysMutationProvider({hasAccess: true});

            act(() => {
                const [commit] = getCtx();
                commit!({variables: {input: {name: "test"}}});
            });

            expect(mockCommit).toHaveBeenCalledWith(
                expect.objectContaining({
                    variables: {input: {name: "test"}},
                })
            );
        });

        it("calls original onCompleted and merges errors", () => {
            const originalOnCompleted = vi.fn();
            const {getCtx, alertMerge} = renderLysMutationProvider({hasAccess: true});

            // Setup mockCommit to invoke the lysConfig.onCompleted
            mockCommit = vi.fn((config) => {
                config.onCompleted?.({data: "result"}, [{message: "SOME_ERROR", severity: "WARNING"}]);
                return {dispose: vi.fn()};
            });

            act(() => {
                const [commit] = getCtx();
                commit!({
                    variables: {},
                    onCompleted: originalOnCompleted,
                });
            });

            expect(originalOnCompleted).toHaveBeenCalledWith(
                {data: "result"},
                [{message: "SOME_ERROR", severity: "WARNING"}]
            );
            expect(alertMerge).toHaveBeenCalledWith([
                {text: "SOME_ERROR", level: "WARNING"},
            ]);
        });

        it("does not merge alerts when onCompleted has no errors", () => {
            const {getCtx, alertMerge} = renderLysMutationProvider({hasAccess: true});

            mockCommit = vi.fn((config) => {
                config.onCompleted?.({data: "result"}, null);
                return {dispose: vi.fn()};
            });

            act(() => {
                const [commit] = getCtx();
                commit!({variables: {}});
            });

            expect(alertMerge).toHaveBeenCalledWith([]);
        });
    });

    describe("error handling", () => {
        it("merges source errors as alerts on non-access-denied error", () => {
            const {getCtx, alertMerge} = renderLysMutationProvider({hasAccess: true});

            mockCommit = vi.fn((config) => {
                const error = new Error("GraphQL error") as any;
                error.source = {errors: [{message: "VALIDATION_ERROR"}, {message: "INTERNAL_ERROR"}]};
                config.onError?.(error);
                return {dispose: vi.fn()};
            });

            act(() => {
                const [commit] = getCtx();
                commit!({variables: {}});
            });

            expect(alertMerge).toHaveBeenCalledWith([
                {text: "VALIDATION_ERROR", level: "ERROR"},
                {text: "INTERNAL_ERROR", level: "CRITICAL"},
            ]);
        });

        it("handles ACCESS_DENIED_ERROR by calling handleSessionExpired", () => {
            const handleSessionExpired = vi.fn();
            const originalOnError = vi.fn();
            const {getCtx} = renderLysMutationProvider({
                hasAccess: true,
                handleSessionExpired,
            });

            mockCommit = vi.fn((config) => {
                const error = new Error("Relay error") as any;
                error.source = {errors: [{message: "ACCESS_DENIED_ERROR"}]};
                config.onError?.(error);
                return {dispose: vi.fn()};
            });

            act(() => {
                const [commit] = getCtx();
                commit!({variables: {}, onError: originalOnError});
            });

            expect(handleSessionExpired).toHaveBeenCalled();
            expect(originalOnError).toHaveBeenCalled();
        });

        it("calls original onError callback on regular errors", () => {
            const originalOnError = vi.fn();
            const {getCtx} = renderLysMutationProvider({hasAccess: true});

            mockCommit = vi.fn((config) => {
                const error = new Error("Network error") as any;
                error.source = {errors: [{message: "NETWORK_FAILURE"}]};
                config.onError?.(error);
                return {dispose: vi.fn()};
            });

            act(() => {
                const [commit] = getCtx();
                commit!({variables: {}, onError: originalOnError});
            });

            expect(originalOnError).toHaveBeenCalled();
        });
    });

    describe("default context (outside provider)", () => {
        it("provides null commit and false isInFlight", () => {
            let ctx: ReturnType<typeof useLysMutation> | null = null;

            render(
                <MutationConsumer onValue={(v) => {ctx = v;}}/>
            );

            const [commit, isInFlight, disposable] = ctx!;
            expect(commit).toBeNull();
            expect(isInFlight).toBe(false);
            expect(disposable).toBeUndefined();
        });
    });
});
