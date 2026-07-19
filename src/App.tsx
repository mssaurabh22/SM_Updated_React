import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AppThemeProvider } from "./theme/ThemeContext";
import { AuthProvider } from "./auth/AuthContext";
import { EntitlementProvider } from "./entitlement/EntitlementContext";
import { AppRoutes } from "./routes/AppRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// AppThemeProvider needs both React Query (to fetch org/personal theme settings)
// and auth state (to know whether it's safe to fetch, and to get the bearer
// token + org id) available, so it must sit inside QueryClientProvider and
// AuthProvider. It still renders correctly pre-login (e.g. on /login), falling
// back to the hardcoded default theme whenever there's no authenticated user.
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <EntitlementProvider>
            <AppThemeProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <AppRoutes />
              </LocalizationProvider>
            </AppThemeProvider>
          </EntitlementProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
