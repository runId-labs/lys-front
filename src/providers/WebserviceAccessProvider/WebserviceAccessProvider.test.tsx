import {describe, it, expect, vi, beforeEach} from "vitest";
import {render, act, screen} from "@testing-library/react";
import {IntlProvider} from "react-intl";
import {ConnectedUserContext} from "../ConnectedUserProvider/hooks";
import {createMockConnectedUserContext, mockUser} from "../../test/test-utils";
import {useWebserviceAccess} from "./hooks";

/**
 * Mock react-relay
 */
let mockQueryRef: object | null = null;
let mockLoadQuery: ReturnType<typeof vi.fn>;
let mockDisposeQuery: ReturnType<typeof vi.fn>;
let mockPreloadedData: Record<string, unknown> = {};

vi.mock("react-relay", () => ({
    graphql: (strings: TemplateStringsArray) => ({__mock: true, text: strings[0]}),
    useQueryLoader: () => [mockQueryRef, mockLoadQuery, mockDisposeQuery],
    usePreloadedQuery: () => mockPreloadedData,
}));

// Import after mocks
import WebserviceAccessProvider from "./index";

/**
 * Translation messages for tests
 */
const messages: Record<string, string> = {
    "lys.components.providers.webserviceAccessProvider.errorTitle": "Permission System Error",
    "lys.components.providers.webserviceAccessProvider.errorMessage": "Unable to load permission system.",
    "lys.components.providers.webserviceAccessProvider.loadingPermissions": "Loading permissions...",
};

/**
 * Test consumer exposing webservice access context
 */
const AccessConsumer = ({onValue}: {onValue: (ctx: ReturnType<typeof useWebserviceAccess>) => void}) => {
    const ctx = useWebserviceAccess();
    onValue(ctx);
    return <div>Access consumer</div>;
};

function renderWebserviceAccessProvider(options: {
    user?: typeof mockUser | undefined;
    handleSessionExpired?: () => void;
} = {}) {
    const {user, handleSessionExpired} = options;
    const connCtx = createMockConnectedUserContext({
        user: user !== undefined ? user : mockUser,
        handleSessionExpired: handleSessionExpired ?? (() => {}),
    });
    let latestCtx: ReturnType<typeof useWebserviceAccess> | null = null;

    const result = render(
        <IntlProvider locale="en" messages={messages}>
            <ConnectedUserContext.Provider value={connCtx}>
                <WebserviceAccessProvider>
                    <AccessConsumer onValue={(v) => {latestCtx = v;}}/>
                </WebserviceAccessProvider>
            </ConnectedUserContext.Provider>
        </IntlProvider>
    );

    return {result, getCtx: () => latestCtx!, connCtx};
}

describe("WebserviceAccessProvider", () => {
    beforeEach(() => {
        mockQueryRef = null;
        mockLoadQuery = vi.fn();
        mockDisposeQuery = vi.fn();
        mockPreloadedData = {allAccessibleWebservices: {edges: []}};
    });

    it("renders children", () => {
        renderWebserviceAccessProvider();

        expect(screen.getByText("Access consumer")).toBeInTheDocument();
    });

    it("loads query on mount", () => {
        renderWebserviceAccessProvider();

        expect(mockLoadQuery).toHaveBeenCalledWith({}, {fetchPolicy: "network-only"});
    });

    describe("context value", () => {
        it("checkWebserviceAccess returns false when no data loaded", () => {
            const {getCtx} = renderWebserviceAccessProvider();

            expect(getCtx().checkWebserviceAccess("some_webservice")).toBe(false);
        });

        it("getWebserviceAccessLevels returns empty array when no data loaded", () => {
            const {getCtx} = renderWebserviceAccessProvider();

            expect(getCtx().getWebserviceAccessLevels("some_webservice")).toEqual([]);
        });

        it("provides checkWebserviceAccess after data is loaded", () => {
            mockQueryRef = {__id: "ref"};
            mockPreloadedData = {
                allAccessibleWebservices: {
                    edges: [
                        {node: {code: "user_management", userAccessLevels: [{code: "ROLE"}]}},
                        {node: {code: "billing", userAccessLevels: [{code: "OWNER"}, {code: "ROLE"}]}},
                    ],
                },
            };

            const {getCtx} = renderWebserviceAccessProvider();

            // After data load, the QueryExecutor sets the webservices map
            expect(getCtx().checkWebserviceAccess("user_management")).toBe(true);
            expect(getCtx().checkWebserviceAccess("billing")).toBe(true);
            expect(getCtx().checkWebserviceAccess("unknown_service")).toBe(false);
        });

        it("converts camelCase to snake_case for access check", () => {
            mockQueryRef = {__id: "ref"};
            mockPreloadedData = {
                allAccessibleWebservices: {
                    edges: [
                        {node: {code: "user_management", userAccessLevels: [{code: "ROLE"}]}},
                    ],
                },
            };

            const {getCtx} = renderWebserviceAccessProvider();

            // toSnakeCase("userManagement") => "user_management"
            expect(getCtx().checkWebserviceAccess("userManagement")).toBe(true);
        });

        it("provides access levels for webservices", () => {
            mockQueryRef = {__id: "ref"};
            mockPreloadedData = {
                allAccessibleWebservices: {
                    edges: [
                        {node: {code: "billing", userAccessLevels: [{code: "OWNER"}, {code: "ROLE"}]}},
                    ],
                },
            };

            const {getCtx} = renderWebserviceAccessProvider();

            expect(getCtx().getWebserviceAccessLevels("billing")).toEqual(["OWNER", "ROLE"]);
        });
    });

    describe("default context (outside provider)", () => {
        it("warns when used without provider", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            let ctx: ReturnType<typeof useWebserviceAccess> | null = null;

            render(
                <AccessConsumer onValue={(v) => {ctx = v;}}/>
            );

            ctx!.checkWebserviceAccess("test");
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not initialized"));

            warnSpy.mockRestore();
        });
    });
});
