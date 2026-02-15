import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import { ComponentType } from "react"
import { LysDialogContextValue, DialogSize, DialogPlacement } from "./types"

/**
 * Default context value with error handlers
 */
const defaultContextValue: LysDialogContextValue = {
    current: null,
    stack: [],
    isOpen: false,
    canGoBack: false,
    open: () => {
        console.error("useLysDialog: open() called outside of LysDialogProvider")
    },
    update: () => {
        console.error("useLysDialog: update() called outside of LysDialogProvider")
    },
    close: () => {
        console.error("useLysDialog: close() called outside of LysDialogProvider")
    },
    back: () => {
        console.error("useLysDialog: back() called outside of LysDialogProvider")
    },
    closeAll: () => {
        console.error("useLysDialog: closeAll() called outside of LysDialogProvider")
    },
    register: () => {
        console.error("useLysDialog: register() called outside of LysDialogProvider")
        return () => {}
    },
    getExpectedKeys: () => {
        console.error("useLysDialog: getExpectedKeys() called outside of LysDialogProvider")
        return []
    }
}

/**
 * Dialog context
 */
export const LysDialogContext = createContext<LysDialogContextValue>(defaultContextValue)

/**
 * Hook to access dialog context
 *
 * Usage:
 * ```tsx
 * const dialog = useLysDialog()
 *
 * // Open a dialog
 * dialog.open({
 *     uniqueKey: "my-dialog",
 *     title: "My Dialog",
 *     body: <div>Content</div>
 * })
 *
 * // Close current dialog (return to previous)
 * dialog.close()
 *
 * // Close all dialogs
 * dialog.closeAll()
 * ```
 */
export const useLysDialog = (): LysDialogContextValue => {
    return useContext(LysDialogContext)
}

/**
 * Configuration for useDialogWithUpdates hook
 */
export interface UseDialogWithUpdatesConfig<P extends Record<string, any>> {
    /**
     * Unique key for the dialog
     */
    uniqueKey: string

    /**
     * Dialog title
     */
    title: string

    /**
     * Body component (not JSX, the component itself)
     */
    body: ComponentType<P>

    /**
     * Props to pass to the body component
     * These will be automatically updated when they change
     */
    bodyProps: P

    /**
     * Dependencies array to trigger bodyProps updates
     * Only when these values change will the dialog be updated
     * This avoids infinite loops caused by unstable object references
     *
     * @example
     * // Update only when data or isLoading changes
     * deps: [data, isLoading]
     */
    deps?: React.DependencyList

    /**
     * Dialog size
     * @default "md"
     */
    size?: DialogSize

    /**
     * Dialog placement
     * @default "end"
     */
    placement?: DialogPlacement

    /**
     * Backdrop behavior
     * @default true
     */
    backdrop?: boolean | "static"

    /**
     * Enable URL synchronization
     * @default true
     */
    syncWithUrl?: boolean
}

/**
 * Return type for useDialogWithUpdates hook
 */
export interface UseDialogWithUpdatesReturn {
    /**
     * Open the dialog
     */
    open: () => void

    /**
     * Close the dialog
     */
    close: () => void

    /**
     * The unique key of the dialog
     */
    uniqueKey: string

    /**
     * Whether this dialog is currently open
     */
    isOpen: boolean
}

/**
 * Hook for dialog with automatic updates
 *
 * This hook encapsulates the pattern of opening a dialog and automatically
 * updating its bodyProps when they change. It eliminates the need to manually
 * write useEffect for dialog.update().
 *
 * Usage:
 * ```tsx
 * const myDialog = useDialogWithUpdates({
 *     uniqueKey: "my-dialog",
 *     title: "My Dialog",
 *     body: MyDialogBody,
 *     bodyProps: { data, isLoading, onSubmit }
 * });
 *
 * // Open the dialog
 * <button onClick={myDialog.open}>Open</button>
 *
 * // The dialog will automatically update when bodyProps change
 * ```
 */
export function useDialogWithUpdates<P extends Record<string, any>>(
    config: UseDialogWithUpdatesConfig<P>
): UseDialogWithUpdatesReturn {
    const {open, update, close, current} = useLysDialog();
    const {uniqueKey, title, body, bodyProps, deps, size = "md", placement = "end", backdrop, syncWithUrl} = config;

    /**
     * Store bodyProps in a ref to always have the latest value
     * without causing re-renders in useCallback dependencies
     */
    const bodyPropsRef = useRef(bodyProps);
    bodyPropsRef.current = bodyProps;

    /**
     * Check if this dialog is currently open
     */
    const isOpen = useMemo(() => current?.uniqueKey === uniqueKey, [current?.uniqueKey, uniqueKey]);

    /**
     * Track if dialog was opened to prevent updates before first open
     */
    const wasOpenedRef = useRef(false);

    /**
     * Open the dialog
     */
    const handleOpen = useCallback(() => {
        wasOpenedRef.current = true;
        open({
            uniqueKey,
            title,
            body,
            bodyProps: bodyPropsRef.current,
            size,
            placement,
            backdrop,
            syncWithUrl
        });
    }, [open, uniqueKey, title, body, size, placement, backdrop, syncWithUrl]);

    /**
     * Close the dialog
     */
    const handleClose = useCallback(() => {
        close();
    }, [close]);

    /**
     * Auto-update bodyProps when deps change (only if dialog is currently open)
     * Uses wasOpenedRef to prevent updates before the dialog was ever opened
     * Uses ref to get latest bodyProps without causing infinite loops
     *
     * If deps is not provided, no automatic updates will occur
     */
    useEffect(() => {
        if (isOpen && wasOpenedRef.current) {
            update(uniqueKey, {bodyProps: bodyPropsRef.current});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, uniqueKey, update, ...(deps || [])]);

    return {
        open: handleOpen,
        close: handleClose,
        uniqueKey,
        isOpen
    };
}