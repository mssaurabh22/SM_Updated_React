import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "./AuthContext";
import { parseApiError } from "../api/errorHelpers";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Lowercase letters, numbers, and hyphens only",
    ),
  adminFullName: z.string().min(1, "Full name is required"),
  adminEmail: z.string().min(1, "Email is required").email("Enter a valid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
});
type RegisterFormValues = z.infer<typeof registerSchema>;

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate("/app", { replace: true });
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const fieldError of parsed.fieldErrors) {
        if (fieldError.field === "email" || fieldError.field === "password") {
          setError(fieldError.field, { message: fieldError.message });
        }
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          fullWidth
          {...register("password")}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </Button>
      </Stack>
    </Box>
  );
}

function RegisterOrganizationForm() {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      subdomain: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerOrganization(values);
      navigate("/app", { replace: true });
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      for (const fieldError of parsed.fieldErrors) {
        if (fieldError.field in values) {
          setError(fieldError.field as keyof RegisterFormValues, {
            message: fieldError.message,
          });
        }
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField
          label="Organization name"
          fullWidth
          {...register("organizationName")}
          error={!!errors.organizationName}
          helperText={errors.organizationName?.message}
        />
        <TextField
          label="Subdomain"
          fullWidth
          placeholder="e.g. acme"
          {...register("subdomain")}
          error={!!errors.subdomain}
          helperText={errors.subdomain?.message}
        />
        <TextField
          label="Your full name"
          fullWidth
          {...register("adminFullName")}
          error={!!errors.adminFullName}
          helperText={errors.adminFullName?.message}
        />
        <TextField
          label="Your email"
          type="email"
          autoComplete="email"
          fullWidth
          {...register("adminEmail")}
          error={!!errors.adminEmail}
          helperText={errors.adminEmail?.message}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          fullWidth
          {...register("adminPassword")}
          error={!!errors.adminPassword}
          helperText={errors.adminPassword?.message}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating organization..." : "Create organization"}
        </Button>
      </Stack>
    </Box>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography
          variant="h5"
          component="h1"
          gutterBottom
          sx={{ textAlign: "center" }}
        >
          SalesManager CRM
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mb: 3 }}
        >
          {mode === "login"
            ? "Log in to your account"
            : "Register your organization"}
        </Typography>

        {mode === "login" ? <LoginForm /> : <RegisterOrganizationForm />}

        <Typography variant="body2" sx={{ textAlign: "center", mt: 3 }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link
                component="button"
                type="button"
                onClick={() => setMode("register")}
              >
                Register your organization
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                component="button"
                type="button"
                onClick={() => setMode("login")}
              >
                Log in
              </Link>
            </>
          )}
        </Typography>
      </Paper>
    </Container>
  );
}
