/**
 * Shared types for Relay error handling across providers.
 *
 * Relay wraps GraphQL errors in a structure that is not fully typed by relay-runtime.
 * These types capture the known error shapes used in lys-front providers.
 */

/**
 * A single GraphQL error from the server response.
 */
export interface GraphQLError {
    message: string;
    severity?: string;
    extensions?: Record<string, unknown>;
}

/**
 * Relay network error shape.
 * When a Relay mutation or query fails, the error object may contain
 * a `source` property with the original GraphQL errors from the server.
 */
export interface RelayNetworkError extends Error {
    source?: {
        errors?: GraphQLError[];
    };
}

/**
 * Type guard to check if an unknown error is a Relay network error with source errors.
 */
export function isRelayNetworkError(error: unknown): error is RelayNetworkError {
    return (
        typeof error === "object" &&
        error !== null &&
        "source" in error &&
        typeof (error as RelayNetworkError).source === "object"
    );
}

/**
 * App description structure used by routeTools.generateRouteTable.
 * Represents the top-level application descriptor containing component registrations.
 */
export interface AppDescription {
    components?: {
        pages?: Record<string, import("./descriptionTypes").PageDescriptionType>;
        features?: Record<string, import("./descriptionTypes").ComponentDescriptionType>;
        elements?: Record<string, import("./descriptionTypes").ComponentDescriptionType>;
        restrictedFeatures?: Record<string, import("./descriptionTypes").ComponentDescriptionType>;
    };
}

