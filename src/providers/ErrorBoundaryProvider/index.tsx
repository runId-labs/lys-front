import React, {ReactNode} from "react";

interface Props {
    onError?: ((error: Error) => void) | undefined
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * Error boundary component
 * Catches React rendering errors and calls onError callback
 *
 * Important: onError is called in componentDidCatch (not render) to allow
 * state updates in the callback without React warnings.
 */
class ErrorBoundaryProvider extends React.Component<Props, State> {
    state: State = {hasError: false, error: null};

    static getDerivedStateFromError(error: Error): State {
        // Update state so next render shows fallback UI
        return {hasError: true, error};
    }

    componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
        // Call onError callback for side effects (logging, state updates, etc.)
        // This is the correct place for side effects, not render()
        if (this.props.onError) {
            this.props.onError(error);
        }
    }

    render() {
        const {children, fallback = null} = this.props;
        const {hasError} = this.state;

        // When there's an error, render fallback (or null) instead of children
        // This prevents the infinite loop where children keep throwing
        if (hasError) {
            return fallback;
        }

        return children;
    }
}

export default ErrorBoundaryProvider
