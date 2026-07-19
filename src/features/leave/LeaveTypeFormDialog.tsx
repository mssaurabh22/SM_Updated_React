import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { LeaveType } from "../../api/leaveTypesApi";
import { useCreateLeaveType, useUpdateLeaveType } from "../../api/leaveTypesApi";
import { parseApiError } from "../../api/errorHelpers";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  defaultAllocationDays: z.number().min(0, "Must be zero or more"),
  sortOrder: z.number().int(),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultAllocationDays: z.number().min(0, "Must be zero or more"),
  sortOrder: z.number().int(),
  active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface LeaveTypeFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When present, the dialog edits this leave type; otherwise it creates a new one. */
  leaveType?: LeaveType | null;
}

export function LeaveTypeFormDialog({
  open,
  onClose,
  leaveType,
}: LeaveTypeFormDialogProps) {
  const isEdit = !!leaveType;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", code: "", defaultAllocationDays: 0, sortOrder: 0 },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", defaultAllocationDays: 0, sortOrder: 0, active: true },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (isEdit && leaveType) {
      editForm.reset({
        name: leaveType.name,
        defaultAllocationDays: leaveType.defaultAllocationDays,
        sortOrder: leaveType.sortOrder,
        active: leaveType.active,
      });
    } else {
      createForm.reset({ name: "", code: "", defaultAllocationDays: 0, sortOrder: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, leaveType]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onCreateSubmit = async (values: CreateFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const fieldError of parsed.fieldErrors) {
        if (fieldError.field in values) {
          createForm.setError(fieldError.field as keyof CreateFormValues, {
            message: fieldError.message,
          });
        }
      }
    }
  };

  const onEditSubmit = async (values: EditFormValues) => {
    if (!leaveType) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: leaveType.id, payload: values });
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const fieldError of parsed.fieldErrors) {
        if (fieldError.field in values) {
          editForm.setError(fieldError.field as keyof EditFormValues, {
            message: fieldError.message,
          });
        }
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>{isEdit ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>

      {isEdit ? (
        <Stack
          component="form"
          onSubmit={editForm.handleSubmit(onEditSubmit)}
          noValidate
        >
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                fullWidth
                autoFocus
                {...editForm.register("name")}
                error={!!editForm.formState.errors.name}
                helperText={editForm.formState.errors.name?.message}
              />
              <TextField
                label="Code"
                fullWidth
                value={leaveType?.code ?? ""}
                disabled
                helperText="Code cannot be changed"
              />
              <TextField
                label="Default allocation (days)"
                type="number"
                fullWidth
                {...editForm.register("defaultAllocationDays", { valueAsNumber: true })}
                error={!!editForm.formState.errors.defaultAllocationDays}
                helperText={editForm.formState.errors.defaultAllocationDays?.message}
              />
              <TextField
                label="Sort order"
                type="number"
                fullWidth
                {...editForm.register("sortOrder", { valueAsNumber: true })}
                error={!!editForm.formState.errors.sortOrder}
                helperText={editForm.formState.errors.sortOrder?.message}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.watch("active")}
                    onChange={(e) =>
                      editForm.setValue("active", e.target.checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                }
                label="Active"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Stack>
      ) : (
        <Stack
          component="form"
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          noValidate
        >
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                fullWidth
                autoFocus
                {...createForm.register("name")}
                error={!!createForm.formState.errors.name}
                helperText={createForm.formState.errors.name?.message}
              />
              <TextField
                label="Code"
                fullWidth
                {...createForm.register("code")}
                error={!!createForm.formState.errors.code}
                helperText={createForm.formState.errors.code?.message}
              />
              <TextField
                label="Default allocation (days)"
                type="number"
                fullWidth
                {...createForm.register("defaultAllocationDays", { valueAsNumber: true })}
                error={!!createForm.formState.errors.defaultAllocationDays}
                helperText={createForm.formState.errors.defaultAllocationDays?.message}
              />
              <TextField
                label="Sort order"
                type="number"
                fullWidth
                {...createForm.register("sortOrder", { valueAsNumber: true })}
                error={!!createForm.formState.errors.sortOrder}
                helperText={createForm.formState.errors.sortOrder?.message}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </Stack>
      )}
    </Dialog>
  );
}
