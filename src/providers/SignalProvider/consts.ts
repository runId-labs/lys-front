/**
 * First reconnection delay, before exponential growth.
 */
export const RECONNECT_BASE_DELAY_MS = 1000;

/**
 * Upper bound of the exponential backoff.
 */
export const RECONNECT_MAX_DELAY_MS = 30000;

/**
 * Minimum spacing between two attempts triggered by a wake-up event.
 *
 * Regaining network or focus retries immediately, but those events fire repeatedly —
 * a user switching tabs, a fleet of laptops resuming at the same time — and an
 * unthrottled retry turns that into a burst on the API.
 */
export const MIN_FORCED_RETRY_INTERVAL_MS = 5000;

/**
 * Time without any byte from the server after which the connection is considered dead.
 *
 * The server sends a heartbeat every 15s; three missed heartbeats mean the socket is
 * open on our side but no longer carried end to end (a proxy half-close, typically).
 */
export const STALE_CONNECTION_TIMEOUT_MS = 45000;

/**
 * Name of the server heartbeat event.
 */
export const HEARTBEAT_EVENT = "heartbeat";
