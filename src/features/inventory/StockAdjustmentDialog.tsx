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
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { Product } from "../../api/productsApi";
import { useAdjustProductStock } from "../../api/productsApi";
import { parseApiError } from "../../api/errorHelpers";

const schema = z.object({
  quantityChange: z.number().int().refine((v) => v !== 0, "Must not be zero"),
  note: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

/** Manual stock in/out - positive quantityChange adds stock, negative removes it. Separate
 * from ProductFormDialog since stock is never editable as a plain field (see productsApi.ts). */
export function StockAdjustmentDialog({ open, onClose, product }: StockAdjustmentDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);
  const adjustMutation = useAdjustProductStock();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantityChange: 0, note: "" },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset({ quantityChange: 0, note: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const handleClose = () => {
    if (adjustMutation.isPending) return;
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    if (!product) return;
    setFormError(null);
    try {
      await adjustMutation.mutateAsync({ id: product.id, payload: values });
      onClose();
    } catch (error) {
      setFormError(parseApiError(error).message);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>Adjust Stock</DialogTitle>
      <Stack component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {product && (
              <Typography color="text.secondary">
                {product.name} - current stock: {product.stockQuantity}
              </Typography>
            )}
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Quantity change"
              type="number"
              fullWidth
              autoFocus
              helperText={
                form.formState.errors.quantityChange?.message ??
                "Positive to add stock, negative to remove it"
              }
              error={!!form.formState.errors.quantityChange}
              {...form.register("quantityChange", { valueAsNumber: true })}
            />
            <TextField
              label="Note (optional)"
              fullWidth
              multiline
              minRows={2}
              {...form.register("note")}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={adjustMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={adjustMutation.isPending}>
            {adjustMutation.isPending ? "Saving..." : "Apply"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
