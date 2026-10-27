import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { Button } from '../../ui';
import { downloadCorruptProjectJson } from './recovery';

interface Props {
  children: ReactNode;
  corruptData?: unknown;
  projectId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ProjectErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Projects] Feature Error:', error, errorInfo);
  }

  handleExport = () => {
    downloadCorruptProjectJson(this.props.corruptData ?? { error: this.state.error?.message }, this.props.projectId);
  };

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
            Project Loading Error
          </h2>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            {this.state.error?.message || 'Failed to load project due to corrupt or invalid data.'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={this.handleReset}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Try Again
            </Button>
            <Button variant="primary" size="sm" onClick={this.handleExport}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Download Raw JSON
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
