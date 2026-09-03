import {useCallback, useEffect, useMemo, useState} from "react";
import type {PaginationChangeEvent} from "../../types/relayTypes";

/**
 * Cursor variables a Relay connection query takes, as a pager produces them.
 */
export interface RelayPageVars {
    first: number | null;
    last: number | null;
    after: string | null;
    before: string | null;
}

export interface RelayPagination {
    /** Spread into the query parameters. */
    pageVars: RelayPageVars;

    /**
     * Back to page one. Call it whenever a filter changes: cursors describe a position in
     * a result set, so they point nowhere once the set they were computed on is replaced.
     */
    resetToFirstPage: () => void;

    /** Wire to the pager's change handler. */
    onPaginationChange: (event: PaginationChangeEvent) => void;
}

/**
 * Server-side pagination state for a Relay connection.
 *
 * Holds the cursor variables and the page size in one place, so every paginated list
 * stops repeating the same page-vars shape, first-page constant and change handler -
 * copies that are free to drift on the details that matter: which cursor wins, and when
 * the position has to be dropped.
 *
 * Resetting on a filter change is deliberately left to the caller: what invalidates a
 * position is a filter change the hook cannot know about. A `perPage` change is handled
 * automatically, since the hook owns that value already.
 */
export function useRelayPagination(perPage: number): RelayPagination {
    const firstPage = useMemo<RelayPageVars>(
        () => ({first: perPage, last: null, after: null, before: null}),
        [perPage]
    );

    const [pageVars, setPageVars] = useState<RelayPageVars>(firstPage);

    const resetToFirstPage = useCallback(() => setPageVars(firstPage), [firstPage]);

    useEffect(() => {
        setPageVars(firstPage);
    }, [perPage, firstPage]);

    const onPaginationChange = useCallback((event: PaginationChangeEvent) => {
        setPageVars({
            first: event.first ?? null,
            last: event.last ?? null,
            after: event.after ?? null,
            before: event.before ?? null,
        });
    }, []);

    return {pageVars, resetToFirstPage, onPaginationChange};
}
