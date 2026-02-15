/**
 * Validation utilities for form fields
 */

/**
 * Check if a value is empty
 */
export const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

/**
 * Password validation regex patterns
 * Exported for reuse in other components
 */
export const passwordRegex = {
    lowercase: /^(?=.*[a-z]).*$/,
    uppercase: /^(?=.*[A-Z]).*$/,
    number: /^(?=.*[0-9]).*$/,
    minLength8: /^.{8,}$/,
    minLength12: /^.{12,}$/,
    specialChar: /[#?!@$%^&*-]/,
};

/**
 * Email validation regex
 */
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validator function type
 */
export type ValidatorFunction = (value: string | number | string[] | undefined) => boolean;

/**
 * Validator with error message
 */
export interface Validator {
    method: ValidatorFunction;
    errorMessage: string;
}

/**
 * Pre-built validators
 */
export const validators = {
    /**
     * Validate that a field is not empty
     */
    required: (errorMessage: string): Validator => ({
        method: (value) => !isEmpty(value),
        errorMessage,
    }),

    /**
     * Validate email format
     */
    email: (errorMessage: string): Validator => ({
        method: (value) => {
            if (isEmpty(value)) return true; // Use required validator separately
            return emailRegex.test(String(value));
        },
        errorMessage,
    }),

    /**
     * Validate minimum length
     */
    minLength: (min: number, errorMessage: string): Validator => ({
        method: (value) => {
            if (isEmpty(value)) return true;
            return String(value).length >= min;
        },
        errorMessage,
    }),

    /**
     * Validate maximum length
     */
    maxLength: (max: number, errorMessage: string): Validator => ({
        method: (value) => {
            if (isEmpty(value)) return true;
            return String(value).length <= max;
        },
        errorMessage,
    }),

    /**
     * Validate pattern
     */
    pattern: (regex: RegExp, errorMessage: string): Validator => ({
        method: (value) => {
            if (isEmpty(value)) return true;
            return regex.test(String(value));
        },
        errorMessage,
    }),

    /**
     * Validate minimum value for numbers
     */
    min: (min: number, errorMessage: string): Validator => ({
        method: (value) => {
            if (isEmpty(value)) return true;
            return Number(value) >= min;
        },
        errorMessage,
    }),

    /**
     * Validate maximum value for numbers
     */
    max: (max: number, errorMessage: string): Validator => ({
        method: (value) => {
            if (isEmpty(value)) return true;
            return Number(value) <= max;
        },
        errorMessage,
    }),

    /**
     * Custom validator
     */
    custom: (method: ValidatorFunction, errorMessage: string): Validator => ({
        method,
        errorMessage,
    }),
};

/**
 * Clean parameters by trimming strings and converting empty strings to undefined
 */
export const cleanParameters = (parameters: Record<string, unknown>): Record<string, unknown> => {
    const newParameters: Record<string, unknown> = {};

    Object.keys(parameters).forEach((key) => {
        const element = parameters[key];
        if (typeof element === "object" && element !== null && !Array.isArray(element)) {
            newParameters[key] = cleanParameters(element as Record<string, unknown>);
        } else if (typeof element === "string") {
            if (isEmpty(element)) {
                newParameters[key] = undefined;
            } else {
                newParameters[key] = element.trim();
            }
        } else {
            newParameters[key] = element;
        }
    });

    return newParameters;
};

/**
 * Get nested value from object using dot notation
 */
export const getNestedValue = (
    obj: Record<string, unknown>,
    path: string
): string | number | string[] | undefined => {
    const keys = path.split(".");
    let result: unknown = obj;

    for (const key of keys) {
        if (result !== undefined && typeof result === "object" && result !== null && !Array.isArray(result)) {
            result = (result as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }

    return result as string | number | string[] | undefined;
};

/**
 * Set nested value in object using dot notation
 */
export const setNestedValue = (
    obj: Record<string, unknown>,
    path: string,
    value: unknown
): Record<string, unknown> => {
    const keys = path.split(".");
    const newObj: Record<string, unknown> = { ...obj };
    let current: Record<string, unknown> = newObj;

    keys.forEach((key, index) => {
        if (index === keys.length - 1) {
            current[key] = value;
        } else {
            if (!current[key] || typeof current[key] !== "object") {
                current[key] = {};
            } else {
                current[key] = { ...(current[key] as Record<string, unknown>) };
            }
            current = current[key] as Record<string, unknown>;
        }
    });

    return newObj;
};
