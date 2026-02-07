import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface RootState {
  hasError: boolean;
  error: Error | null;
}

/**
 * RootErrorBoundary catches any top-level application errors that
 * would otherwise crash the entire React component tree.
 */
export class RootErrorBoundary extends Component<Props, RootState> {
  public state: RootState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): RootState {
    // Updated: Fixed state transition for error recovery
    // Reason: Ensure the error object is captured for display
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    // In production, this should go to a service like Sentry
    console.error('Root Error Boundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    // Simple recovery mechanism: reload the page
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">Something went wrong</h1>
              <p className="text-secondary text-gray-400">
                The application encountered an unexpected error and needs to restart.
              </p>
            </div>
            
            {this.state.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left overflow-auto max-h-40">
                <code className="text-xs text-red-400 whitespace-pre-wrap">
                  {this.state.error.stack || this.state.error.message}
                </code>
              </div>
            )}
            
            <Button 
              onClick={this.handleReload}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all"
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface FFmpegState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * FFmpegErrorBoundary handles errors specifically related to the
 * FFmpeg engine and conversion processes, allowing the rest of the
 * UI to remain functional if a conversion fails catastrophically.
 */
export class FFmpegErrorBoundary extends Component<Props, FFmpegState> {
  public state: FFmpegState = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): FFmpegState {
    return { 
      hasError: true, 
      errorMessage: error.message || 'An error occurred within the FFmpeg engine.' 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FFmpeg Error Boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h3 className="text-xl font-bold text-white">Conversion Engine Error</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            {this.state.errorMessage}
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, errorMessage: null })}
            variant="secondary"
            className="px-6"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
