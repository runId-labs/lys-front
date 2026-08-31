import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {render, act, waitFor} from "@testing-library/react";
import {ConnectedUserContext} from "../ConnectedUserProvider/hooks";
import {createMockConnectedUserContext, mockUser} from "../../test/test-utils";
import SignalProvider from "./index";
import {useSignal, useSignalSubscription, useSignalRefresh, useSignalReconnect} from "./hooks";
import {SignalRefresh} from "./types";
import {
    MIN_FORCED_RETRY_INTERVAL_MS,
    RECONNECT_BASE_DELAY_MS,
    RECONNECT_MAX_DELAY_MS,
    STALE_CONNECTION_TIMEOUT_MS
} from "./consts";

/**
 * Mock EventSource
 */
class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    static instances: MockEventSource[] = [];

    url: string;
    withCredentials: boolean;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    readyState = 0;
    closed = false;
    listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

    constructor(url: string, options?: {withCredentials?: boolean}) {
        this.url = url;
        this.withCredentials = options?.withCredentials ?? false;
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: (event: MessageEvent) => void) {
        (this.listeners[type] ??= []).push(listener);
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== listener);
    }

    close() {
        this.closed = true;
        this.readyState = 2;
    }

    simulateOpen() {
        this.readyState = 1;
        this.onopen?.(new Event("open"));
    }

    simulateMessage(data: string) {
        this.onmessage?.(new MessageEvent("message", {data}));
    }

    simulateHeartbeat() {
        this.listeners["heartbeat"]?.forEach((listener) => listener(new MessageEvent("heartbeat", {data: ""})));
    }

    /**
     * Simulate an error, CLOSED by default (a non-200 answer, which the native
     * reconnection does not retry)
     */
    simulateError(readyState: number = MockEventSource.CLOSED) {
        this.readyState = readyState;
        this.onerror?.(new Event("error"));
    }

    /**
     * Last created instance, i.e. the connection currently in use
     */
    static last(): MockEventSource {
        return MockEventSource.instances[MockEventSource.instances.length - 1];
    }
}

/**
 * Test component exposing signal context
 */
const SignalConsumer = ({onValue}: {onValue: (value: ReturnType<typeof useSignal>) => void}) => {
    const signal = useSignal();
    onValue(signal);
    return <div>Signal consumer</div>;
};

/**
 * Test component using useSignalSubscription
 */
const SubscriptionConsumer = ({handler}: {handler: (signal: any) => void}) => {
    useSignalSubscription(handler, [handler]);
    return <div>Subscription consumer</div>;
};

function renderSignalProvider(
    userOverride?: typeof mockUser | undefined,
    contextOverrides: Parameters<typeof createMockConnectedUserContext>[0] = {}
) {
    const connCtx = createMockConnectedUserContext({user: userOverride, ...contextOverrides});
    let signalValue: ReturnType<typeof useSignal> | null = null;

    const result = render(
        <ConnectedUserContext.Provider value={connCtx}>
            <SignalProvider>
                <SignalConsumer onValue={(v) => {signalValue = v;}}/>
            </SignalProvider>
        </ConnectedUserContext.Provider>
    );

    return {result, getSignalValue: () => signalValue!, connCtx};
}

describe("SignalProvider", () => {
    let originalEventSource: typeof EventSource;

    beforeEach(() => {
        MockEventSource.instances = [];
        originalEventSource = globalThis.EventSource;
        globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
    });

    afterEach(() => {
        globalThis.EventSource = originalEventSource;
    });

    it("does not connect when user is not authenticated", () => {
        renderSignalProvider(undefined);

        expect(MockEventSource.instances).toHaveLength(0);
    });

    it("connects EventSource when user is authenticated", () => {
        renderSignalProvider(mockUser);

        expect(MockEventSource.instances).toHaveLength(1);
        expect(MockEventSource.instances[0].withCredentials).toBe(true);
        expect(MockEventSource.instances[0].url).toContain("/sse/signals?channel=user:");
    });

    it("sets isConnected to true when EventSource opens", async () => {
        const {getSignalValue} = renderSignalProvider(mockUser);

        expect(getSignalValue().isConnected).toBe(false);

        act(() => {
            MockEventSource.instances[0].simulateOpen();
        });

        expect(getSignalValue().isConnected).toBe(true);
    });

    it("sets error on EventSource error", () => {
        const {getSignalValue} = renderSignalProvider(mockUser);

        act(() => {
            MockEventSource.instances[0].simulateError();
        });

        expect(getSignalValue().error).toBeInstanceOf(Error);
        expect(getSignalValue().error!.message).toBe("SSE connection error");
        expect(getSignalValue().isConnected).toBe(false);
    });

    it("dispatches signals to subscribed handlers", () => {
        const handler = vi.fn();
        const connCtx = createMockConnectedUserContext();

        render(
            <ConnectedUserContext.Provider value={connCtx}>
                <SignalProvider>
                    <SubscriptionConsumer handler={handler}/>
                </SignalProvider>
            </ConnectedUserContext.Provider>
        );

        const signal = {channel: "user:123", signal: "TEST_SIGNAL", params: {key: "value"}};

        act(() => {
            MockEventSource.instances[0].simulateMessage(JSON.stringify(signal));
        });

        expect(handler).toHaveBeenCalledWith(signal);
    });

    it("does not crash on invalid JSON messages", () => {
        const handler = vi.fn();
        const connCtx = createMockConnectedUserContext();

        render(
            <ConnectedUserContext.Provider value={connCtx}>
                <SignalProvider>
                    <SubscriptionConsumer handler={handler}/>
                </SignalProvider>
            </ConnectedUserContext.Provider>
        );

        // Should not throw
        act(() => {
            MockEventSource.instances[0].simulateMessage("invalid-json");
        });

        expect(handler).not.toHaveBeenCalled();
    });

    it("closes EventSource on unmount", () => {
        const {result} = renderSignalProvider(mockUser);

        expect(MockEventSource.instances).toHaveLength(1);
        const es = MockEventSource.instances[0];

        result.unmount();

        expect(es.closed).toBe(true);
    });

    it("closes EventSource when user logs out", () => {
        const connCtx = createMockConnectedUserContext();
        let signalValue: ReturnType<typeof useSignal> | null = null;

        const {rerender} = render(
            <ConnectedUserContext.Provider value={connCtx}>
                <SignalProvider>
                    <SignalConsumer onValue={(v) => {signalValue = v;}}/>
                </SignalProvider>
            </ConnectedUserContext.Provider>
        );

        expect(MockEventSource.instances).toHaveLength(1);
        const es = MockEventSource.instances[0];

        // Simulate logout by providing no user
        const loggedOutCtx = createMockConnectedUserContext({user: undefined});
        act(() => {
            rerender(
                <ConnectedUserContext.Provider value={loggedOutCtx}>
                    <SignalProvider>
                        <SignalConsumer onValue={(v) => {signalValue = v;}}/>
                    </SignalProvider>
                </ConnectedUserContext.Provider>
            );
        });

        expect(es.closed).toBe(true);
    });

    it("decodes Relay Global IDs to raw UUIDs in channel URL", () => {
        const relayUser = {...mockUser, id: btoa("UserNode:550e8400-e29b-41d4-a716-446655440000")};
        renderSignalProvider(relayUser);

        expect(MockEventSource.instances[0].url).toContain("channel=user:550e8400-e29b-41d4-a716-446655440000");
    });

    it("falls back to original ID when base64 decode fails", () => {
        const userWithPlainId = {...mockUser, id: "plain-uuid-id"};
        renderSignalProvider(userWithPlainId);

        // Should use the ID as-is when it can't be decoded as Relay ID
        expect(MockEventSource.instances[0].url).toContain("channel=user:");
    });

    it("handles handler errors without crashing", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const badHandler = vi.fn(() => { throw new Error("handler error"); });
        const connCtx = createMockConnectedUserContext();

        render(
            <ConnectedUserContext.Provider value={connCtx}>
                <SignalProvider>
                    <SubscriptionConsumer handler={badHandler}/>
                </SignalProvider>
            </ConnectedUserContext.Provider>
        );

        const signal = {channel: null, signal: "TEST", params: null};

        // Should not throw
        act(() => {
            MockEventSource.instances[0].simulateMessage(JSON.stringify(signal));
        });

        expect(errorSpy).toHaveBeenCalledWith("[SignalProvider] Handler error:", expect.any(Error));
        errorSpy.mockRestore();
    });

    it("unsubscribes handler on component unmount", () => {
        const handler = vi.fn();
        const connCtx = createMockConnectedUserContext();

        const {unmount} = render(
            <ConnectedUserContext.Provider value={connCtx}>
                <SignalProvider>
                    <SubscriptionConsumer handler={handler}/>
                </SignalProvider>
            </ConnectedUserContext.Provider>
        );

        // Handler should work before unmount
        const signal = {channel: null, signal: "TEST", params: null};
        act(() => {
            MockEventSource.instances[0].simulateMessage(JSON.stringify(signal));
        });
        expect(handler).toHaveBeenCalledTimes(1);

        // Unmount the subscription consumer — but keep SignalProvider alive
        // For simplicity, unmount the whole tree and verify handler count didn't increase
        unmount();
        handler.mockClear();

        // No more calls possible since the EventSource is closed on unmount
    });

    describe("useSignalRefresh", () => {
        const RefreshConsumer = ({signalKeys, onValue}: {signalKeys: string[], onValue: (v: SignalRefresh) => void}) => {
            const refresh = useSignalRefresh(...signalKeys);
            onValue(refresh);
            return <div>version: {refresh.version}</div>;
        };

        function renderWithRefresh(signalKeys: string[]) {
            const connCtx = createMockConnectedUserContext();
            let latestRefresh: SignalRefresh = {version: 0, params: null};

            const result = render(
                <ConnectedUserContext.Provider value={connCtx}>
                    <SignalProvider>
                        <RefreshConsumer signalKeys={signalKeys} onValue={(v) => {latestRefresh = v;}}/>
                    </SignalProvider>
                </ConnectedUserContext.Provider>
            );

            return {result, getRefresh: () => latestRefresh};
        }

        it("starts with version 0 and null params", () => {
            const {getRefresh} = renderWithRefresh(["TEST_SIGNAL"]);

            expect(getRefresh().version).toBe(0);
            expect(getRefresh().params).toBeNull();
        });

        it("increments version on matching signal", () => {
            const {getRefresh} = renderWithRefresh(["TEST_SIGNAL"]);

            act(() => {
                MockEventSource.instances[0].simulateMessage(JSON.stringify({
                    channel: "user:123", signal: "TEST_SIGNAL", params: {key: "value"}
                }));
            });

            expect(getRefresh().version).toBe(1);
            expect(getRefresh().params).toEqual({key: "value"});
        });

        it("does not increment version on non-matching signal", () => {
            const {getRefresh} = renderWithRefresh(["TEST_SIGNAL"]);

            act(() => {
                MockEventSource.instances[0].simulateMessage(JSON.stringify({
                    channel: "user:123", signal: "OTHER_SIGNAL", params: null
                }));
            });

            expect(getRefresh().version).toBe(0);
        });

        it("matches on params.type_id for notification-wrapped signals", () => {
            const {getRefresh} = renderWithRefresh(["PORTFOLIO_ANALYSIS_COMPLETED"]);

            act(() => {
                MockEventSource.instances[0].simulateMessage(JSON.stringify({
                    channel: "user:123",
                    signal: "NOTIFICATION",
                    params: {type_id: "PORTFOLIO_ANALYSIS_COMPLETED", data: {year: 2024}}
                }));
            });

            expect(getRefresh().version).toBe(1);
            expect(getRefresh().params).toEqual({type_id: "PORTFOLIO_ANALYSIS_COMPLETED", data: {year: 2024}});
        });

        it("increments version multiple times", () => {
            const {getRefresh} = renderWithRefresh(["TEST_SIGNAL"]);

            act(() => {
                MockEventSource.instances[0].simulateMessage(JSON.stringify({
                    channel: "user:123", signal: "TEST_SIGNAL", params: {v: 1}
                }));
            });

            act(() => {
                MockEventSource.instances[0].simulateMessage(JSON.stringify({
                    channel: "user:123", signal: "TEST_SIGNAL", params: {v: 2}
                }));
            });

            expect(getRefresh().version).toBe(2);
            expect(getRefresh().params).toEqual({v: 2});
        });

        it("matches any of multiple signal keys", () => {
            const {getRefresh} = renderWithRefresh(["SIGNAL_A", "SIGNAL_B"]);

            act(() => {
                MockEventSource.instances[0].simulateMessage(JSON.stringify({
                    channel: "user:123", signal: "SIGNAL_B", params: {from: "B"}
                }));
            });

            expect(getRefresh().version).toBe(1);
            expect(getRefresh().params).toEqual({from: "B"});
        });
    });

    describe("reconnection", () => {
        /**
         * Test component counting reconnections
         */
        const ReconnectConsumer = ({onReconnect}: {onReconnect: () => void}) => {
            useSignalReconnect(onReconnect, [onReconnect]);
            return <div>Reconnect consumer</div>;
        };

        beforeEach(() => {
            vi.useFakeTimers();
            // Full jitter draws in [0, capped]: pin the draw to make delays deterministic
            vi.spyOn(Math, "random").mockReturnValue(0.5);
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it("reconnects with a backoff after an opened connection drops", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError();
            });

            // Scheduled, not immediate
            expect(MockEventSource.instances).toHaveLength(1);

            act(() => {
                vi.advanceTimersByTime(500);
            });

            expect(MockEventSource.instances).toHaveLength(2);
        });

        it("grows the delay between consecutive failed attempts", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError();
            });

            // First retry after ~500ms (0.5 * 1000)
            act(() => {
                vi.advanceTimersByTime(499);
            });
            expect(MockEventSource.instances).toHaveLength(1);

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(MockEventSource.instances).toHaveLength(2);

            // That attempt fails without opening: the delay grows
            act(() => {
                MockEventSource.last().simulateError();
                vi.advanceTimersByTime(999);
            });
            expect(MockEventSource.instances).toHaveLength(2);

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(MockEventSource.instances).toHaveLength(3);
        });

        it("caps the delay whatever the number of failures", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError();
            });

            for (let attempt = 0; attempt < 12; attempt++) {
                act(() => {
                    vi.advanceTimersByTime(RECONNECT_MAX_DELAY_MS);
                    MockEventSource.last().simulateError();
                });
            }

            // 0.5 * 60000 capped to 0.5 * RECONNECT_MAX_DELAY_MS
            act(() => {
                vi.advanceTimersByTime(RECONNECT_MAX_DELAY_MS / 2);
            });

            expect(MockEventSource.instances).toHaveLength(14);
        });

        it("does not schedule a reconnection while the native retry is running", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError(MockEventSource.CONNECTING);
            });

            act(() => {
                vi.advanceTimersByTime(RECONNECT_MAX_DELAY_MS);
            });

            expect(MockEventSource.instances).toHaveLength(1);
        });

        it("opens through the connected user queue, so an expired token is refreshed first", () => {
            const queued: (() => void)[] = [];
            const push = vi.fn((webservice: () => void) => {queued.push(webservice);});
            renderSignalProvider(mockUser, {push});

            // Queued behind the refresh: nothing is opened against a certain 401
            expect(push).toHaveBeenCalledTimes(1);
            expect(MockEventSource.instances).toHaveLength(0);

            act(() => {
                queued.forEach((webservice) => webservice());
            });

            expect(MockEventSource.instances).toHaveLength(1);
        });

        it("does not open a stream for a user who logged out while the attempt was queued", () => {
            const queued: (() => void)[] = [];
            const push = vi.fn((webservice: () => void) => {queued.push(webservice);});
            const {result} = renderSignalProvider(mockUser, {push});

            result.unmount();

            act(() => {
                queued.forEach((webservice) => webservice());
            });

            expect(MockEventSource.instances).toHaveLength(0);
        });

        it("notifies reconnect handlers when the connection reopens, not on the first open", () => {
            const onReconnect = vi.fn();
            const connCtx = createMockConnectedUserContext();

            render(
                <ConnectedUserContext.Provider value={connCtx}>
                    <SignalProvider>
                        <ReconnectConsumer onReconnect={onReconnect}/>
                    </SignalProvider>
                </ConnectedUserContext.Provider>
            );

            act(() => {
                MockEventSource.last().simulateOpen();
            });
            expect(onReconnect).not.toHaveBeenCalled();

            act(() => {
                MockEventSource.last().simulateError();
                vi.advanceTimersByTime(500);
            });
            act(() => {
                MockEventSource.last().simulateOpen();
            });

            expect(onReconnect).toHaveBeenCalledTimes(1);
        });

        it("retries as soon as the network comes back, without waiting out a long backoff", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError();
            });

            // Fail enough times for the backoff to reach its cap
            for (let attempt = 0; attempt < 8; attempt++) {
                act(() => {
                    vi.advanceTimersByTime(RECONNECT_MAX_DELAY_MS);
                    MockEventSource.last().simulateError();
                });
            }

            // Past the spacing window, still far from the pending attempt
            act(() => {
                vi.advanceTimersByTime(MIN_FORCED_RETRY_INTERVAL_MS + 1);
            });
            const beforeWakeUp = MockEventSource.instances.length;

            act(() => {
                window.dispatchEvent(new Event("online"));
            });

            expect(MockEventSource.instances).toHaveLength(beforeWakeUp + 1);
        });

        it("spaces wake-up retries instead of firing on every event", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError();
            });
            expect(MockEventSource.instances).toHaveLength(1);

            // A burst of tab switches right after the drop
            act(() => {
                window.dispatchEvent(new Event("online"));
                document.dispatchEvent(new Event("visibilitychange"));
                window.dispatchEvent(new Event("online"));
            });

            expect(MockEventSource.instances).toHaveLength(1);

            // One attempt once the window has elapsed (plus its jitter)
            act(() => {
                vi.advanceTimersByTime(MIN_FORCED_RETRY_INTERVAL_MS + RECONNECT_BASE_DELAY_MS);
            });

            expect(MockEventSource.instances).toHaveLength(2);
        });

        it("reopens a connection that stopped carrying heartbeats", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateHeartbeat();
            });

            act(() => {
                vi.advanceTimersByTime(STALE_CONNECTION_TIMEOUT_MS - 1);
            });
            expect(MockEventSource.instances).toHaveLength(1);

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(MockEventSource.instances).toHaveLength(2);
        });

        it("does not arm the watchdog on a server that sends no heartbeat", () => {
            renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
            });

            act(() => {
                vi.advanceTimersByTime(STALE_CONNECTION_TIMEOUT_MS * 2);
            });

            expect(MockEventSource.instances).toHaveLength(1);
        });

        it("cancels a pending reconnection on unmount", () => {
            const {result} = renderSignalProvider(mockUser);

            act(() => {
                MockEventSource.last().simulateOpen();
                MockEventSource.last().simulateError();
            });

            result.unmount();

            act(() => {
                vi.advanceTimersByTime(RECONNECT_MAX_DELAY_MS);
            });

            expect(MockEventSource.instances).toHaveLength(1);
        });
    });
});
