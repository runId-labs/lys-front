import {describe, it, expect} from "vitest";
import {generateUrl, generateUrlByRoute, generateRouteFromDescription, generateRouteTable} from "./routeTools";
import {PageDescriptionType} from "../types/descriptionTypes";

describe("generateUrl", () => {
    it("replaces path parameters", () => {
        expect(generateUrl("/user/:id", {id: "42"})).toBe("/user/42");
    });

    it("replaces multiple path parameters", () => {
        expect(generateUrl("/org/:orgId/user/:userId", {orgId: "1", userId: "2"}))
            .toBe("/org/1/user/2");
    });

    it("returns path unchanged when no parameters", () => {
        expect(generateUrl("/users")).toBe("/users");
    });

    it("appends query parameters", () => {
        const result = generateUrl("/users", {}, {page: "1", limit: "10"});
        expect(result).toContain("/users?");
        expect(result).toContain("page=1");
        expect(result).toContain("limit=10");
    });

    it("combines path and query parameters", () => {
        const result = generateUrl("/user/:id", {id: "42"}, {tab: "settings"});
        expect(result).toBe("/user/42?tab=settings");
    });

    it("handles empty parameters object", () => {
        expect(generateUrl("/users", {})).toBe("/users");
    });
});

describe("generateUrlByRoute", () => {
    it("delegates to generateUrl with route.path", () => {
        const route = {path: "/user/:id"} as any;
        expect(generateUrlByRoute(route, {id: "5"})).toBe("/user/5");
    });

    it("passes query parameters", () => {
        const route = {path: "/users"} as any;
        const result = generateUrlByRoute(route, {}, {sort: "name"});
        expect(result).toBe("/users?sort=name");
    });
});

describe("generateRouteFromDescription", () => {
    const mockComponent = () => null;
    const pageDescription: PageDescriptionType = {
        name: "UserProfile",
        component: mockComponent,
        type: "private",
        path: "/user/profile",
        breadcrumbs: ["Home", "UserProfile"],
        options: {showSidebar: true},
        mainWebserviceName: "user_profile",
    };

    it("generates correct transPrefix", () => {
        const route = generateRouteFromDescription(pageDescription);
        expect(route.transPrefix).toBe("lys.components.pages.userProfile.");
    });

    it("maps all fields from page description", () => {
        const route = generateRouteFromDescription(pageDescription);
        expect(route.name).toBe("UserProfile");
        expect(route.path).toBe("/user/profile");
        expect(route.component).toBe(mockComponent);
        expect(route.type).toBe("private");
        expect(route.breadcrumbs).toEqual(["Home", "UserProfile"]);
        expect(route.options).toEqual({showSidebar: true});
        expect(route.mainWebserviceName).toBe("user_profile");
    });

    it("sets template from description", () => {
        const withTemplate: PageDescriptionType = {
            ...pageDescription,
            template: "default",
        };
        const route = generateRouteFromDescription(withTemplate);
        expect(route.template).toBe("default");
    });

    it("uses custom transPrefix when provided", () => {
        const route = generateRouteFromDescription(pageDescription, "myApp.pages.");
        expect(route.transPrefix).toBe("myApp.pages.userProfile.");
    });
});

describe("generateRouteTable", () => {
    const mockComponent = () => null;

    it("generates routes from app description pages", () => {
        const appDescription = {
            components: {
                pages: {
                    Home: {
                        name: "Home",
                        component: mockComponent,
                        type: "public" as const,
                        path: "/",
                    },
                    Dashboard: {
                        name: "Dashboard",
                        component: mockComponent,
                        type: "private" as const,
                        path: "/dashboard",
                    },
                },
            },
        };

        const routes = generateRouteTable(appDescription);
        expect(routes).toHaveLength(2);
        expect(routes[0].name).toBe("Home");
        expect(routes[1].name).toBe("Dashboard");
    });

    it("handles null appDescription", () => {
        const routes = generateRouteTable(null);
        expect(routes).toEqual([]);
    });

    it("handles missing components.pages", () => {
        const routes = generateRouteTable({components: {}});
        expect(routes).toEqual([]);
    });

    it("uses custom transPrefix for all generated routes", () => {
        const appDescription = {
            components: {
                pages: {
                    Home: {
                        name: "Home",
                        component: mockComponent,
                        type: "public" as const,
                        path: "/",
                    },
                },
            },
        };

        const routes = generateRouteTable(appDescription, "custom.prefix.");
        expect(routes[0].transPrefix).toBe("custom.prefix.home.");
    });
});
