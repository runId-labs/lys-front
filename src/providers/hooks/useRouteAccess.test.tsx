import {describe, it, expect} from "vitest";
import {renderHook} from "@testing-library/react";
import React from "react";
import {WebserviceAccessContext} from "../WebserviceAccessProvider/hooks";
import {RouteContext} from "../RouteProvider/hooks";
import {createMockWebserviceAccessContext} from "../../test/test-utils";
import {useRouteAccess} from "./useRouteAccess";
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

function renderUseRouteAccess(options: {
    checkWebserviceAccess?: (name: string) => boolean;
    routesByName?: Record<string, RouteInterface>;
} = {}) {
    const {
        checkWebserviceAccess = () => true,
        routesByName = {},
    } = options;

    const wsCtx = createMockWebserviceAccessContext({checkWebserviceAccess});

    const wrapper = ({children}: {children: React.ReactNode}) => (
        <WebserviceAccessContext.Provider value={wsCtx}>
            <RouteContext.Provider value={{
                route: null,
                defaultPrivateRoute: null,
                defaultPublicRoute: null,
                allRoutes: routesByName,
                getRouteByName: (name: string) => routesByName[name],
            }}>
                {children}
            </RouteContext.Provider>
        </WebserviceAccessContext.Provider>
    );

    return renderHook(() => useRouteAccess(), {wrapper});
}

describe("useRouteAccess", () => {
    it("returns false for undefined input", () => {
        const {result} = renderUseRouteAccess();

        expect(result.current(undefined)).toBe(false);
    });

    it("returns true when route has no mainWebserviceName (no gate)", () => {
        const {result} = renderUseRouteAccess({checkWebserviceAccess: () => false});

        expect(result.current(makeRoute())).toBe(true);
    });

    it("delegates to checkWebserviceAccess for single string mainWebserviceName", () => {
        const {result} = renderUseRouteAccess({
            checkWebserviceAccess: (name) => name === "allowed",
        });

        expect(result.current(makeRoute({mainWebserviceName: "allowed"}))).toBe(true);
        expect(result.current(makeRoute({mainWebserviceName: "denied"}))).toBe(false);
    });

    it("grants access when at least one webservice in the array is allowed (any-of)", () => {
        const {result} = renderUseRouteAccess({
            checkWebserviceAccess: (name) => name === "allowed",
        });

        expect(result.current(makeRoute({
            mainWebserviceName: ["denied", "allowed", "other"],
        }))).toBe(true);
    });

    it("denies access when no webservice in the array is allowed (any-of)", () => {
        const {result} = renderUseRouteAccess({
            checkWebserviceAccess: () => false,
        });

        expect(result.current(makeRoute({
            mainWebserviceName: ["a", "b", "c"],
        }))).toBe(false);
    });

    it("denies access on an empty array (any-of with no candidates)", () => {
        const {result} = renderUseRouteAccess({
            checkWebserviceAccess: () => true,
        });

        expect(result.current(makeRoute({mainWebserviceName: []}))).toBe(false);
    });

    it("resolves a route by name via the RouteProvider map", () => {
        const route = makeRoute({name: "AdminPage", mainWebserviceName: "admin"});
        const {result} = renderUseRouteAccess({
            checkWebserviceAccess: (name) => name === "admin",
            routesByName: {AdminPage: route},
        });

        expect(result.current("AdminPage")).toBe(true);
    });

    it("returns false when name lookup yields no route", () => {
        const {result} = renderUseRouteAccess();

        expect(result.current("UnknownPage")).toBe(false);
    });
});
