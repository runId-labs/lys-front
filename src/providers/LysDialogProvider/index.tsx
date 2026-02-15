import { ComponentType, useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import { LysDialogContext } from "./hooks"
import { DialogComponentRefInterface, DialogConfig, DialogUpdatePayload, LysDialogProviderProps } from "./types"
import { dialogReducer, initialDialogState } from "./reducer"
import { useUrlQueries } from "../UrlQueriesProvider/hooks"

const DIALOG_STACK_PARAM = "dStack"

/**
 * Check if value is a React component (function, class, forwardRef, memo, etc.)
 * NOT a React element (JSX)
 */
const isReactComponent = (value: unknown): value is ComponentType<any> => {
    // Function component or class component
    if (typeof value === 'function') return true

    // forwardRef, memo, lazy components are objects with $$typeof
    // but we need to exclude React elements which also have $$typeof
    if (
        typeof value === 'object' &&
        value !== null &&
        '$$typeof' in value
    ) {
        const symbolValue = (value as { $$typeof: symbol }).$$typeof

        // React elements have Symbol.for('react.element') - these are NOT components
        // They should be rendered as-is with <>{body}</>
        if (symbolValue === Symbol.for('react.element')) {
            return false
        }

        // forwardRef has Symbol.for('react.forward_ref')
        // memo has Symbol.for('react.memo')
        // lazy has Symbol.for('react.lazy')
        // These ARE components that need to be instantiated
        return true
    }

    return false
}

/**
 * DialogChild component
 * Renders the dialog body, handling both ReactNode and ComponentType
 * If body is a component, it will receive bodyProps
 */
const DialogChild: React.FC<{ body: DialogConfig['body']; bodyProps?: Record<string, any> }> = ({ body, bodyProps }) => {
    if (isReactComponent(body)) {
        const Component = body
        return <Component {...(bodyProps || {})} />
    }

    // Otherwise, render as ReactNode
    return <>{body}</>
}

/**
 * LysDialogProvider
 *
 * Provides dialog management with stack support using an injectable dialog component
 *
 * Features:
 * - Stack-based dialogs (dialogs can open on top of each other)
 * - Back button to return to previous dialog
 * - Close button to close all dialogs
 * - Backdrop click closes all dialogs
 * - Optional URL synchronization
 * - Injectable dialog component, loading fallback, back icon, and extra rendering
 */
const LysDialogProvider: React.FC<LysDialogProviderProps> = ({
    children,
    syncWithUrl = true,
    dialogComponent: DialogComponent,
    loadingFallback = null,
    backIcon = null,
    renderExtra
}) => {
    const [state, dispatch] = useReducer(dialogReducer, initialDialogState)
    const urlQueries = syncWithUrl ? useUrlQueries() : null
    const dialogRefs = useRef<Map<string, DialogComponentRefInterface>>(new Map())
    const dialogRegistry = useRef<Map<string, Omit<DialogConfig, 'uniqueKey'>>>(new Map())
    const initializedFromUrl = useRef(false)

    // Get current dialog (last in stack)
    const current = useMemo(() => {
        return state.stack.length > 0 ? state.stack[state.stack.length - 1] : null
    }, [state.stack])

    // Check if we can go back
    const canGoBack = useMemo(() => {
        return state.stack.length > 1
    }, [state.stack])

    // Check if any dialog is open
    const isOpen = useMemo(() => {
        return state.stack.length > 0
    }, [state.stack])

    // Open a new dialog (push to stack)
    const open = useCallback((config: DialogConfig) => {
        dispatch({ type: "PUSH", payload: config })
    }, [])

    // Update an existing dialog's props or title
    const update = useCallback((uniqueKey: string, updates: Omit<DialogUpdatePayload, 'uniqueKey'>) => {
        dispatch({ type: "UPDATE", payload: { uniqueKey, ...updates } })
    }, [])

    // Close current dialog (pop from stack)
    const close = useCallback(() => {
        dispatch({ type: "POP" })
    }, [])

    // Alias for close
    const back = close

    // Close all dialogs (clear stack)
    const closeAll = useCallback(() => {
        dispatch({ type: "CLEAR" })
    }, [])

    // Register a dialog for deep linking
    const register = useCallback((uniqueKey: string, config: Omit<DialogConfig, 'uniqueKey'>) => {
        dialogRegistry.current.set(uniqueKey, config)

        // Return cleanup function
        return () => {
            dialogRegistry.current.delete(uniqueKey)
        }
    }, [])

    // Get expected dialog keys from URL
    const getExpectedKeys = useCallback((): string[] => {
        if (!syncWithUrl || !urlQueries) return []

        const stackParam = urlQueries.appliedParams.get(DIALOG_STACK_PARAM)
        if (!stackParam) return []

        return stackParam.split(',').filter(Boolean)
    }, [syncWithUrl, urlQueries])

    // Show/hide dialog based on current dialog
    useEffect(() => {
        if (current) {
            const ref = dialogRefs.current.get(current.uniqueKey)
            if (ref && ref.shown === null) {
                ref.show()
            }
        }
    }, [current])

    // Handle dialog hide event (when user closes it)
    const handleDialogHide = useCallback((uniqueKey: string) => {
        const ref = dialogRefs.current.get(uniqueKey)
        if (ref?.shown === false) {
            // Close all when dialog is manually closed
            closeAll()
        }
    }, [closeAll])

    // Sync stack with URL
    useEffect(() => {
        if (!syncWithUrl || !urlQueries) return

        // Don't sync URL until initialization is complete
        // This prevents clearing dStack param before we read it on mount
        if (!initializedFromUrl.current) return

        const stackParam = urlQueries.appliedParams.get(DIALOG_STACK_PARAM)

        // Filter dialogs that want URL synchronization (syncWithUrl !== false)
        const urlSyncedDialogs = state.stack.filter(d => d.syncWithUrl !== false)

        if (urlSyncedDialogs.length > 0) {
            // Update URL with current stack keys (only for dialogs with URL sync enabled)
            const stackKeys = urlSyncedDialogs.map(d => d.uniqueKey).join(",")
            if (stackParam !== stackKeys) {
                urlQueries.edit(DIALOG_STACK_PARAM, stackKeys)
            }
        } else {
            // Clear URL param when no dialogs want URL sync
            if (stackParam) {
                urlQueries.edit(DIALOG_STACK_PARAM, null)
            }
        }
    }, [state.stack, syncWithUrl, urlQueries])

    // Initialize stack from URL on mount
    useEffect(() => {
        if (!syncWithUrl || !urlQueries || initializedFromUrl.current) return

        const expectedKeys = getExpectedKeys()
        if (expectedKeys.length === 0) {
            initializedFromUrl.current = true
            return
        }

        // Wait for all dialogs to register themselves
        // This happens after children mount
        const checkInterval = setInterval(() => {
            const configs: DialogConfig[] = []

            for (const key of expectedKeys) {
                const config = dialogRegistry.current.get(key)
                if (config) {
                    configs.push({ uniqueKey: key, ...config })
                }
            }

            // If all expected dialogs are registered, initialize stack
            if (configs.length === expectedKeys.length) {
                clearInterval(checkInterval)
                dispatch({ type: "INIT", payload: configs })
                initializedFromUrl.current = true
            }
        }, 50)

        // Cleanup: stop checking after 2 seconds
        const timeout = setTimeout(() => {
            clearInterval(checkInterval)
            initializedFromUrl.current = true
        }, 2000)

        return () => {
            clearInterval(checkInterval)
            clearTimeout(timeout)
        }
    }, [syncWithUrl, urlQueries, getExpectedKeys])

    // Context value
    const contextValue = useMemo(() => ({
        current,
        stack: state.stack,
        isOpen,
        canGoBack,
        open,
        update,
        close,
        back,
        closeAll,
        register,
        getExpectedKeys
    }), [current, state.stack, isOpen, canGoBack, open, update, close, back, closeAll, register, getExpectedKeys])

    // Build title with optional back button
    const dialogTitle = useMemo(() => {
        if (!current) return null

        return (
            <div className="d-flex align-items-center w-100">
                {/* Back button (only visible when stack > 1) */}
                {canGoBack && (
                    <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 me-3"
                        onClick={close}
                        aria-label="Back to previous dialog"
                    >
                        {backIcon}
                    </button>
                )}
                {/* Title */}
                <div className="flex-grow-1">
                    {current.title}
                </div>
            </div>
        )
    }, [current, canGoBack, close, backIcon])

    return (
        <LysDialogContext.Provider value={contextValue}>
            {/* Render only the current dialog */}
            {current && (
                <>
                    <DialogComponent
                        key={current.uniqueKey}
                        ref={(ref) => {
                            if (ref) {
                                dialogRefs.current.set(current.uniqueKey, ref)
                                // Monitor shown state
                                if (ref.shown === false) {
                                    handleDialogHide(current.uniqueKey)
                                }
                            }
                        }}
                        id={`lys-dialog-${current.uniqueKey}`}
                        title={dialogTitle ?? undefined}
                        body={current.loading ? loadingFallback : (
                            <DialogChild body={current.body} bodyProps={current.bodyProps} />
                        )}
                        size={current.size}
                        placement={current.placement}
                        backdrop={current.backdrop}
                    />
                    {renderExtra?.(current)}
                </>
            )}
            {children}
        </LysDialogContext.Provider>
    )
}

export default LysDialogProvider
