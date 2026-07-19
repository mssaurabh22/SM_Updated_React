import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEmployees, type Employee } from "../../api/employeesApi";

interface ReassignLeadDialogProps {
  open: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  currentOwnerId?: string;
  onCancel: () => void;
  onConfirm: (newOwnerId: string) => void;
}

/**
 * ADMIN-only dialog to reassign a lead's owner. Mirrors LeadLostReasonDialog's
 * confirm-before-mutating structure: pick a value, validate on confirm, and
 * let the caller own the mutation call + error surfacing.
 */
export function ReassignLeadDialog({
  open,
  isPending,
  errorMessage,
  currentOwnerId,
  onCancel,
  onConfirm,
}: ReassignLeadDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [newOwnerId, setNewOwnerId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const { data: employeesPage } = useEmployees({ size: 200 });

  useEffect(() => {
    if (!open) return;
    setNewOwnerId(null);
    setTouched(false);
  }, [open]);

  const options = (employeesPage?.content ?? []).filter(
    (emp) => emp.active && emp.id !== currentOwnerId,
  );
  const showRequiredError = touched && !newOwnerId;

  const handleConfirm = () => {
    setTouched(true);
    if (!newOwnerId) return;
    onConfirm(newOwnerId);
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>Reassign lead</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <DialogContentText>
            Choose the employee this lead should be reassigned to.
          </DialogContentText>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <Autocomplete
            options={options}
            getOptionLabel={(option: Employee) => option.fullName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={options.find((o) => o.id === newOwnerId) ?? null}
            onChange={(_, selected) => setNewOwnerId(selected?.id ?? null)}
            onBlur={() => setTouched(true)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="New owner"
                required
                error={showRequiredError}
                helperText={showRequiredError ? "New owner is required" : " "}
                autoFocus
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Reassigning..." : "Reassign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
