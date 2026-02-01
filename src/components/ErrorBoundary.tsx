import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error is already captured in getDerivedStateFromError
    void _error;
    void _errorInfo;
  }

  handleTryAgain = () => {
    window.location.reload();
  };

  /**
   * Only show detailed error information in development mode.
   * In production, we hide stack traces to prevent information disclosure.
   */
  renderErrorDetails() {
    const { errorMessage, errorStack } = this.state;
    const isDevelopment = process.env.NODE_ENV === "development";

    if (!isDevelopment) {
      // In production, show a generic error reference
      const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
      return (
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-300">
            Something went wrong. If this problem persists, please contact support
            with reference code: <code className="text-yellow-400">{errorId}</code>
          </p>
        </div>
      );
    }

    // In development, show full error details for debugging
    return (
      <div className="bg-gray-800 p-4 rounded-lg overflow-auto max-h-64">
        <p className="text-sm mb-2">
          <span className="text-gray-400">Error Message:</span>{" "}
          <span className="text-red-400">{errorMessage}</span>
        </p>
        {errorStack && (
          <>
            <p className="text-sm text-gray-400 mb-1">Stack Trace:</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{errorStack}</pre>
          </>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === "development";

      return (
        <div className="flex flex-col gap-5 p-5 h-full bg-[#333b51] text-white">
          <h2 className="text-xl">
            Oops, something went wrong!
          </h2>
          <p className="text-gray-300">
            {isDevelopment
              ? "An error occurred while rendering this page. Check the details below for debugging."
              : "We're sorry, but something unexpected happened. Please try reloading the page."}
          </p>
          <button
            className="btn btn-primary mr-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            type="button"
            onClick={this.handleTryAgain}
          >
            Reload App
          </button>
          {isDevelopment && (
            <div className="text-sm text-gray-400">
              Development mode - error details visible below:
            </div>
          )}
          {this.renderErrorDetails()}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
