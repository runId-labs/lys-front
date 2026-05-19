import {describe, it, expect, vi} from "vitest";
import {render, screen, act} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router-dom";
import RouteProvider, {RouteTemplateProps} from "./index";
import {PageContextContext} from "../PageContextProvider/hooks";
import {PageContextValue} from "../PageContextProvider/types";
import {UrlQueriesContext} from "../UrlQueriesProvider/hooks";
import {ChatbotContext} from "../ChatbotProvider/hooks";
import {ChatbotContextValue} from "../ChatbotProvider/types";
import {RouteInterface} from "../../types/routeTypes";

const dummyComponent = () => null;

const makeRoute = (overrides: Partial<RouteInterface> = {}): RouteInterface => ({
    name: "TestPage",
    transPrefix: "test.",
    path: "/test",
    component: dummyComponent,
    type: "private",
    ...overrides,
});

const PrivateTestTemplate: React.ComponentType<RouteTemplateProps> = ({route, children}) => (
    <div data-testid="private-template">
        <span data-testid="route-name">{route.name}</span>
        {children}
    </div>
);

const PublicTestTemplate: React.ComponentType<RouteTemplateProps> = ({route, children}) => (
    <div data-testid="public-template">
        <span data-testid="route-name">{route.name}</span>
        {children}
    </div>
);

interface HarnessOptions {
    route: RouteInterface;
    routes?: RouteInterface[];
    defaultPrivateRoute?: RouteInterface;
    defaultPublicRoute?: RouteInterface;
    appliedParams?: URLSearchParams;
    setPageContext?: PageContextValue["setPageContext"];
    setIsChatbotMode?: ChatbotContextValue["setIsChatbotMode"];
    publicTemplate?: React.ComponentType<RouteTemplateProps>;
}

function renderRouteProvider(options: HarnessOptions) {
    const {
        route,
        routes = [route],
        defaultPrivateRoute = makeRoute({name: "Home", path: "/"}),
        defaultPublicRoute = makeRoute({name: "Login", path: "/login", type: "public"}),
        appliedParams = new URLSearchParams(),
        setPageContext = vi.fn(),
        setIsChatbotMode = vi.fn(),
        publicTemplate = PublicTestTemplate,
    } = options;

    const pageCtx: PageContextValue = {
        context: {pageName: null, params: {}},
        setPageContext,
        updatePageParams: vi.fn(),
        clearPageContext: vi.fn(),
    };

    const urlCtx = {
        hasStagedChanges: false,
        appliedParams,
        stagedParams: {},
        stage: vi.fn(),
        edit: vi.fn(),
        update: vi.fn(),
        apply: vi.fn(),
    };

    const chatCtx: ChatbotContextValue = {
        messages: [],
        conversationId: null,
        isChatbotMode: false,
        isChatbotEnabled: true,
        isStreaming: false,
        refreshSignal: {nodes: [], version: 0},
        setMessages: vi.fn(),
        setConversationId: vi.fn(),
        setIsChatbotMode,
        setIsChatbotEnabled: vi.fn(),
        setIsStreaming: vi.fn(),
        addMessage: vi.fn(),
        updateLastMessage: vi.fn(),
        clearConversation: vi.fn(),
        triggerRefresh: vi.fn(),
    };

    const result = render(
        <MemoryRouter>
            <PageContextContext.Provider value={pageCtx}>
                <UrlQueriesContext.Provider value={urlCtx}>
                    <ChatbotContext.Provider value={chatCtx}>
                        <RouteProvider
                            route={route}
                            routes={routes}
                            defaultPrivateRoute={defaultPrivateRoute}
                            defaultPublicRoute={defaultPublicRoute}
                            privateTemplate={PrivateTestTemplate}
                            publicTemplate={publicTemplate}
                        >
                            <div data-testid="page-content">page</div>
                        </RouteProvider>
                    </ChatbotContext.Provider>
                </UrlQueriesContext.Provider>
            </PageContextContext.Provider>
        </MemoryRouter>
    );

    return {result, setPageContext, setIsChatbotMode};
}

describe("RouteProvider", () => {
    describe("template selection", () => {
        it("renders the private template when route.type is private", () => {
            renderRouteProvider({route: makeRoute({type: "private"})});

            expect(screen.getByTestId("private-template")).toBeInTheDocument();
            expect(screen.queryByTestId("public-template")).not.toBeInTheDocument();
            expect(screen.getByTestId("page-content")).toBeInTheDocument();
        });

        it("renders the public template when route.type is public", () => {
            renderRouteProvider({route: makeRoute({type: "public"})});

            expect(screen.getByTestId("public-template")).toBeInTheDocument();
            expect(screen.queryByTestId("private-template")).not.toBeInTheDocument();
            expect(screen.getByTestId("page-content")).toBeInTheDocument();
        });

        it("passes the active route name to the rendered template", () => {
            renderRouteProvider({route: makeRoute({name: "DashboardPage"})});

            expect(screen.getByTestId("route-name")).toHaveTextContent("DashboardPage");
        });
    });

    describe("page context wiring", () => {
        it("calls setPageContext with route name and empty params when no URL params", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "HomePage"}),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("HomePage", {});
        });

        it("converts numeric URL params to numbers", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "ListPage"}),
                appliedParams: new URLSearchParams("page=2&limit=50"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("ListPage", {page: 2, limit: 50});
        });

        it("keeps empty-string URL params as strings (does not coerce to 0)", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "SearchPage"}),
                appliedParams: new URLSearchParams("q=&page=1"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("SearchPage", {q: "", page: 1});
        });

        it("keeps non-numeric URL params as strings", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "ProfilePage"}),
                appliedParams: new URLSearchParams("name=alice&status=active"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("ProfilePage", {
                name: "alice",
                status: "active",
            });
        });

        it("folds orderBy + orderDir=DESC into {field: false}", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "ListPage"}),
                appliedParams: new URLSearchParams("orderBy=createdAt&orderDir=DESC"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("ListPage", {
                orderBy: {createdAt: false},
            });
        });

        it("folds orderBy + orderDir=ASC into {field: true}", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "ListPage"}),
                appliedParams: new URLSearchParams("orderBy=name&orderDir=ASC"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("ListPage", {
                orderBy: {name: true},
            });
        });

        it("defaults orderDir to ASC when orderBy is set without orderDir", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "ListPage"}),
                appliedParams: new URLSearchParams("orderBy=name"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("ListPage", {
                orderBy: {name: true},
            });
        });

        it("ignores orderDir when orderBy is missing", () => {
            const setPageContext = vi.fn();
            renderRouteProvider({
                route: makeRoute({name: "ListPage"}),
                appliedParams: new URLSearchParams("orderDir=DESC&page=3"),
                setPageContext,
            });

            expect(setPageContext).toHaveBeenCalledWith("ListPage", {page: 3});
        });
    });

    describe("chatbot auto-open", () => {
        it("opens the chatbot when route.autoOpenChatbot is true", () => {
            const setIsChatbotMode = vi.fn();
            renderRouteProvider({
                route: makeRoute({autoOpenChatbot: true}),
                setIsChatbotMode,
            });

            expect(setIsChatbotMode).toHaveBeenCalledWith(true);
        });

        it("does not open the chatbot when route.autoOpenChatbot is falsy", () => {
            const setIsChatbotMode = vi.fn();
            renderRouteProvider({
                route: makeRoute({autoOpenChatbot: false}),
                setIsChatbotMode,
            });

            expect(setIsChatbotMode).not.toHaveBeenCalled();
        });
    });

    describe("useRouteInfo wiring", () => {
        it("exposes the active route, defaults and a getRouteByName lookup", async () => {
            const {useRouteInfo} = await import("./hooks");

            const captured: {value: ReturnType<typeof useRouteInfo> | null} = {value: null};
            const Probe = () => {
                captured.value = useRouteInfo();
                return null;
            };

            const route = makeRoute({name: "Active"});
            const other = makeRoute({name: "Other", path: "/other"});
            const defaultPrivate = makeRoute({name: "Home", path: "/"});
            const defaultPublic = makeRoute({name: "Login", path: "/login", type: "public"});

            const pageCtx: PageContextValue = {
                context: {pageName: null, params: {}},
                setPageContext: vi.fn(),
                updatePageParams: vi.fn(),
                clearPageContext: vi.fn(),
            };

            const urlCtx = {
                hasStagedChanges: false,
                appliedParams: new URLSearchParams(),
                stagedParams: {},
                stage: vi.fn(),
                edit: vi.fn(),
                update: vi.fn(),
                apply: vi.fn(),
            };

            const chatCtx: ChatbotContextValue = {
                messages: [],
                conversationId: null,
                isChatbotMode: false,
                isChatbotEnabled: true,
                isStreaming: false,
                refreshSignal: {nodes: [], version: 0},
                setMessages: vi.fn(),
                setConversationId: vi.fn(),
                setIsChatbotMode: vi.fn(),
                setIsChatbotEnabled: vi.fn(),
                setIsStreaming: vi.fn(),
                addMessage: vi.fn(),
                updateLastMessage: vi.fn(),
                clearConversation: vi.fn(),
                triggerRefresh: vi.fn(),
            };

            await act(async () => {
                render(
                    <MemoryRouter>
                        <PageContextContext.Provider value={pageCtx}>
                            <UrlQueriesContext.Provider value={urlCtx}>
                                <ChatbotContext.Provider value={chatCtx}>
                                    <RouteProvider
                                        route={route}
                                        routes={[route, other]}
                                        defaultPrivateRoute={defaultPrivate}
                                        defaultPublicRoute={defaultPublic}
                                        privateTemplate={PrivateTestTemplate}
                                    >
                                        <Probe/>
                                    </RouteProvider>
                                </ChatbotContext.Provider>
                            </UrlQueriesContext.Provider>
                        </PageContextContext.Provider>
                    </MemoryRouter>
                );
            });

            expect(captured.value?.route).toBe(route);
            expect(captured.value?.defaultPrivateRoute).toBe(defaultPrivate);
            expect(captured.value?.defaultPublicRoute).toBe(defaultPublic);
            expect(captured.value?.allRoutes).toEqual({Active: route, Other: other});
            expect(captured.value?.getRouteByName("Other")).toBe(other);
            expect(captured.value?.getRouteByName("Missing")).toBeUndefined();
        });
    });
});
