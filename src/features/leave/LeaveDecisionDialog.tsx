import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

interface LeaveDecisionDialogProps {
  open: boolean;
  action: "approve" | "reject";
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (decisionNote: string) => void;
}

/**
 * Shared confirm dialog for approving/rejecting a leave request, with an
 * optional decision note - kept as one component so the approve/reject UX is
 * identical apart from wording and button color.
 */
export function LeaveDecisionDialog({
  open,
  action,
  isPending,
  errorMessage,
  onCancel,
  onConfirm,
}: LeaveDecisionDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  const isReject = action === "reject";

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{isReject ? "Reject leave request?" : "Approve leave request?"}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {isReject
            ? "You may optionally add a note explaining the rejection."
            : "You may optionally add a note for the employee."}
        </DialogContentText>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        <TextField
          label="Decision note (optional)"
          fullWidth
          multiline
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(note.trim())}
          color={isReject ? "error" : "success"}
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Working..." : isReject ? "Reject" : "Approve"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
