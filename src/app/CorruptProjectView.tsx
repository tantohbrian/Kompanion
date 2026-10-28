import React from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '../ui';
import { downloadCorruptProjectJson } from '../features/projects/recovery';

export interface CorruptProjectViewProps {
  corruptRecord: unknown;
  projectId: string;
  onBack: () => void;
}

export const CorruptProjectView: React.FC<CorruptProjectViewProps> = ({
  corruptRecord,
  projectId,
  onBack,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-canvas text-text-primary text-center">
      <AlertTriangle className="w-12 h-12 text-warning mb-4" />
      <h2 className="text-lg font-bold mb-2">Corrupt Project Data Detected</h2>
      <p className="text-xs text-text-secondary max-w-md mb-6">
        This project record failed schema validation. You can export its raw JSON for inspection and manual recovery.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back to Projects
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => downloadCorruptProjectJson(corruptRecord, `corrupt-${projectId}.json`)}
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Download Raw JSON
        </Button>
      </div>
    </div>
  );
};
