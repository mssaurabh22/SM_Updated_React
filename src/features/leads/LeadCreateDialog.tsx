import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  Link as MuiLink,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { LeadDuplicateMatch } from "../../api/leadsApi";
import { useCheckLeadDuplicates, useCreateLead } from "../../api/leadsApi";
import { useMasterData } from "../../api/masterDataApi";
import { parseApiError } from "../../api/errorHelpers";
import { CreatableMasterAutocomplete } from "../../components/CreatableMasterAutocomplete";

const schema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    contactPerson: z.string().min(1, "Contact person is required"),
    contactNo: z
      .string()
      .regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
    stateId: z.string().nullable(),
    stateOther: z.string().nullable(),
    cityId: z.string().nullable(),
    cityOther: z.string().nullable(),
    leadSourceId: z.string().nullable(),
    leadSourceOther: z.string().nullable(),
    industryId: z.string().nullable(),
    industryOther: z.string().nullable(),
    logAsVisitToday: z.boolean(),
    visitType: z.enum(["FIELD", "TELEPHONIC"]),
  })
  .refine((data) => !!(data.cityId || data.cityOther), {
    message: "City is required",
    path: ["cityId"],
  })
  .refine((data) => !!(data.leadSourceId || data.leadSourceOther), {
    message: "Lead source is required",
    path: ["leadSourceId"],
  })
  .refine((data) => !!(data.industryId || data.industryOther), {
    message: "Industry is required",
    path: ["industryId"],
  });
type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  companyName: "",
  contactPerson: "",
  contactNo: "",
  stateId: null,
  stateOther: null,
  cityId: null,
  cityOther: null,
  leadSourceId: null,
  leadSourceOther: null,
  industryId: null,
  industryOther: null,
  logAsVisitToday: true,
  visitType: "FIELD",
};

interface LeadCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Step 1 of lead capture: only the fields the backend requires. On successful
 * create we navigate straight to the lead's detail page, whose editable form
 * serves as "step 2" for filling in the rest whenever convenient.
 */
export function LeadCreateDialog({ open, onClose }: LeadCreateDialogProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<LeadDuplicateMatch[]>([]);

  const createMutation = useCreateLead();
  const duplicateCheck = useCheckLeadDuplicates();

  const { data: states } = useMasterData("STATE");
  const { data: cities } = useMasterData("CITY");
  const { data: leadSources } = useMasterData("LEAD_SOURCE");
  const { data: industries } = useMasterData("INDUSTRY");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDuplicates([]);
    form.reset(emptyValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runDuplicateCheck = async () => {
    const { contactNo, companyName } = form.getValues();
    if (!contactNo && !companyName) return;
    try {
      const matches = await duplicateCheck.mutateAsync({
        contactNo: contactNo || undefined,
        companyName: companyName || undefined,
      });
      setDuplicates(matches);
    } catch {
      // Informational only: if the duplicate check itself fails, don't block
      // the user from continuing to fill out / submit the form.
    }
  };

  const isSubmitting = createMutation.isPending;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const lead = await createMutation.mutateAsync({
        companyName: values.companyName,
        contactPerson: values.contactPerson,
        contactNo: values.contactNo,
        stateId: values.stateId ?? undefined,
        stateOther: values.stateOther ?? undefined,
        cityId: values.cityId ?? undefined,
        cityOther: values.cityOther ?? undefined,
        leadSourceId: values.leadSourceId ?? undefined,
        leadSourceOther: values.leadSourceOther ?? undefined,
        industryId: values.industryId ?? undefined,
        industryOther: values.industryOther ?? undefined,
        logAsVisitToday: values.logAsVisitToday,
        visitType: values.logAsVisitToday ? values.visitType : undefined,
      });
      onClose();
      navigate(`/app/leads/${lead.id}`);
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

  const stateOptions = states ?? [];
  const cityOptions = cities ?? [];
  const leadSourceOptions = leadSources ?? [];
  const industryOptions = industries ?? [];

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>Add Lead</DialogTitle>
      <Stack
        component="form"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {duplicates.length > 0 && (
              <Alert severity="warning" onClose={() => setDuplicates([])}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Possible duplicate lead(s) found:
                </Typography>
                <Stack spacing={0.5}>
                  {duplicates.map((match) => (
                    <MuiLink
                      key={match.id}
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => navigate(`/app/leads/${match.id}`)}
                      sx={{ textAlign: "left" }}
                    >
                      {match.companyName} — {match.contactPerson} (
                      {match.contactNo})
                    </MuiLink>
                  ))}
                </Stack>
              </Alert>
            )}
            <TextField
              label="Company name"
              fullWidth
              autoFocus
              {...form.register("companyName", { onBlur: runDuplicateCheck })}
              error={!!form.formState.errors.companyName}
              helperText={form.formState.errors.companyName?.message}
            />
            <TextField
              label="Contact person"
              fullWidth
              {...form.register("contactPerson")}
              error={!!form.formState.errors.contactPerson}
              helperText={form.formState.errors.contactPerson?.message}
            />
            <TextField
              label="Contact number"
              fullWidth
              {...form.register("contactNo", { onBlur: runDuplicateCheck })}
              error={!!form.formState.errors.contactNo}
              helperText={form.formState.errors.contactNo?.message}
            />
            <Controller
              control={form.control}
              name="stateId"
              render={({ field }) => (
                <CreatableMasterAutocomplete
                  label="State"
                  options={stateOptions}
                  idValue={field.value}
                  otherValue={form.watch("stateOther")}
                  onChange={({ id, other }) => {
                    field.onChange(id);
                    form.setValue("stateOther", other);
                  }}
                />
              )}
            />
            <Controller
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <CreatableMasterAutocomplete
                  label="City"
                  options={cityOptions}
                  idValue={field.value}
                  otherValue={form.watch("cityOther")}
                  onChange={({ id, other }) => {
                    field.onChange(id);
                    form.setValue("cityOther", other);
                    // Cascade to State only when a real City was picked (it has
                    // a parentId to cascade from); free-text City entry leaves
                    // State untouched.
                    if (id) {
                      const matchedCity = cityOptions.find((c) => c.id === id);
                      form.setValue("stateId", matchedCity?.parentId ?? null);
                      form.setValue("stateOther", null);
                    }
                  }}
                  error={!!form.formState.errors.cityId}
                  helperText={form.formState.errors.cityId?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="leadSourceId"
              render={({ field }) => (
                <CreatableMasterAutocomplete
                  label="Lead source"
                  options={leadSourceOptions}
                  idValue={field.value}
                  otherValue={form.watch("leadSourceOther")}
                  onChange={({ id, other }) => {
                    field.onChange(id);
                    form.setValue("leadSourceOther", other);
                  }}
                  error={!!form.formState.errors.leadSourceId}
                  helperText={form.formState.errors.leadSourceId?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="industryId"
              render={({ field }) => (
                <CreatableMasterAutocomplete
                  label="Industry"
                  options={industryOptions}
                  idValue={field.value}
                  otherValue={form.watch("industryOther")}
                  onChange={({ id, other }) => {
                    field.onChange(id);
                    form.setValue("industryOther", other);
                  }}
                  error={!!form.formState.errors.industryId}
                  helperText={form.formState.errors.industryId?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="logAsVisitToday"
              render={({ field }) => (
                <Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Log this as today's visit"
                  />
                  <FormHelperText sx={{ mt: -1 }}>
                    Creates an initial visit record dated today. Uncheck for
                    leads entered secondhand (e.g. from a web form) where
                    there's been no direct contact yet.
                  </FormHelperText>
                </Stack>
              )}
            />
            {form.watch("logAsVisitToday") && (
              <Controller
                control={form.control}
                name="visitType"
                render={({ field }) => (
                  <TextField
                    select
                    label="Visit type"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    sx={{ maxWidth: 240 }}
                  >
                    <MenuItem value="FIELD">Field Visit</MenuItem>
                    <MenuItem value="TELEPHONIC">Telephonic Visit</MenuItem>
                  </TextField>
                )}
              />
            )}
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
    </Dialog>
  );
}
