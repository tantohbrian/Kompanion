import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

interface Props {
  children: ReactNode;
  featureName?: string;
  fallbackRawData?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.featureName || 'Application'}] Unhandled UI Error:`, error, errorInfo);
  }

  handleExportRawJson = () => {
    const dataToExport = this.props.fallbackRawData ?? {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: Date.now(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kompanion-corrupt-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-8 bg-surface border border-border rounded-modal max-w-lg mx-auto my-12 text-center"
        >
          <div className="w-10 h-10 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            {this.props.featureName ? `${this.props.featureName} Error` : 'Unexpected Error'}
          </h2>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed max-w-sm">
            {this.state.error?.message || 'An error occurred while rendering this feature.'}
          </p>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={this.handleReload}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reload Page
            </Button>
            {Boolean(this.props.fallbackRawData) && (
              <Button variant="primary" size="sm" onClick={this.handleExportRawJson}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Export Raw JSON
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
