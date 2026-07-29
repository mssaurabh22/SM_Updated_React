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
import type { Product } from "../../api/productsApi";
import { useCreateProduct, useUpdateProduct } from "../../api/productsApi";
import { parseApiError } from "../../api/errorHelpers";

const createSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  unitPrice: z.number().min(0, "Must be zero or more"),
  taxRatePercent: z.number().min(0, "Must be zero or more"),
  unitOfMeasure: z.string().max(50).optional(),
  stockQuantity: z.number().int().min(0, "Must be zero or more"),
  lowStockThreshold: z.number().int().min(0).optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

/** No stockQuantity - stock only ever changes via a dedicated stock adjustment action. */
const editSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  unitPrice: z.number().min(0, "Must be zero or more"),
  taxRatePercent: z.number().min(0, "Must be zero or more"),
  unitOfMeasure: z.string().max(50).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When present, the dialog edits this product; otherwise it creates a new one. */
  product?: Product | null;
}

export function ProductFormDialog({ open, onClose, product }: ProductFormDialogProps) {
  const isEdit = !!product;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      unitPrice: 0,
      taxRatePercent: 0,
      unitOfMeasure: "",
      stockQuantity: 0,
      lowStockThreshold: undefined,
    },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      unitPrice: 0,
      taxRatePercent: 0,
      unitOfMeasure: "",
      lowStockThreshold: undefined,
      active: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (isEdit && product) {
      editForm.reset({
        sku: product.sku ?? "",
        name: product.name,
        description: product.description ?? "",
        unitPrice: product.unitPrice,
        taxRatePercent: product.taxRatePercent,
        unitOfMeasure: product.unitOfMeasure ?? "",
        lowStockThreshold: product.lowStockThreshold ?? undefined,
        active: product.active,
      });
    } else {
      createForm.reset({
        sku: "",
        name: "",
        description: "",
        unitPrice: 0,
        taxRatePercent: 0,
        unitOfMeasure: "",
        stockQuantity: 0,
        lowStockThreshold: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, product]);

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
    if (!product) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: product.id, payload: values });
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>

      {isEdit ? (
        <Stack component="form" onSubmit={editForm.handleSubmit(onEditSubmit)} noValidate>
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
              <TextField label="SKU (optional)" fullWidth {...editForm.register("sku")} />
              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                {...editForm.register("description")}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Unit price"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  {...editForm.register("unitPrice", { valueAsNumber: true })}
                  error={!!editForm.formState.errors.unitPrice}
                  helperText={editForm.formState.errors.unitPrice?.message}
                />
                <TextField
                  label="Tax rate %"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  {...editForm.register("taxRatePercent", { valueAsNumber: true })}
                  error={!!editForm.formState.errors.taxRatePercent}
                  helperText={editForm.formState.errors.taxRatePercent?.message}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Unit of measure (optional)"
                  fullWidth
                  {...editForm.register("unitOfMeasure")}
                />
                <TextField
                  label="Low stock threshold (optional)"
                  type="number"
                  fullWidth
                  {...editForm.register("lowStockThreshold", {
                    setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
                  })}
                />
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.watch("active")}
                    onChange={(e) =>
                      editForm.setValue("active", e.target.checked, { shouldDirty: true })
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
        <Stack component="form" onSubmit={createForm.handleSubmit(onCreateSubmit)} noValidate>
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
              <TextField label="SKU (optional)" fullWidth {...createForm.register("sku")} />
              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                {...createForm.register("description")}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Unit price"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  {...createForm.register("unitPrice", { valueAsNumber: true })}
                  error={!!createForm.formState.errors.unitPrice}
                  helperText={createForm.formState.errors.unitPrice?.message}
                />
                <TextField
                  label="Tax rate %"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  {...createForm.register("taxRatePercent", { valueAsNumber: true })}
                  error={!!createForm.formState.errors.taxRatePercent}
                  helperText={createForm.formState.errors.taxRatePercent?.message}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Unit of measure (optional)"
                  fullWidth
                  {...createForm.register("unitOfMeasure")}
                />
                <TextField
                  label="Low stock threshold (optional)"
                  type="number"
                  fullWidth
                  {...createForm.register("lowStockThreshold", {
                    setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
                  })}
                />
              </Stack>
              <TextField
                label="Initial stock quantity"
                type="number"
                fullWidth
                {...createForm.register("stockQuantity", { valueAsNumber: true })}
                error={!!createForm.formState.errors.stockQuantity}
                helperText={createForm.formState.errors.stockQuantity?.message}
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
