import { DialogState, DialogAction } from "./types"

/**
 * Initial state for dialog reducer
 */
export const initialDialogState: DialogState = {
    stack: []
}

/**
 * Dialog reducer to manage stack of dialogs
 *
 * Actions:
 * - INIT: Initialize stack from URL (used on mount)
 * - PUSH: Add a new dialog to the stack
 * - POP: Remove the last dialog from the stack (back button)
 * - CLEAR: Remove all dialogs from the stack (close all)
 * - UPDATE: Update props or title of an existing dialog
 */
export function dialogReducer(state: DialogState, action: DialogAction): DialogState {
    switch (action.type) {
        case "INIT":
            // Initialize stack (used when restoring from URL)
            return {
                ...state,
                stack: action.payload
            }

        case "PUSH": {
            // A key already on the stack is brought back to the top AS IT IS,
            // never stacked twice and never reset: an opener is an effect keyed
            // on what it shows, and an effect can run again for the same thing
            // (its dependency flickers, the tree is remounted, a dev refresh
            // replays it). Appending a copy buried the filled entry under one
            // nothing ever fills, since the fillers update by key and had
            // already done their work; replacing it would throw that work away
            // the same way. The new payload is dropped: what a dialog shows
            // changes through UPDATE.
            const index = state.stack.findIndex(dialog => dialog.uniqueKey === action.payload.uniqueKey)
            if (index === -1) {
                return {
                    ...state,
                    stack: [...state.stack, action.payload]
                }
            }
            const existing = state.stack[index]
            return {
                ...state,
                stack: [...state.stack.slice(0, index), ...state.stack.slice(index + 1), existing]
            }
        }

        case "POP":
            // Remove last dialog from stack
            if (state.stack.length === 0) {
                return state
            }
            return {
                ...state,
                stack: state.stack.slice(0, -1)
            }

        case "CLEAR":
            // Remove all dialogs
            return {
                ...state,
                stack: []
            }

        case "UPDATE":
            // Update an existing dialog's props, title, or loading state
            return {
                ...state,
                stack: state.stack.map(dialog => {
                    if (dialog.uniqueKey === action.payload.uniqueKey) {
                        return {
                            ...dialog,
                            ...(action.payload.title !== undefined && { title: action.payload.title }),
                            ...(action.payload.bodyProps !== undefined && { bodyProps: action.payload.bodyProps }),
                            ...(action.payload.loading !== undefined && { loading: action.payload.loading })
                        }
                    }
                    return dialog
                })
            }

        default:
            return state
    }
}