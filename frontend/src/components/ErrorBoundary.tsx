import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-4">
              An error occurred while loading the application.
            </p>
            <details className="text-left bg-gray-800 p-4 rounded-lg mb-4">
              <summary className="cursor-pointer text-sm text-gray-400 mb-2">
                Error Details
              </summary>
              <pre className="text-xs text-red-300 overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
