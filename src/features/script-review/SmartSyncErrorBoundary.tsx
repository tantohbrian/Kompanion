import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SmartSyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SmartSync] Feature Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-6 bg-surface border border-border rounded-panel max-w-sm mx-auto my-6 text-center"
        >
          <div className="w-9 h-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            Smart Sync Encountered an Error
          </h2>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            {this.state.error?.message || 'A failure occurred during speech alignment.'}
          </p>
          <Button variant="secondary" size="sm" onClick={this.handleReset}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Reset Smart Sync
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
