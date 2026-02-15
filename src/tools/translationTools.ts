import {useMemo} from "react";
import {useIntl} from "react-intl";
import {ComponentDescriptionType} from "../types/descriptionTypes";
import {TranslationType} from "../types/i18nTypes";
import {I18nLocaleEnum} from "../types/i18nTypes";

/**
 * Infers component type from component name based on naming convention
 * - ends with "Feature" -> "features"
 * - ends with "Element" -> "elements"
 * - ends with "Page" -> "pages"
 * - ends with "Restricted" -> "restrictedFeatures"
 * - ends with "Provider" -> "providers"
 */
const inferComponentType = (componentName: string): string => {
    if (componentName.endsWith("Feature")) return "features";
    if (componentName.endsWith("Element")) return "elements";
    if (componentName.endsWith("Page")) return "pages";
    if (componentName.endsWith("Restricted")) return "restrictedFeatures";
    if (componentName.endsWith("Provider")) return "providers";

    throw new Error(
        `Cannot infer component type from "${componentName}". ` +
        `Component name must end with: Feature, Element, Page, Restricted, or Provider`
    );
};

/**
 * Converts component name to translation key format
 * LoginFeature -> loginFeature
 * ButtonElement -> buttonElement
 */
const toTranslationKey = (componentName: string): string => {
    return componentName.charAt(0).toLowerCase() + componentName.slice(1);
};

/**
 * Creates a component translation configuration with typed helper hook
 *
 * Supports all languages defined in I18nLocaleEnum. TypeScript will enforce
 * that all translations include every language.
 *
 * @param componentName - Component name (e.g., "LoginFeature", "ButtonElement")
 * @param translations - Translation object with keys in format {key: Record<I18nLocaleEnum, string>}
 * @param pathBase - Base path for translations (default: "lys.components.")
 * @returns Object with config for i18n system and useTranslations hook
 *
 * @example
 * ```typescript
 * // In LoginFeature/translations.ts
 * const {config, useTranslations} = createComponentTranslations(
 *     "LoginFeature",
 *     {
 *         email: {en: "Email", fr: "Email"},
 *         password: {en: "Password", fr: "Mot de passe"}
 *     }
 * );
 *
 * export const loginFeatureConfig = config;
 * export const useLoginTranslations = useTranslations;
 *
 * // In LoginFeature/index.tsx
 * const {t} = useLoginTranslations();
 * const label = t("email"); // Type-safe!
 * ```
 */
export const createComponentTranslations = <
    T extends Record<string, Record<I18nLocaleEnum, string>>,
    TCommonKey extends string = string
>(
    componentName: string,
    translations: T,
    pathBase: string = "lys.components."
) => {
    const componentType = inferComponentType(componentName);
    const translationKey = toTranslationKey(componentName);
    const translationPath = `${pathBase}${componentType}.${translationKey}`;

    return {
        /**
         * Configuration object for the i18n system
         * Export this in your features/elements/pages/restrictedFeatures index
         */
        config: {
            translation: translations as TranslationType
        } satisfies ComponentDescriptionType,

        /**
         * React hook to use translations in your component
         * Returns an object with type-safe `t()` and `common()` functions
         *
         * @returns Object containing:
         * - t(key, values?): Component-specific translations with optional interpolation
         * - common(key, values?): Shared common translations with optional interpolation
         */
        useTranslations: () => {
            const intl = useIntl();

            return useMemo(() => {
                /**
                 * Translate a component-specific key
                 * @param key - Translation key (autocompleted)
                 * @param options - Optional: values for interpolation, fallbackToKey to return raw key if not found
                 */
                const t = (key: keyof T, options?: {
                    values?: Record<string, string | number>,
                    fallbackToKey?: boolean
                }): string => {
                    const id = `${translationPath}.${String(key)}`;
                    const result = intl.formatMessage({id}, options?.values);
                    if (options?.fallbackToKey && result === id) {
                        return String(key);
                    }
                    return result;
                };

                /**
                 * Translate a common/shared key
                 * @param key - Common translation key (autocompleted)
                 * @param options - Optional: values for interpolation, fallbackToKey to return raw key if not found
                 */
                const common = (key: TCommonKey, options?: {
                    values?: Record<string, string | number>,
                    fallbackToKey?: boolean
                }): string => {
                    const id = `lys.services.i18n.common.${String(key)}`;
                    const result = intl.formatMessage({id}, options?.values);
                    if (options?.fallbackToKey && result === id) {
                        return String(key);
                    }
                    return result;
                };

                return {t, common};
            }, [intl]);
        },

        /**
         * Generated translation path (for debugging)
         */
        translationPath,

        /**
         * Available translation keys (for reference)
         */
        translationKeys: Object.keys(translations) as Array<keyof T>
    };
};
