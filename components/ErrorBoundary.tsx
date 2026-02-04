import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="min-h-screen flex items-center justify-center bg-primary p-6">
                    <div className="bg-surface p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4 border border-primary">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl mx-auto flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" x2="12" y1="8" y2="12" />
                                <line x1="12" x2="12.01" y1="16" y2="16" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-red-800">Noe gikk galt</h1>
                            <p className="text-red-600/70 text-sm mt-2">
                                {this.state.error?.message || "En uventet feil oppstod."}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/20"
                        >
                            Last inn på nytt
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
