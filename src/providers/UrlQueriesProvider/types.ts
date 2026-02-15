import * as React from "react";

type UrlQueryValue = number | string | boolean | null | undefined;

interface UrlQueriesProviderProps {
    children: React.ReactNode;
}

export type {
    UrlQueriesProviderProps,
    UrlQueryValue
};
