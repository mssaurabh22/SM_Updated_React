import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Dayjs } from "dayjs";
import {
  Alert,
  Autocomplete,
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
import { useLeaveTypes } from "../../api/leaveTypesApi";
import { useCreateLeaveRequest } from "../../api/leaveRequestsApi";
import { parseApiError } from "../../api/errorHelpers";

const schema = z
  .object({
    leaveTypeId: z.string().nullable().refine((v) => !!v, "Leave type is required"),
    startDate: z
      .custom<Dayjs | null>()
      .refine((v) => v != null && v.isValid(), "Start date is required"),
    endDate: z
      .custom<Dayjs | null>()
      .refine((v) => v != null && v.isValid(), "End date is required"),
    reason: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.startDate || !values.endDate || !values.endDate.isBefore(values.startDate, "day"),
    { message: "End date cannot be before start date", path: ["endDate"] },
  );
type FormValues = z.infer<typeof schema>;

const blankValues: FormValues = {
  leaveTypeId: null,
  startDate: null,
  endDate: null,
  reason: "",
};

interface LeaveRequestFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LeaveRequestFormDialog({ open, onClose }: LeaveRequestFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);

  const { data: leaveTypes } = useLeaveTypes();
  const createMutation = useCreateLeaveRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(blankValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
  };

  const leaveTypeOptions = leaveTypes ?? [];

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        leaveTypeId: values.leaveTypeId!,
        startDate: values.startDate!.format("YYYY-MM-DD"),
        endDate: values.endDate!.format("YYYY-MM-DD"),
        reason: values.reason?.trim() || undefined,
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>Request Leave</DialogTitle>
      <Stack component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              control={form.control}
              name="leaveTypeId"
              render={({ field }) => (
                <Autocomplete
                  options={leaveTypeOptions}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={leaveTypeOptions.find((t) => t.id === field.value) ?? null}
                  onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Leave type"
                      error={!!form.formState.errors.leaveTypeId}
                      helperText={form.formState.errors.leaveTypeId?.message}
                    />
                  )}
                />
              )}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Controller
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    label="Start date"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!form.formState.errors.startDate,
                        helperText: form.formState.errors.startDate?.message,
                      },
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <DatePicker
                    label="End date"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!form.formState.errors.endDate,
                        helperText: form.formState.errors.endDate?.message,
                      },
                    }}
                  />
                )}
              />
            </Stack>
            <TextField
              label="Reason (optional)"
              fullWidth
              multiline
              minRows={2}
              {...form.register("reason")}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
