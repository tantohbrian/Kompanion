import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog, Button } from '../../ui';

interface DeleteWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteWorkspaceDialog: React.FC<DeleteWorkspaceDialogProps> = ({
  open,
  onOpenChange,
  workspaceName,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Workspace"
      description="This action will permanently delete all associated data."
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3 p-3.5 bg-status-error/10 border border-status-error/30 rounded-panel">
          <AlertTriangle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
          <p className="text-xs text-text-primary leading-relaxed">
            Delete workspace <strong className="font-semibold text-text-primary">“{workspaceName}”</strong>? This will permanently delete this workspace and all its projects and media files. This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {isDeleting ? 'Deleting…' : 'Delete Workspace'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
