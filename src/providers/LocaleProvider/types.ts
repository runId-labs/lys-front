import {ReactNode} from "react";

/**
 * LocaleProvider props
 */
export interface LocaleProviderProps {
    /**
     * Default locale to use on initialization
     */
    defaultLocale: string;

    /**
     * Pre-merged translation message sources (one per locale)
     * These are passed in from the consuming project
     */
    messageSources: {[locale: string]: {[key: string]: string}};

    /**
     * Children components
     */
    children: ReactNode;
}

/**
 * Locale context interface
 */
export interface LocaleContextInterface {
    /**
     * Current locale
     */
    locale: string;

    /**
     * Update locale
     */
    updateLocale: (locale: string) => void;
}
