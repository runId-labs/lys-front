import React, {createContext, useState, useCallback, useMemo} from "react";
import {IntlProvider} from "react-intl";
import {LocaleProviderProps, LocaleContextInterface} from "./types";

/**
 * LocaleProvider context
 */
export const LocaleContext = createContext<LocaleContextInterface | undefined>(undefined);

/**
 * LocaleProvider component
 *
 * Wraps IntlProvider and provides a hook to dynamically change locale
 * Used by ConnectedUserProvider to update locale based on user's language preference
 */
const LocaleProvider: React.FC<LocaleProviderProps> = ({defaultLocale, messageSources, children}) => {
    /*******************************************************************************************************************
     *                                                  STATES
     ******************************************************************************************************************/

    const [locale, setLocale] = useState<string>(defaultLocale);

    /*******************************************************************************************************************
     *                                                  CALLBACKS
     ******************************************************************************************************************/

    /**
     * Update locale
     */
    const updateLocale = useCallback((newLocale: string) => {
        setLocale(newLocale);
    }, []);

    /*******************************************************************************************************************
     *                                                  MEMOS
     ******************************************************************************************************************/

    /**
     * Get messages for the current locale from the provided message sources
     */
    const messages = useMemo(() => {
        return messageSources[locale] || {};
    }, [locale, messageSources]);

    /*******************************************************************************************************************
     *                                                  RENDER
     ******************************************************************************************************************/

    return (
        <LocaleContext.Provider value={{locale, updateLocale}}>
            <IntlProvider locale={locale} messages={messages}>
                {children}
            </IntlProvider>
        </LocaleContext.Provider>
    );
};

export default LocaleProvider;
