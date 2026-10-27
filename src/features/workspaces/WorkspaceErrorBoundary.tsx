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

export class WorkspaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Workspaces] Feature Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-8 bg-surface border border-border rounded-modal max-w-md mx-auto my-12 text-center"
        >
          <div className="w-10 h-10 rounded-full bg-status-error/15 text-status-error flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-text-primary mb-1">
            Workspaces Error
          </h2>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            {this.state.error?.message || 'Failed to load workspace channel view.'}
          </p>
          <Button variant="secondary" size="sm" onClick={this.handleReset}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
