import {createContext, useContext} from "react";
import {ReactNode} from "react";

interface LysLoadingContextType {
    loadingFallback: ReactNode;
}

const LysLoadingContext = createContext<LysLoadingContextType>({
    loadingFallback: null
});

export const useLysLoadingFallback = (): ReactNode => {
    const {loadingFallback} = useContext(LysLoadingContext);
    return loadingFallback;
};

export default LysLoadingContext;
