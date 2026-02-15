import React, {ReactElement} from "react";
import {render, RenderOptions} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {IntlProvider} from "react-intl";
import {ConnectedUserContext} from "../providers/ConnectedUserProvider/hooks";
import {ConnectedUserInterface} from "../providers/ConnectedUserProvider/types";
import {WebserviceAccessContext} from "../providers/WebserviceAccessProvider/hooks";
import {AlertMessageContext} from "../providers/AlertMessageProvider/hooks";

/**
 * Mock connected user for testing
 */
export const mockUser: ConnectedUserInterface = {
    id: "test-user-id-123",
    clientId: "test-client-id-456",
    emailAddress: {
        id: "email-id-1",
        address: "test@example.com",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        validatedAt: "2024-01-01T00:00:00Z",
        lastValidationRequestAt: null,
    },
    status: {id: "status-1", code: "ACTIVE"},
    language: {id: "lang-1", code: "en"},
    privateData: {
        firstName: "Test",
        lastName: "User",
        gender: {id: "gender-1", code: "MALE"},
    },
};

/**
 * Create a mock ConnectedUserContext value
 */
export function createMockConnectedUserContext(overrides: {
    user?: ConnectedUserInterface | undefined;
    push?: (webservice: () => void) => void;
    login?: [(login: string, password: string) => void, boolean];
    logout?: [() => void, boolean];
    refresh?: [() => void, boolean];
    handleSessionExpired?: (onRefreshSuccess?: () => void) => void;
} = {}) {
    return {
        user: "user" in overrides ? overrides.user : mockUser,
        push: overrides.push ?? ((cb: () => void) => cb()),
        login: overrides.login ?? [() => {}, false] as [(login: string, password: string) => void, boolean],
        logout: overrides.logout ?? [() => {}, false] as [() => void, boolean],
        refresh: overrides.refresh ?? [() => {}, false] as [() => void, boolean],
        handleSessionExpired: overrides.handleSessionExpired ?? (() => {}),
    };
}

/**
 * Create a mock WebserviceAccessContext value
 */
export function createMockWebserviceAccessContext(overrides: {
    checkWebserviceAccess?: (webservice: string) => boolean;
    getWebserviceAccessLevels?: (webservice: string) => string[];
} = {}) {
    return {
        checkWebserviceAccess: overrides.checkWebserviceAccess ?? (() => true),
        getWebserviceAccessLevels: overrides.getWebserviceAccessLevels ?? (() => ["ROLE"]),
    };
}

/**
 * Options for renderWithProviders
 */
interface ProvidersOptions {
    user?: ConnectedUserInterface | undefined;
    connectedUserContext?: ReturnType<typeof createMockConnectedUserContext>;
    webserviceAccessContext?: ReturnType<typeof createMockWebserviceAccessContext>;
    alertMerge?: (messages: {text: string; level: string}[]) => void;
    routerEntries?: string[];
    locale?: string;
    messages?: Record<string, string>;
}

/**
 * Render with common providers for testing
 *
 * Wraps component with:
 * - MemoryRouter (for react-router-dom hooks)
 * - IntlProvider (for react-intl)
 * - ConnectedUserContext.Provider (mocked)
 * - WebserviceAccessContext.Provider (mocked)
 * - AlertMessageContext.Provider (mocked)
 */
export function renderWithProviders(
    ui: ReactElement,
    options: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {}
) {
    const {
        user,
        connectedUserContext,
        webserviceAccessContext,
        alertMerge,
        routerEntries = ["/"],
        locale = "en",
        messages = {},
        ...renderOptions
    } = options;

    const connCtx = connectedUserContext ?? createMockConnectedUserContext(user !== undefined ? {user} : {});
    const wsCtx = webserviceAccessContext ?? createMockWebserviceAccessContext();
    const mergeFn = alertMerge ?? (() => {});

    function Wrapper({children}: {children: React.ReactNode}) {
        return (
            <IntlProvider locale={locale} messages={messages}>
                <AlertMessageContext.Provider value={{merge: mergeFn}}>
                    <ConnectedUserContext.Provider value={connCtx}>
                        <WebserviceAccessContext.Provider value={wsCtx}>
                            <MemoryRouter initialEntries={routerEntries}>
                                {children}
                            </MemoryRouter>
                        </WebserviceAccessContext.Provider>
                    </ConnectedUserContext.Provider>
                </AlertMessageContext.Provider>
            </IntlProvider>
        );
    }

    return render(ui, {wrapper: Wrapper, ...renderOptions});
}
