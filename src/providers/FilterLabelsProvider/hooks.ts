import {createContext, useContext} from "react";

/**
 * Filter labels context type
 */
interface FilterLabelsContextType {
    /**
     * Set a label for a filter value
     */
    setLabel: (key: string, label: string) => void;

    /**
     * Get a label for a filter value (returns value if not found)
     */
    getLabel: (key: string) => string;
}

/**
 * Filter labels context
 */
const FilterLabelsContext = createContext<FilterLabelsContextType>({
    setLabel: () => {
        console.warn("FilterLabelsProvider not initialized: setLabel");
    },
    getLabel: (key: string) => key
});

/**
 * Hook to access filter labels context
 */
function useFilterLabels() {
    return useContext(FilterLabelsContext);
}

export {
    FilterLabelsContext,
    useFilterLabels
};
