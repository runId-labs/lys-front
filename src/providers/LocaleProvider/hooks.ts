import {useContext} from "react";
import {LocaleContext} from "./index";
import {LocaleContextInterface} from "./types";

/**
 * Hook to access locale context
 */
export const useLocale = (): LocaleContextInterface => {
    const context = useContext(LocaleContext);

    if (!context) {
        throw new Error("useLocale must be used within LocaleProvider");
    }

    return context;
};
