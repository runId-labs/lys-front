/**
 * Convert first letter of string to lowercase
 */
export const lowerCaseFirstLetter = (str: string) => {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Combine multiple classnames into a single string
 * Filters out falsy values
 */
export const cn = (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ');
}

/**
 * Convert camelCase string to snake_case
 */
export const toSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert number to string without scientific notation
 */
export const numberToString = (value: number | string | null | undefined): string => {
    if (value == null) return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString("fullwide", {useGrouping: false, maximumFractionDigits: 20});
}
