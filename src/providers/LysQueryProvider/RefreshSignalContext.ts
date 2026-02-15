import {createContext, useContext} from "react";

export interface RefreshSignal {
    nodes: string[];
    version: number;
}

const RefreshSignalContext = createContext<RefreshSignal>({nodes: [], version: 0});

export const useRefreshSignal = (): RefreshSignal => {
    return useContext(RefreshSignalContext);
};

export default RefreshSignalContext;
