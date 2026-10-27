import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class IngestErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Ingest] Feature Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-6 bg-surface border border-border rounded-modal max-w-sm mx-auto my-6 text-center"
        >
          <div className="w-9 h-9 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            Media Ingest Error
          </h2>
          <p className="text-xs text-text-secondary mb-3 leading-relaxed">
            {this.state.error?.message || 'An error occurred during file ingestion.'}
          </p>
          <Button variant="secondary" size="sm" onClick={this.handleReset}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
