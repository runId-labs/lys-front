import {describe, it, expect} from "vitest";
import {act, renderHook} from "@testing-library/react";
import {useRelayPagination} from "./useRelayPagination";

describe("useRelayPagination", () => {
    it("starts on the first page with the given perPage", () => {
        const {result} = renderHook(() => useRelayPagination(10));

        expect(result.current.pageVars).toEqual({
            first: 10,
            last: null,
            after: null,
            before: null,
        });
    });

    it("applies a forward pagination change", () => {
        const {result} = renderHook(() => useRelayPagination(10));

        act(() => {
            result.current.onPaginationChange({first: 10, after: "cursor-1"});
        });

        expect(result.current.pageVars).toEqual({
            first: 10,
            last: null,
            after: "cursor-1",
            before: null,
        });
    });

    it("applies a backward pagination change", () => {
        const {result} = renderHook(() => useRelayPagination(10));

        act(() => {
            result.current.onPaginationChange({last: 10, before: "cursor-2"});
        });

        expect(result.current.pageVars).toEqual({
            first: null,
            last: 10,
            after: null,
            before: "cursor-2",
        });
    });

    it("resets to the first page on demand", () => {
        const {result} = renderHook(() => useRelayPagination(10));

        act(() => {
            result.current.onPaginationChange({first: 10, after: "cursor-1"});
        });
        act(() => {
            result.current.resetToFirstPage();
        });

        expect(result.current.pageVars).toEqual({
            first: 10,
            last: null,
            after: null,
            before: null,
        });
    });

    it("resyncs to the first page when perPage changes", () => {
        const {result, rerender} = renderHook(
            ({perPage}) => useRelayPagination(perPage),
            {initialProps: {perPage: 10}}
        );

        act(() => {
            result.current.onPaginationChange({first: 10, after: "cursor-1"});
        });

        rerender({perPage: 25});

        expect(result.current.pageVars).toEqual({
            first: 25,
            last: null,
            after: null,
            before: null,
        });
    });

    it("keeps the current page when rerendering with the same perPage", () => {
        const {result, rerender} = renderHook(
            ({perPage}) => useRelayPagination(perPage),
            {initialProps: {perPage: 10}}
        );

        act(() => {
            result.current.onPaginationChange({first: 10, after: "cursor-1"});
        });

        rerender({perPage: 10});

        expect(result.current.pageVars).toEqual({
            first: 10,
            last: null,
            after: "cursor-1",
            before: null,
        });
    });
});
