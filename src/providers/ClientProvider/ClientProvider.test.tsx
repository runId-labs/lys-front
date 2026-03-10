import {describe, it, expect, vi, beforeEach} from "vitest";
import {render, act} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import ClientProvider from "./index";
import {useClientId} from "./hooks";
import {ConnectedUserContext} from "../ConnectedUserProvider/hooks";
import UrlQueriesProvider from "../UrlQueriesProvider";
import {useUrlQueries} from "../UrlQueriesProvider/hooks";
import {createMockConnectedUserContext, mockUser} from "../../test/test-utils";
import {ClientContextValue} from "./types";

const SESSION_KEY = "lys_clientId";

/**
 * Test consumer exposing both client and URL contexts
 */
const TestConsumer = ({onValue}: {onValue: (value: ClientContextValue & {appliedParams: URLSearchParams}) => void}) => {
    const client = useClientId();
    const {appliedParams} = useUrlQueries();
    onValue({...client, appliedParams});
    return <div>Consumer</div>;
};

function renderClientProvider(options: {
    user?: typeof mockUser | undefined;
    initialEntries?: string[];
} = {}) {
    const {user, initialEntries = ["/"]} = options;
    let latestValue: (ClientContextValue & {appliedParams: URLSearchParams}) | null = null;

    const connCtx = createMockConnectedUserContext(
        user !== undefined ? {user} : {}
    );

    const result = render(
        <ConnectedUserContext.Provider value={connCtx}>
            <MemoryRouter initialEntries={initialEntries}>
                <UrlQueriesProvider>
                    <ClientProvider>
                        <TestConsumer onValue={(v) => {latestValue = v;}}/>
                    </ClientProvider>
                </UrlQueriesProvider>
            </MemoryRouter>
        </ConnectedUserContext.Provider>
    );

    return {
        result,
        getValue: () => latestValue!,
        rerender: (newUser: typeof mockUser | undefined) => {
            const newCtx = createMockConnectedUserContext({user: newUser});
            result.rerender(
                <ConnectedUserContext.Provider value={newCtx}>
                    <MemoryRouter initialEntries={initialEntries}>
                        <UrlQueriesProvider>
                            <ClientProvider>
                                <TestConsumer onValue={(v) => {latestValue = v;}}/>
                            </ClientProvider>
                        </UrlQueriesProvider>
                    </MemoryRouter>
                </ConnectedUserContext.Provider>
            );
        }
    };
}

describe("ClientProvider", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it("renders children", () => {
        const {getValue} = renderClientProvider();
        expect(getValue()).toBeDefined();
    });

    // --- Locked mode (client user) ---

    it("returns user.clientId when user has a clientId", () => {
        const {getValue} = renderClientProvider({user: mockUser});
        expect(getValue().clientId).toBe(mockUser.clientId);
    });

    it("isLocked is true when user has a clientId", () => {
        const {getValue} = renderClientProvider({user: mockUser});
        expect(getValue().isLocked).toBe(true);
    });

    it("setClientId is a no-op when locked", () => {
        const {getValue} = renderClientProvider({user: mockUser});

        act(() => {
            getValue().setClientId("other-id");
        });

        expect(getValue().clientId).toBe(mockUser.clientId);
    });

    // --- Unlocked mode (admin user) ---

    it("isLocked is false when user has no clientId", () => {
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});
        expect(getValue().isLocked).toBe(false);
    });

    it("clientId is null by default for admin user", () => {
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});
        expect(getValue().clientId).toBeNull();
    });

    it("setClientId updates the selected client for admin user", () => {
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});

        act(() => {
            getValue().setClientId("selected-client-123");
        });

        expect(getValue().clientId).toBe("selected-client-123");
    });

    it("setClientId persists to sessionStorage", () => {
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});

        act(() => {
            getValue().setClientId("persisted-client");
        });

        expect(sessionStorage.getItem(SESSION_KEY)).toBe("persisted-client");
    });

    it("setClientId(null) clears sessionStorage", () => {
        sessionStorage.setItem(SESSION_KEY, "old-client");
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});

        act(() => {
            getValue().setClientId(null);
        });

        expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    // --- Initialization ---

    it("initializes clientId from URL param", () => {
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({
            user: adminUser,
            initialEntries: ["/?clientId=url-client-789"]
        });

        expect(getValue().clientId).toBe("url-client-789");
    });

    it("initializes clientId from sessionStorage", () => {
        sessionStorage.setItem(SESSION_KEY, "session-client-456");
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});

        expect(getValue().clientId).toBe("session-client-456");
    });

    it("URL param takes priority over sessionStorage", () => {
        sessionStorage.setItem(SESSION_KEY, "session-client");
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({
            user: adminUser,
            initialEntries: ["/?clientId=url-client"]
        });

        expect(getValue().clientId).toBe("url-client");
    });

    // --- URL sync ---

    it("syncs clientId to URL params for admin user", async () => {
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue} = renderClientProvider({user: adminUser});

        act(() => {
            getValue().setClientId("synced-client");
        });

        // Wait for microtask (batched URL update)
        await act(async () => {
            await Promise.resolve();
        });

        expect(getValue().appliedParams.get("clientId")).toBe("synced-client");
    });

    it("does not sync clientId to URL for locked user", async () => {
        const {getValue} = renderClientProvider({user: mockUser});

        await act(async () => {
            await Promise.resolve();
        });

        // The locked user's clientId should not appear in URL
        expect(getValue().appliedParams.get("clientId")).toBeNull();
    });

    // --- Logout ---

    it("does not sync clientId to URL when user is disconnected", async () => {
        sessionStorage.setItem(SESSION_KEY, "stale-client");
        const {getValue} = renderClientProvider({user: undefined});

        await act(async () => {
            await Promise.resolve();
        });

        // No URL sync should happen when disconnected
        expect(getValue().appliedParams.get("clientId")).toBeNull();
    });

    // --- Logout ---

    it("clears clientId on logout", () => {
        sessionStorage.setItem(SESSION_KEY, "will-be-cleared");
        const adminUser = {...mockUser, clientId: undefined};
        const {getValue, rerender} = renderClientProvider({user: adminUser});

        expect(getValue().clientId).toBe("will-be-cleared");

        // Simulate logout
        act(() => {
            rerender(undefined);
        });

        expect(getValue().clientId).toBeNull();
        expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });
});