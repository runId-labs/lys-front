import React, { ComponentType, ReactNode } from "react"

/**
 * Dialog size options
 */
export type DialogSize = "sm" | "md" | "lg" | "xl"

/**
 * Dialog placement options
 */
export type DialogPlacement = "start" | "end" | "top" | "bottom"

/**
 * Configuration for a single dialog
 */
export interface DialogConfig {
    uniqueKey: string
    title: string | ReactNode
    body: ReactNode | ComponentType<any>
    bodyProps?: Record<string, any>
    size?: DialogSize
    placement?: DialogPlacement
    backdrop?: boolean | "static"
    syncWithUrl?: boolean  // Enable URL synchronization for this dialog (default: true)
    loading?: boolean  // Show loading spinner instead of body content
}

/**
 * Dialog state managed by reducer
 */
export interface DialogState {
    stack: DialogConfig[]
}

/**
 * Update payload for updating dialog props
 */
export interface DialogUpdatePayload {
    uniqueKey: string
    bodyProps?: Record<string, any>
    title?: string | ReactNode
    loading?: boolean
}

/**
 * Actions for dialog reducer
 */
export type DialogAction =
    | { type: "PUSH"; payload: DialogConfig }
    | { type: "POP" }
    | { type: "CLEAR" }
    | { type: "INIT"; payload: DialogConfig[] }
    | { type: "UPDATE"; payload: DialogUpdatePayload }

/**
 * Context API exposed to consumers
 */
export interface LysDialogContextValue {
    // State
    current: DialogConfig | null
    stack: DialogConfig[]
    isOpen: boolean
    canGoBack: boolean

    // Actions
    open(config: DialogConfig): void
    update(uniqueKey: string, updates: Omit<DialogUpdatePayload, 'uniqueKey'>): void
    close(): void  // POP - close current dialog
    back(): void   // Alias for close()
    closeAll(): void  // CLEAR - close all dialogs

    // Registry for deep linking
    register(uniqueKey: string, config: Omit<DialogConfig, 'uniqueKey'>): () => void
    getExpectedKeys(): string[]  // Get dialog keys from URL
}

/**
 * Ref interface for dialog component
 */
export interface DialogComponentRefInterface {
    shown: boolean | null
    show(): void
    hide(): void
}

/**
 * Props for the injectable dialog component
 */
export interface DialogComponentProps {
    id: string
    title?: React.ReactElement | string | undefined
    body: ReactNode
    size?: DialogSize
    placement?: DialogPlacement
    backdrop?: boolean | "static"
}

/**
 * Type for the injectable dialog component (must accept ref)
 */
export type DialogComponentType = React.ForwardRefExoticComponent<
    DialogComponentProps & React.RefAttributes<DialogComponentRefInterface>
>

/**
 * Props for LysDialogProvider
 */
export interface LysDialogProviderProps {
    children: ReactNode
    syncWithUrl?: boolean  // Enable URL synchronization (default: true)
    dialogComponent: DialogComponentType
    loadingFallback?: ReactNode
    backIcon?: ReactNode
    renderExtra?: (current: DialogConfig) => ReactNode
}