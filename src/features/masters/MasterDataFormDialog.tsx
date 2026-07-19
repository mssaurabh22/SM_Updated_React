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
import type { MasterDataItem, MasterDataType } from "../../api/masterDataApi";
import {
  useCreateMasterData,
  useUpdateMasterData,
} from "../../api/masterDataApi";
import { parseApiError } from "../../api/errorHelpers";
import { MASTER_TYPE_LABELS } from "./masterTypeConfig";

const createSchema = z.object({
  code: z.string().min(1, "Code is required"),
  label: z.string().min(1, "Label is required"),
  sortOrder: z.number().int(),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  label: z.string().min(1, "Label is required"),
  sortOrder: z.number().int(),
  active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface MasterDataFormDialogProps {
  type: MasterDataType;
  open: boolean;
  onClose: () => void;
  /** When present, the dialog edits this item; otherwise it creates a new one. */
  item?: MasterDataItem | null;
}

export function MasterDataFormDialog({
  type,
  open,
  onClose,
  item,
}: MasterDataFormDialogProps) {
  const isEdit = !!item;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateMasterData(type);
  const updateMutation = useUpdateMasterData(type);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { code: "", label: "", sortOrder: 0 },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { label: "", sortOrder: 0, active: true },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (isEdit && item) {
      editForm.reset({
        label: item.label,
        sortOrder: item.sortOrder,
        active: item.active,
      });
    } else {
      createForm.reset({ code: "", label: "", sortOrder: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, item]);

  const handleClose = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
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
    if (!item) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: values });
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

  const typeLabel = MASTER_TYPE_LABELS[type];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>
        {isEdit ? `Edit ${typeLabel}` : `Add ${typeLabel}`}
      </DialogTitle>

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
                label="Label"
                fullWidth
                autoFocus
                {...editForm.register("label")}
                error={!!editForm.formState.errors.label}
                helperText={editForm.formState.errors.label?.message}
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
                label="Code"
                fullWidth
                autoFocus
                {...createForm.register("code")}
                error={!!createForm.formState.errors.code}
                helperText={createForm.formState.errors.code?.message}
              />
              <TextField
                label="Label"
                fullWidth
                {...createForm.register("label")}
                error={!!createForm.formState.errors.label}
                helperText={createForm.formState.errors.label?.message}
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
              {isSubmitting ? "Saving..." : "Create"}
            </Button>
          </DialogActions>
        </Stack>
      )}
    </Dialog>
  );
}
