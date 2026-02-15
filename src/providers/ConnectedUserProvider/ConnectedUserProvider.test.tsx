import {describe, it, expect, vi, beforeEach} from "vitest";
import {render, act, screen} from "@testing-library/react";
import {AlertMessageContext} from "../AlertMessageProvider/hooks";
import LocaleProvider from "../LocaleProvider";
import {useConnectedUserInfo} from "./hooks";
import {ConnectedUserInterface} from "./types";

/**
 * Mock state for useMutation
 */
type MutationCommitFn = (config: {
    variables: Record<string, unknown>;
    onCompleted?: (response: any, errors: any[] | null) => void;
    onError?: (error: any) => void;
}) => void;

let mockCommitLogin: MutationCommitFn;
let mockCommitRefresh: MutationCommitFn;
let mockCommitLogout: MutationCommitFn;

/**
 * Mock state for useQueryLoader
 */
let mockQueryRef: object | null = null;
let mockLoadQuery: ReturnType<typeof vi.fn>;

/**
 * Mock state for usePreloadedQuery/useFragment
 */
let mockUserData: ConnectedUserInterface | null = null;

vi.mock("react-relay", () => {
    return {
        // graphql tags are compiled by babel-plugin-relay, but we still need the export
        graphql: (strings: TemplateStringsArray) => ({__mock: true, text: strings[0]}),
        useMutation: (node: any) => {
            // ConcreteRequest objects from __generated__/ have params.name
            const name: string = node?.params?.name ?? node?.operation?.name ?? "";
            if (name.includes("Login")) return [(...args: any[]) => mockCommitLogin(...args), false];
            if (name.includes("Logout")) return [(...args: any[]) => mockCommitLogout(...args), false];
            if (name.includes("Refresh")) return [(...args: any[]) => mockCommitRefresh(...args), false];
            return [vi.fn(), false];
        },
        useQueryLoader: () => [mockQueryRef, mockLoadQuery],
        usePreloadedQuery: () => ({connectedUser: mockUserData ? {} : null}),
        useFragment: () => mockUserData,
    };
});

vi.mock("../../relay/RelayEnvironment", () => ({
    clearRelayCache: vi.fn(),
}));

// Import after mocks are set up
import ConnectedUserProvider from "./index";

/**
 * Test consumer exposing connected user context
 */
const TestConsumer = ({onValue}: {onValue: (ctx: ReturnType<typeof useConnectedUserInfo>) => void}) => {
    const ctx = useConnectedUserInfo();
    onValue(ctx);
    return <div>Consumer: {ctx.user?.id ?? "no user"}</div>;
};

const mockMessages = {
    "lys.services.i18n.messages.logoutSuccess": "Logged out",
    "lys.services.i18n.messages.sessionExpired": "Session expired",
};

function renderConnectedUserProvider() {
    const alertMerge = vi.fn();
    let latestCtx: ReturnType<typeof useConnectedUserInfo> | null = null;

    const messageSources: Record<string, Record<string, string>> = {en: mockMessages, fr: {}};

    const result = render(
        <LocaleProvider defaultLocale="en" messageSources={messageSources}>
            <AlertMessageContext.Provider value={{merge: alertMerge}}>
                <ConnectedUserProvider>
                    <TestConsumer onValue={(ctx) => {latestCtx = ctx;}}/>
                </ConnectedUserProvider>
            </AlertMessageContext.Provider>
        </LocaleProvider>
    );

    return {result, getCtx: () => latestCtx!, alertMerge};
}

describe("ConnectedUserProvider", () => {
    beforeEach(() => {
        mockQueryRef = null;
        mockLoadQuery = vi.fn();
        mockUserData = null;

        // Default: refresh succeeds (used for initial mount refresh + handleSessionExpired)
        mockCommitRefresh = vi.fn((config) => {
            config.onCompleted?.({refreshAccessToken: {accessTokenExpireIn: Date.now() / 1000 + 3600}}, null);
        });

        mockCommitLogin = vi.fn();
        mockCommitLogout = vi.fn();
    });

    describe("initialization", () => {
        it("attempts refresh on mount then loads query", () => {
            mockQueryRef = {__id: "test-query-ref"};

            renderConnectedUserProvider();

            // Initial refresh (via useMutation with refresh node) should trigger loadQuery
            expect(mockCommitRefresh).toHaveBeenCalled();
            expect(mockLoadQuery).toHaveBeenCalledWith({}, {fetchPolicy: "network-only"});
        });

        it("loads query even when initial refresh fails", () => {
            mockCommitRefresh = vi.fn((config) => {
                config.onError?.(new Error("No refresh token"));
            });
            mockQueryRef = {__id: "test-query-ref"};

            renderConnectedUserProvider();

            expect(mockLoadQuery).toHaveBeenCalledWith({}, {fetchPolicy: "network-only"});
        });

        it("does not render children until queryRef is loaded", () => {
            mockQueryRef = null;

            const {result} = renderConnectedUserProvider();

            expect(result.container.innerHTML).toBe("");
        });

        it("renders children once queryRef is available", () => {
            mockQueryRef = {__id: "test-query-ref"};

            renderConnectedUserProvider();

            expect(screen.getByText(/Consumer/)).toBeInTheDocument();
        });
    });

    describe("user state", () => {
        it("provides user from Relay query", () => {
            mockQueryRef = {__id: "test-query-ref"};
            mockUserData = {
                id: "user-1",
                clientId: "client-1",
                emailAddress: {id: "e1", address: "test@test.com", createdAt: null, updatedAt: null, validatedAt: null, lastValidationRequestAt: null},
                status: {id: "s1", code: "ACTIVE"},
                language: {id: "l1", code: "en"},
                privateData: null,
            };

            const {getCtx} = renderConnectedUserProvider();

            expect(getCtx().user?.id).toBe("user-1");
            expect(getCtx().user?.emailAddress.address).toBe("test@test.com");
        });

        it("provides undefined user when not connected", () => {
            mockQueryRef = {__id: "test-query-ref"};
            mockUserData = null;

            const {getCtx} = renderConnectedUserProvider();

            expect(getCtx().user).toBeFalsy();
        });
    });

    describe("push (token buffer system)", () => {
        it("executes callback immediately when no token expiration info (unauthenticated)", () => {
            mockQueryRef = {__id: "test"};
            const callback = vi.fn();

            const {getCtx} = renderConnectedUserProvider();

            act(() => {
                getCtx().push(callback);
            });

            expect(callback).toHaveBeenCalledOnce();
        });
    });

    describe("login", () => {
        it("calls login mutation with credentials", () => {
            mockQueryRef = {__id: "test"};

            const {getCtx} = renderConnectedUserProvider();

            act(() => {
                const [loginFn] = getCtx().login;
                loginFn("user@test.com", "password123");
            });

            expect(mockCommitLogin).toHaveBeenCalledWith(
                expect.objectContaining({
                    variables: {inputs: {login: "user@test.com", password: "password123"}},
                })
            );
        });

        it("triggers query reload on successful login", () => {
            mockQueryRef = {__id: "test"};
            mockCommitLogin = vi.fn((config) => {
                config.onCompleted?.({login: {accessTokenExpireIn: Date.now() / 1000 + 3600}}, null);
            });

            const {getCtx} = renderConnectedUserProvider();

            act(() => {
                const [loginFn] = getCtx().login;
                loginFn("user@test.com", "password123");
            });

            // loadQuery called: once on init + once on login success
            expect(mockLoadQuery).toHaveBeenCalledTimes(2);
        });
    });

    describe("logout", () => {
        it("calls logout mutation", () => {
            mockQueryRef = {__id: "test"};

            const {getCtx} = renderConnectedUserProvider();

            act(() => {
                const [logoutFn] = getCtx().logout;
                logoutFn();
            });

            expect(mockCommitLogout).toHaveBeenCalled();
        });

        it("shows success message on logout", () => {
            mockQueryRef = {__id: "test"};
            mockCommitLogout = vi.fn((config) => {
                config.onCompleted?.({}, null);
            });

            const {getCtx, alertMerge} = renderConnectedUserProvider();

            act(() => {
                const [logoutFn] = getCtx().logout;
                logoutFn();
            });

            expect(alertMerge).toHaveBeenCalledWith([
                expect.objectContaining({text: "Logged out", level: "SUCCESS"})
            ]);
        });
    });

    describe("handleSessionExpired", () => {
        it("attempts token refresh", () => {
            mockQueryRef = {__id: "test"};

            const {getCtx} = renderConnectedUserProvider();

            // Clear the initial refresh call count
            mockCommitRefresh.mockClear();

            act(() => {
                getCtx().handleSessionExpired();
            });

            expect(mockCommitRefresh).toHaveBeenCalled();
        });

        it("calls registered callback on successful refresh", () => {
            mockQueryRef = {__id: "test"};

            const retryCallback = vi.fn();
            const {getCtx} = renderConnectedUserProvider();

            // The default mockCommitRefresh already simulates success
            act(() => {
                getCtx().handleSessionExpired(retryCallback);
            });

            expect(retryCallback).toHaveBeenCalledOnce();
        });

        it("calls ALL registered callbacks when multiple providers expire simultaneously", () => {
            // Initial refresh succeeds normally
            let callCount = 0;
            let pendingOnCompleted: ((response: any, errors: any) => void) | undefined;

            mockCommitRefresh = vi.fn((config) => {
                callCount++;
                if (callCount === 1) {
                    // First call is the initial mount refresh — complete immediately
                    config.onCompleted?.({refreshAccessToken: {accessTokenExpireIn: Date.now() / 1000 + 3600}}, null);
                } else {
                    // Subsequent calls (handleSessionExpired) — hold in-flight
                    pendingOnCompleted = config.onCompleted;
                }
            });

            mockQueryRef = {__id: "test"};

            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();
            const {getCtx} = renderConnectedUserProvider();

            act(() => {
                getCtx().handleSessionExpired(callback1);
                getCtx().handleSessionExpired(callback2);
                getCtx().handleSessionExpired(callback3);
            });

            // Complete the refresh
            act(() => {
                pendingOnCompleted?.({refreshAccessToken: {accessTokenExpireIn: Date.now() / 1000 + 3600}}, null);
            });

            // All three callbacks should execute
            expect(callback1).toHaveBeenCalledOnce();
            expect(callback2).toHaveBeenCalledOnce();
            expect(callback3).toHaveBeenCalledOnce();
        });

        it("shows session expired message when refresh fails with errors", () => {
            let callCount = 0;
            mockCommitRefresh = vi.fn((config) => {
                callCount++;
                if (callCount === 1) {
                    // Initial mount refresh succeeds
                    config.onCompleted?.({refreshAccessToken: {accessTokenExpireIn: Date.now() / 1000 + 3600}}, null);
                } else {
                    // handleSessionExpired refresh fails with errors
                    config.onCompleted?.({}, [{message: "INVALID_TOKEN"}]);
                }
            });

            mockQueryRef = {__id: "test"};
            const {getCtx, alertMerge} = renderConnectedUserProvider();

            act(() => {
                getCtx().handleSessionExpired();
            });

            expect(alertMerge).toHaveBeenCalledWith([
                expect.objectContaining({text: "Session expired", level: "WARNING"})
            ]);
        });

        it("shows session expired message on network error", () => {
            let callCount = 0;
            mockCommitRefresh = vi.fn((config) => {
                callCount++;
                if (callCount === 1) {
                    // Initial mount refresh succeeds
                    config.onCompleted?.({refreshAccessToken: {accessTokenExpireIn: Date.now() / 1000 + 3600}}, null);
                } else {
                    // handleSessionExpired refresh fails with network error
                    config.onError?.(new Error("Network error"));
                }
            });

            mockQueryRef = {__id: "test"};
            const {getCtx, alertMerge} = renderConnectedUserProvider();

            act(() => {
                getCtx().handleSessionExpired();
            });

            expect(alertMerge).toHaveBeenCalledWith([
                expect.objectContaining({text: "Session expired", level: "WARNING"})
            ]);
        });
    });
});
