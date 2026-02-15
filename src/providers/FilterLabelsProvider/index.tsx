import React from "react";
import {FilterLabelsContext} from "./hooks";

/**
 * LocalStorage key for persisting filter labels
 */
const STORAGE_KEY = "lys-filter-labels";

/**
 * FilterLabelsProvider props
 */
interface FilterLabelsProviderProps {
    children: React.ReactNode;
}

/**
 * Load labels from localStorage
 */
const loadFromStorage = (): Record<string, string> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

/**
 * Save a label to localStorage
 */
const saveLabel = (key: string, label: string): void => {
    try {
        const labels = loadFromStorage();
        labels[key] = label;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    } catch {
        // Ignore storage errors (quota exceeded, etc.)
    }
};

/**
 * Get a label from localStorage (returns the key itself if not found)
 */
const getLabel = (key: string): string => {
    const labels = loadFromStorage();
    return labels[key] || key;
};

/**
 * FilterLabelsProvider component
 *
 * Global provider that stores display labels for filter values.
 * Used to show human-readable labels in active filter badges
 * instead of raw values (IDs, codes, etc.).
 *
 * Labels are stored directly in localStorage (no React state).
 *
 * Usage:
 * - SelectElement calls setLabel(value, label) when selection changes
 * - SearchFilterFeature calls getLabel(value) to display the label
 */
const FilterLabelsProvider: React.FC<FilterLabelsProviderProps> = ({children}) => {
    return (
        <FilterLabelsContext.Provider value={{setLabel: saveLabel, getLabel}}>
            {children}
        </FilterLabelsContext.Provider>
    );
};

FilterLabelsProvider.displayName = "FilterLabelsProvider";

export default FilterLabelsProvider;
