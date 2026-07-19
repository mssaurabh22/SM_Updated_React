import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { Employee } from "../../api/employeesApi";
import { useCreateEmployee, useEmployees, useUpdateEmployee } from "../../api/employeesApi";
import { useMasterData } from "../../api/masterDataApi";
import { parseApiError } from "../../api/errorHelpers";

const createSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  designationId: z.string().nullable().optional(),
  stateId: z.string().nullable().optional(),
  cityId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  assignedProductIds: z.array(z.string()).optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  designationId: z.string().nullable().optional(),
  stateId: z.string().nullable().optional(),
  cityId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  assignedProductIds: z.array(z.string()).optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When present, the dialog edits this employee; otherwise it creates a new one. */
  employee?: Employee | null;
}

export function EmployeeFormDialog({
  open,
  onClose,
  employee,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const { data: designations } = useMasterData("DESIGNATION");
  const { data: states } = useMasterData("STATE");
  const { data: cities } = useMasterData("CITY");
  const { data: products } = useMasterData("PRODUCT");
  const { data: employeesPage } = useEmployees({ size: 200 });

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "EMPLOYEE",
      designationId: null,
      stateId: null,
      cityId: null,
      managerId: null,
      assignedProductIds: [],
    },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      role: "EMPLOYEE",
      designationId: null,
      stateId: null,
      cityId: null,
      managerId: null,
      assignedProductIds: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (isEdit && employee) {
      editForm.reset({
        fullName: employee.fullName,
        phone: employee.phone ?? "",
        role: employee.role,
        designationId: employee.designationId,
        stateId: employee.stateId,
        cityId: employee.cityId,
        managerId: employee.managerId,
        assignedProductIds: employee.assignedProductIds ?? [],
      });
    } else {
      createForm.reset({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "EMPLOYEE",
        designationId: null,
        stateId: null,
        cityId: null,
        managerId: null,
        assignedProductIds: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, employee]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onCreateSubmit = async (values: CreateFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        role: values.role,
        designationId: values.designationId ?? undefined,
        stateId: values.stateId ?? undefined,
        cityId: values.cityId ?? undefined,
        managerId: values.managerId ?? undefined,
        assignedProductIds: values.assignedProductIds,
      });
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
    if (!employee) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: employee.id,
        payload: {
          fullName: values.fullName,
          phone: values.phone || undefined,
          role: values.role,
          designationId: values.designationId ?? undefined,
          stateId: values.stateId ?? undefined,
          cityId: values.cityId ?? undefined,
          managerId: values.managerId ?? undefined,
          assignedProductIds: values.assignedProductIds,
        },
      });
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

  const designationOptions = designations ?? [];
  const stateOptions = states ?? [];
  const cityOptions = cities ?? [];
  const productOptions = products ?? [];
  // An employee can't be its own manager - exclude it from the options (backend
  // rejects this too, but no reason to even offer it in edit mode).
  const managerOptions = (employeesPage?.content ?? []).filter(
    (emp) => emp.id !== employee?.id,
  );

  const cityOptionsForState = (stateId: string | null | undefined) =>
    stateId ? cityOptions.filter((c) => c.parentId === stateId) : cityOptions;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>

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
                label="Full name"
                fullWidth
                autoFocus
                {...editForm.register("fullName")}
                error={!!editForm.formState.errors.fullName}
                helperText={editForm.formState.errors.fullName?.message}
              />
              <TextField
                label="Email"
                fullWidth
                value={employee?.email ?? ""}
                disabled
                helperText="Email cannot be changed"
              />
              <TextField
                label="Phone"
                fullWidth
                {...editForm.register("phone")}
                error={!!editForm.formState.errors.phone}
                helperText={editForm.formState.errors.phone?.message}
              />
              <TextField
                select
                label="Role"
                fullWidth
                {...editForm.register("role")}
                error={!!editForm.formState.errors.role}
                helperText={editForm.formState.errors.role?.message}
              >
                <MenuItem value="EMPLOYEE">Employee</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </TextField>
              <Controller
                control={editForm.control}
                name="designationId"
                render={({ field }) => (
                  <Autocomplete
                    options={designationOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={
                      designationOptions.find((d) => d.id === field.value) ?? null
                    }
                    onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                    renderInput={(params) => (
                      <TextField {...params} label="Designation" />
                    )}
                  />
                )}
              />
              <Controller
                control={editForm.control}
                name="managerId"
                render={({ field }) => (
                  <Autocomplete
                    options={managerOptions}
                    getOptionLabel={(option) => option.fullName}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={managerOptions.find((m) => m.id === field.value) ?? null}
                    onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                    renderInput={(params) => (
                      <TextField {...params} label="Manager" />
                    )}
                  />
                )}
              />
              <Controller
                control={editForm.control}
                name="stateId"
                render={({ field }) => (
                  <Autocomplete
                    options={stateOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={stateOptions.find((s) => s.id === field.value) ?? null}
                    onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                    renderInput={(params) => <TextField {...params} label="State" />}
                  />
                )}
              />
              <Controller
                control={editForm.control}
                name="cityId"
                render={({ field }) => {
                  const selectedStateId = editForm.watch("stateId");
                  return (
                    <Autocomplete
                      options={cityOptionsForState(selectedStateId)}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      value={cityOptions.find((c) => c.id === field.value) ?? null}
                      onChange={(_, selected) => {
                        field.onChange(selected?.id ?? null);
                        if (selected) {
                          editForm.setValue("stateId", selected.parentId ?? null);
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="City" />}
                    />
                  );
                }}
              />
              <Controller
                control={editForm.control}
                name="assignedProductIds"
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={productOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={productOptions.filter((p) =>
                      (field.value ?? []).includes(p.id),
                    )}
                    onChange={(_, selected) =>
                      field.onChange(selected.map((s) => s.id))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Assigned products" />
                    )}
                  />
                )}
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
                label="Full name"
                fullWidth
                autoFocus
                {...createForm.register("fullName")}
                error={!!createForm.formState.errors.fullName}
                helperText={createForm.formState.errors.fullName?.message}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                {...createForm.register("email")}
                error={!!createForm.formState.errors.email}
                helperText={createForm.formState.errors.email?.message}
              />
              <TextField
                label="Phone"
                fullWidth
                {...createForm.register("phone")}
                error={!!createForm.formState.errors.phone}
                helperText={createForm.formState.errors.phone?.message}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...createForm.register("password")}
                error={!!createForm.formState.errors.password}
                helperText={createForm.formState.errors.password?.message}
              />
              <TextField
                select
                label="Role"
                fullWidth
                {...createForm.register("role")}
                error={!!createForm.formState.errors.role}
                helperText={createForm.formState.errors.role?.message}
              >
                <MenuItem value="EMPLOYEE">Employee</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </TextField>
              <Controller
                control={createForm.control}
                name="designationId"
                render={({ field }) => (
                  <Autocomplete
                    options={designationOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={
                      designationOptions.find((d) => d.id === field.value) ?? null
                    }
                    onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                    renderInput={(params) => (
                      <TextField {...params} label="Designation" />
                    )}
                  />
                )}
              />
              <Controller
                control={createForm.control}
                name="managerId"
                render={({ field }) => (
                  <Autocomplete
                    options={managerOptions}
                    getOptionLabel={(option) => option.fullName}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={managerOptions.find((m) => m.id === field.value) ?? null}
                    onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                    renderInput={(params) => (
                      <TextField {...params} label="Manager" />
                    )}
                  />
                )}
              />
              <Controller
                control={createForm.control}
                name="stateId"
                render={({ field }) => (
                  <Autocomplete
                    options={stateOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={stateOptions.find((s) => s.id === field.value) ?? null}
                    onChange={(_, selected) => field.onChange(selected?.id ?? null)}
                    renderInput={(params) => <TextField {...params} label="State" />}
                  />
                )}
              />
              <Controller
                control={createForm.control}
                name="cityId"
                render={({ field }) => {
                  const selectedStateId = createForm.watch("stateId");
                  return (
                    <Autocomplete
                      options={cityOptionsForState(selectedStateId)}
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      value={cityOptions.find((c) => c.id === field.value) ?? null}
                      onChange={(_, selected) => {
                        field.onChange(selected?.id ?? null);
                        if (selected) {
                          createForm.setValue("stateId", selected.parentId ?? null);
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="City" />}
                    />
                  );
                }}
              />
              <Controller
                control={createForm.control}
                name="assignedProductIds"
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={productOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={productOptions.filter((p) =>
                      (field.value ?? []).includes(p.id),
                    )}
                    onChange={(_, selected) =>
                      field.onChange(selected.map((s) => s.id))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Assigned products" />
                    )}
                  />
                )}
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
