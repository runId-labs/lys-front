/**
 * Centralized i18n utility functions
 */
import {isEmpty} from "./validationTools";

/**
 * Generate translation table for a specified language
 * @param locale - Target language code
 * @param table - Translation data structure to traverse (heterogeneous nested object)
 * @param prefix - Translation key prefix for namespacing
 */
const generateI18nTable = (
    locale: string,
    table: Record<string, unknown>,
    prefix: string=''
) => {
    let generatedTable: { [key: string] : string} = {};
    Object.entries(table).forEach(([key, value])  => {
        // ending condition
        if(key === locale)
            generatedTable[prefix] = value as string
        // recursive loop
        else if (typeof value == 'object' && !isEmpty(value)) {
            let newPrefix: string;
            if(key !== "translation") {
                newPrefix = prefix ? prefix + '.' + key : key;
            } else {
                newPrefix = prefix;
            }

            generatedTable = {
                ...generateI18nTable(locale, value as Record<string, unknown>, newPrefix),
                ...generatedTable
            }
        }
    });

    return generatedTable
};

/**
 * Generate translation table for all specified languages
 * @param locales - Array of language codes to generate translations for
 * @param table - Translation data structure to traverse (any nested object structure)
 * @param prefix - Translation key prefix for namespacing
 */
export const generateI18nMessage = (
    locales: string[],
    table: Record<string, unknown>,
    prefix: string=''
) => {

    const translationTable: {[local: string] : { [key: string] : string}} = {};

    locales.forEach((locale: string)=>{
        translationTable[locale] = generateI18nTable(locale, table, prefix);
    });
    return translationTable;
};

/**
 * Merge multiple translation tables for specified languages
 * @param locales - Array of language codes
 * @param messages - Translation tables to merge
 */
export const mergeI18nMessages = (
    locales: string[],
    ...messages: {[p: string]: {[p: string]: string}}[]
) => {
    const mergedMessage: {[p: string]: {[p: string]: string}} = {};

    locales.forEach((locale)=>{
        messages.forEach((message)=>{
            if (!(locale in mergedMessage)) {
                mergedMessage[locale] = {};
            }

            if(locale in message) {
                mergedMessage[locale] = {
                    ...mergedMessage[locale],
                    ...message[locale]
                }
            }
        });
    });

    return mergedMessage;
};
