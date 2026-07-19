import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMasterData } from "../../api/masterDataApi";
import { CreatableMasterAutocomplete } from "../../components/CreatableMasterAutocomplete";

interface LeadLostReasonDialogProps {
  open: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (lostReasonId: string | null, lostReasonOther: string | null) => void;
}

/**
 * The backend requires a lost reason (id or free text) whenever status is set
 * to LOST (400 if missing), so the "Change Status" select must never call the
 * status endpoint with LOST directly - it routes through this dialog to
 * collect the reason first. The reason is creatable: pick an existing master
 * entry or type one that isn't in the list.
 */
export function LeadLostReasonDialog({
  open,
  isPending,
  errorMessage,
  onCancel,
  onConfirm,
}: LeadLostReasonDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [lostReasonId, setLostReasonId] = useState<string | null>(null);
  const [lostReasonOther, setLostReasonOther] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const { data: lostReasons } = useMasterData("LOST_REASON");

  useEffect(() => {
    if (!open) return;
    setLostReasonId(null);
    setLostReasonOther(null);
    setTouched(false);
  }, [open]);

  const options = lostReasons ?? [];
  const showRequiredError = touched && !lostReasonId && !lostReasonOther;

  const handleConfirm = () => {
    setTouched(true);
    if (!lostReasonId && !lostReasonOther) return;
    onConfirm(lostReasonId, lostReasonOther);
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>Mark lead as lost</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <DialogContentText>
            A reason is required to mark this lead as lost.
          </DialogContentText>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <CreatableMasterAutocomplete
            label="Lost reason"
            options={options}
            idValue={lostReasonId}
            otherValue={lostReasonOther}
            onChange={({ id, other }) => {
              setLostReasonId(id);
              setLostReasonOther(other);
            }}
            error={showRequiredError}
            helperText={showRequiredError ? "Lost reason is required" : " "}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Mark as Lost"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
