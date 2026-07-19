import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Dayjs } from "dayjs";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useCreateHoliday } from "../../api/holidaysApi";
import { parseApiError } from "../../api/errorHelpers";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  holidayDate: z
    .custom<Dayjs | null>()
    .refine((v) => v != null && v.isValid(), "Date is required"),
});
type FormValues = z.infer<typeof schema>;

interface HolidayFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function HolidayFormDialog({ open, onClose }: HolidayFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateHoliday();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", holidayDate: null },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset({ name: "", holidayDate: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        name: values.name,
        holidayDate: values.holidayDate!.format("YYYY-MM-DD"),
      });
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const fieldError of parsed.fieldErrors) {
        if (fieldError.field in values) {
          form.setError(fieldError.field as keyof FormValues, {
            message: fieldError.message,
          });
        }
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>Add Holiday</DialogTitle>
      <Stack component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Name"
              fullWidth
              autoFocus
              {...form.register("name")}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <Controller
              control={form.control}
              name="holidayDate"
              render={({ field }) => (
                <DatePicker
                  label="Date"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!form.formState.errors.holidayDate,
                      helperText: form.formState.errors.holidayDate?.message,
                    },
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
