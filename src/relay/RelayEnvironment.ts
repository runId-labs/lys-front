import { Environment, Network, RecordSource, Store } from "relay-runtime";

let graphqlEndpoint = "/graphql";

/**
 * Configure the GraphQL endpoint used by Relay
 * Call this before any GraphQL operations if the endpoint differs from "/graphql"
 */
export function configureRelayEndpoint(endpoint: string) {
    graphqlEndpoint = endpoint;
}

/**
 * Read the XSRF-TOKEN cookie value set by the server (Double Submit Cookie pattern).
 * The cookie is non-httpOnly so JavaScript can read it.
 */
function getXsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch function for GraphQL operations
 */
async function fetchGraphQL(params: { text: string | null | undefined }, variables: Record<string, unknown>) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    const xsrfToken = getXsrfToken();
    if (xsrfToken) {
        headers["X-XSRF-TOKEN"] = xsrfToken;
    }

    const response = await fetch(graphqlEndpoint, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
            query: params.text,
            variables,
        }),
    });

    const json = await response.json();

    if (response.status === 401) {
        console.warn("Session expired, please log in again");
    }

    return json;
}

/**
 * Relay network fetch function
 */
function fetchRelay(params: { text: string | null | undefined }, variables: Record<string, unknown>) {
    return fetchGraphQL(params, variables);
}

// Create Relay environment with accessible store
const store = new Store(new RecordSource());

const RelayEnvironment = new Environment({
    network: Network.create(fetchRelay),
    store,
});

/**
 * Clear the Relay store cache
 * Should be called on logout to remove all cached data
 */
export function clearRelayCache() {
    // RecordSource has clear() but it's not in relay-runtime's type definitions
    (store.getSource() as unknown as {clear: () => void}).clear();
}

export default RelayEnvironment;
