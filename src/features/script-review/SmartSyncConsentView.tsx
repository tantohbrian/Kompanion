import React from 'react';
import { HardDrive, Cpu, ShieldCheck, Wand2 } from 'lucide-react';
import { Button } from '../../ui';

export interface SmartSyncConsentViewProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const SmartSyncConsentView: React.FC<SmartSyncConsentViewProps> = ({
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-surface-elevated border border-border rounded-panel space-y-1">
          <HardDrive className="w-4 h-4 text-accent mb-1" />
          <div className="text-xs font-semibold text-text-primary">One-time ~90 MB</div>
          <div className="text-2xs text-text-secondary">
            Lightweight Whisper model cached in browser Cache API.
          </div>
        </div>

        <div className="p-3 bg-surface-elevated border border-border rounded-panel space-y-1">
          <Cpu className="w-4 h-4 text-accent mb-1" />
          <div className="text-xs font-semibold text-text-primary">100% In-Browser</div>
          <div className="text-2xs text-text-secondary">
            Processed on-device via WebAssembly in a Web Worker.
          </div>
        </div>

        <div className="p-3 bg-surface-elevated border border-border rounded-panel space-y-1">
          <ShieldCheck className="w-4 h-4 text-accent mb-1" />
          <div className="text-xs font-semibold text-text-primary">Complete Privacy</div>
          <div className="text-2xs text-text-secondary">
            Your audio and narration text never leave your computer.
          </div>
        </div>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed">
        Smart Sync is optional and turned off by default. Clicking confirm below will download the
        speech-to-text model once into your local browser cache.
      </p>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        <Button variant="secondary" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={onConfirm}>
          <Wand2 className="w-4 h-4 mr-1.5" />
          Confirm & Download Model
        </Button>
      </div>
    </div>
  );
};
