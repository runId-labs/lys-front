import {createContext, useContext} from "react";
import {LysQueryContextType} from "./types";
import {OperationType} from "relay-runtime";

const LysQueryContext = createContext<LysQueryContextType>([
    undefined,
    () => {},
]);

/**
 * Hook to access query data and reload function from LysQueryProvider
 */
function useLysQuery<TQuery extends OperationType = OperationType>(): LysQueryContextType<TQuery> {
    return useContext(LysQueryContext) as LysQueryContextType<TQuery>;
}

export {
    LysQueryContext,
    useLysQuery
};
