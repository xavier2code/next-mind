'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface CancelConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Cancel confirmation dialog per UI-SPEC.
 * Title: "Cancel Workflow"
 * Body: "Are you sure? This will terminate all running and pending tasks. This action cannot be undone."
 */
export function CancelConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: CancelConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Workflow</DialogTitle>
          <DialogDescription>
            Are you sure? This will terminate all running and pending tasks. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            data-testid="cancel-dialog-dismiss"
          >
            No, keep running
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="cancel-dialog-confirm"
          >
            {isLoading ? 'Cancelling...' : 'Yes, cancel workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
