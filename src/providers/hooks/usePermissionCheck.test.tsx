import {describe, it, expect, vi, beforeEach} from "vitest";
import {renderHook} from "@testing-library/react";
import React from "react";
import {ConnectedUserContext} from "../ConnectedUserProvider/hooks";
import {WebserviceAccessContext} from "../WebserviceAccessProvider/hooks";
import {createMockConnectedUserContext, createMockWebserviceAccessContext, mockUser} from "../../test/test-utils";
import {usePermissionCheck} from "./usePermissionCheck";

function renderUsePermissionCheck(options: {
    operationNames: string[];
    accessParameters?: {ownerIds: string[]} | null;
    checkWebserviceAccess?: (name: string) => boolean;
    getWebserviceAccessLevels?: (name: string) => string[];
    userId?: string;
    noConnectedUser?: boolean;
} = {operationNames: []}) {
    const {
        operationNames,
        accessParameters,
        checkWebserviceAccess = () => true,
        getWebserviceAccessLevels = () => ["ROLE"],
        userId = mockUser.id,
        noConnectedUser = false,
    } = options;

    const connCtx = createMockConnectedUserContext({
        user: noConnectedUser ? undefined : {...mockUser, id: userId},
    });
    const wsCtx = createMockWebserviceAccessContext({
        checkWebserviceAccess,
        getWebserviceAccessLevels,
    });

    const wrapper = ({children}: {children: React.ReactNode}) => (
        <ConnectedUserContext.Provider value={connCtx}>
            <WebserviceAccessContext.Provider value={wsCtx}>
                {children}
            </WebserviceAccessContext.Provider>
        </ConnectedUserContext.Provider>
    );

    return renderHook(
        () => usePermissionCheck(operationNames, accessParameters),
        {wrapper}
    );
}

describe("usePermissionCheck", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns false for empty operation names", () => {
        const {result} = renderUsePermissionCheck({operationNames: []});

        expect(result.current).toBe(false);
    });

    it("returns true when user has ROLE access", () => {
        const {result} = renderUsePermissionCheck({
            operationNames: ["testWebservice"],
            getWebserviceAccessLevels: () => ["ROLE"],
        });

        expect(result.current).toBe(true);
    });

    it("returns false when webservice access is denied", () => {
        const {result} = renderUsePermissionCheck({
            operationNames: ["testWebservice"],
            checkWebserviceAccess: () => false,
        });

        expect(result.current).toBe(false);
    });

    it("requires all operations to have access", () => {
        const {result} = renderUsePermissionCheck({
            operationNames: ["allowed", "denied"],
            checkWebserviceAccess: (name) => name === "allowed",
        });

        expect(result.current).toBe(false);
    });

    describe("OWNER access level", () => {
        it("grants access when user is in ownerIds and OWNER is only level", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER"],
                accessParameters: {ownerIds: [mockUser.id]},
                userId: mockUser.id,
            });

            expect(result.current).toBe(true);
        });

        it("denies access when user is not in ownerIds and OWNER is only level", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER"],
                accessParameters: {ownerIds: ["other-user-id"]},
                userId: mockUser.id,
            });

            expect(result.current).toBe(false);
        });

        it("grants access when OWNER is only level and no owners are stated (the backend decides)", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER"],
                accessParameters: undefined,
            });

            expect(result.current).toBe(true);
        });

        it("grants access through non-OWNER levels even without accessParameters", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER", "ROLE"],
                accessParameters: undefined,
            });

            expect(result.current).toBe(true);
        });

        it("grants OWNER access when user is in ownerIds alongside other levels", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER", "ROLE"],
                accessParameters: {ownerIds: [mockUser.id]},
                userId: mockUser.id,
            });

            expect(result.current).toBe(true);
        });

        it("grants access when OWNER is only level and accessParameters is null", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER"],
                accessParameters: null,
            });

            expect(result.current).toBe(true);
        });

        it("denies access when OWNER is only level and the stated owners are empty", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER"],
                accessParameters: {ownerIds: []},
                userId: mockUser.id,
            });

            expect(result.current).toBe(false);
        });

        it("denies access when OWNER is only level, owners are stated and no user is connected", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER"],
                accessParameters: {ownerIds: [mockUser.id]},
                noConnectedUser: true,
            });

            expect(result.current).toBe(false);
        });

        it("grants access through non-OWNER levels when user is not in ownerIds", () => {
            const {result} = renderUsePermissionCheck({
                operationNames: ["testWebservice"],
                getWebserviceAccessLevels: () => ["OWNER", "ROLE"],
                accessParameters: {ownerIds: ["other-user-id"]},
                userId: mockUser.id,
            });

            expect(result.current).toBe(true);
        });
    });
});
