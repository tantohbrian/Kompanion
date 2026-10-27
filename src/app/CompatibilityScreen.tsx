import React from 'react';
import { AlertTriangle, Chrome } from 'lucide-react';
import { CompatibilityReport } from './compatibility';

export const CompatibilityScreen: React.FC<{ report: CompatibilityReport }> = ({
  report,
}) => {
  return (
    <main
      role="main"
      className="min-h-screen bg-canvas text-text-primary flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full bg-surface border border-border rounded-modal shadow-2xl p-6 text-center">
        <div className="w-12 h-12 bg-status-warning/15 text-status-warning rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold mb-2">Browser Upgrade Required</h1>
        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
          Kompanion requires modern browser capabilities for local, frame-accurate
          video encoding and canvas acceleration without remote servers.
        </p>

        <div className="bg-surface-elevated border border-border rounded-panel p-3.5 text-left mb-6">
          <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Missing Capabilities
          </p>
          <ul className="text-xs text-status-error space-y-1.5 list-disc list-inside">
            {report.missingFeatures.map((feature, i) => (
              <li key={i}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
          <Chrome className="w-4 h-4 text-accent" />
          <span>Recommended: Latest Google Chrome, Microsoft Edge, or Chromium browser.</span>
        </div>
      </div>
    </main>
  );
};
