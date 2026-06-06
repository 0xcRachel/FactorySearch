import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
          <div className="p-4 rounded-full bg-red-500/10 mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="font-serif text-xl font-medium text-text-main mb-2">
            Đã xảy ra lỗi không mong muốn
          </h2>
          <p className="text-sm text-text-muted mb-6 max-w-md">
            {this.state.error?.message || 'Ứng dụng gặp sự cố. Hãy thử tải lại trang.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-parchment rounded-xl text-sm font-semibold hover:bg-coral transition-colors"
          >
            <RefreshCw size={16} />
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
