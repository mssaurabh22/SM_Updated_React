import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

/**
 * Small reusable "are you sure?" confirmation dialog, used ahead of destructive
 * actions (deactivating master data entries, deactivating employees, ...).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  isPending,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
}: {
  open: boolean;
  title: string;
  message: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Working..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
