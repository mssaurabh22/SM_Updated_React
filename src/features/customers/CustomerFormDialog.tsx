import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";
import type { Customer } from "../../api/customersApi";
import { useCreateCustomer, useUpdateCustomer } from "../../api/customersApi";
import { useMasterData } from "../../api/masterDataApi";
import { parseApiError } from "../../api/errorHelpers";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contactPerson: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().max(255).optional(),
  address: z.string().max(1000).optional(),
  cityId: z.string().nullable(),
  stateId: z.string().nullable(),
  industryId: z.string().nullable(),
  gstin: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  cityId: null,
  stateId: null,
  industryId: null,
  gstin: "",
  notes: "",
  active: true,
};

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When present, the dialog edits this customer; otherwise it creates a new one. */
  customer?: Customer | null;
  /** Pre-fills the Name field on create only (e.g. the text typed into
   * CustomerAutocomplete's "+ Add new customer" option) - ignored when editing. */
  initialName?: string;
  /** Fired with the created/updated customer right after a successful save - lets a caller
   * (e.g. CustomerAutocomplete's quick-add flow) immediately select the new record. */
  onSaved?: (customer: Customer) => void;
}

export function CustomerFormDialog({ open, onClose, customer, initialName, onSaved }: CustomerFormDialogProps) {
  const isEdit = !!customer;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);
  // Collapsed by default for a quick-add (the whole point is fewer fields up front) - expanded
  // by default when editing a customer that already has any of these fields set, so an editor
  // isn't hunting for data that's hidden behind a click.
  const [additionalExpanded, setAdditionalExpanded] = useState(false);

  const { data: cities } = useMasterData("CITY");
  const { data: states } = useMasterData("STATE");
  const { data: industries } = useMasterData("INDUSTRY");

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (isEdit && customer) {
      form.reset({
        name: customer.name,
        contactPerson: customer.contactPerson ?? "",
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        address: customer.address ?? "",
        cityId: customer.cityId,
        stateId: customer.stateId,
        industryId: customer.industryId,
        gstin: customer.gstin ?? "",
        notes: customer.notes ?? "",
        active: customer.active,
      });
      setAdditionalExpanded(
        !!(customer.address || customer.cityId || customer.stateId || customer.industryId
          || customer.gstin || customer.notes),
      );
    } else {
      form.reset({ ...emptyValues, name: initialName ?? "" });
      setAdditionalExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, customer, initialName]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const saved = isEdit && customer
        ? await updateMutation.mutateAsync({ id: customer.id, payload: values })
        : await createMutation.mutateAsync(values);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const fieldError of parsed.fieldErrors) {
        if (fieldError.field in values) {
          form.setError(fieldError.field as keyof FormValues, { message: fieldError.message });
        }
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
      <Stack component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Customer Name"
              fullWidth
              autoFocus
              {...form.register("name")}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <Stack direction="row" spacing={2}>
              <TextField label="Contact Person" fullWidth {...form.register("contactPerson")} />
              <TextField label="Phone" fullWidth {...form.register("phone")} />
            </Stack>
            <TextField label="Email" fullWidth {...form.register("email")} />

            <Accordion
              variant="outlined"
              disableGutters
              expanded={additionalExpanded}
              onChange={(_, expanded) => setAdditionalExpanded(expanded)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Additional details (optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      label="Address"
                      fullWidth
                      multiline
                      minRows={2}
                      {...form.register("address")}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      control={form.control}
                      name="stateId"
                      render={({ field }) => (
                        <Autocomplete
                          fullWidth
                          options={states ?? []}
                          getOptionLabel={(o) => o.label}
                          isOptionEqualToValue={(o, v) => o.id === v.id}
                          value={states?.find((s) => s.id === field.value) ?? null}
                          onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                          renderInput={(params) => <TextField {...params} label="State" />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      control={form.control}
                      name="cityId"
                      render={({ field }) => (
                        <Autocomplete
                          fullWidth
                          options={cities ?? []}
                          getOptionLabel={(o) => o.label}
                          isOptionEqualToValue={(o, v) => o.id === v.id}
                          value={cities?.find((c) => c.id === field.value) ?? null}
                          onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                          renderInput={(params) => <TextField {...params} label="City" />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      control={form.control}
                      name="industryId"
                      render={({ field }) => (
                        <Autocomplete
                          fullWidth
                          options={industries ?? []}
                          getOptionLabel={(o) => o.label}
                          isOptionEqualToValue={(o, v) => o.id === v.id}
                          value={industries?.find((i) => i.id === field.value) ?? null}
                          onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                          renderInput={(params) => <TextField {...params} label="Industry" />}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="GSTIN" fullWidth {...form.register("gstin")} />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Notes" fullWidth multiline minRows={2} {...form.register("notes")} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {isEdit && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.watch("active")}
                    onChange={(e) => form.setValue("active", e.target.checked, { shouldDirty: true })}
                  />
                }
                label="Active"
              />
            )}
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
    </Dialog>
  );
}
