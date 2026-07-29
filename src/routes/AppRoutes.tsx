import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../auth/LoginPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AdminRoute } from "../auth/AdminRoute";
import { TeamVisibilityRoute } from "../auth/TeamVisibilityRoute";
import { Layout } from "../components/Layout";
import { TodaysFollowUpsPage } from "../features/dashboard/TodaysFollowUpsPage";
import { NotFoundPage } from "../components/NotFoundPage";
import { MasterDataPage } from "../features/masters/MasterDataPage";
import { DEFAULT_MASTER_DATA_TYPE } from "../features/masters/masterTypeConfig";
import { EmployeeListPage } from "../features/employees/EmployeeListPage";
import { LeadListPage } from "../features/leads/LeadListPage";
import { LeadDetailPage } from "../features/leads/LeadDetailPage";
import { LeadImportPage } from "../features/leads/LeadImportPage";
import { ActivityPage } from "../features/activity/ActivityPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { RequireEntitlementRoute } from "../entitlement/RequireEntitlementRoute";
import { MyLeaveRequestsPage } from "../features/leave/MyLeaveRequestsPage";
import { LeaveApprovalsPage } from "../features/leave/LeaveApprovalsPage";
import { LeaveTypesPage } from "../features/leave/LeaveTypesPage";
import { HolidaysPage } from "../features/leave/HolidaysPage";
import { MyAttendancePage } from "../features/leave/MyAttendancePage";
import { EmployeeLeaveAttendanceDetailPage } from "../features/leave/EmployeeLeaveAttendanceDetailPage";
import { TeamLeaveCalendarPage } from "../features/leave/TeamLeaveCalendarPage";
import { HrDashboardPage } from "../features/leave/HrDashboardPage";
import { PlatformConsolePage } from "../features/platform/PlatformConsolePage";
import { ProductListPage } from "../features/inventory/ProductListPage";
import { InvoiceListPage } from "../features/invoicing/InvoiceListPage";
import { InvoiceFormPage } from "../features/invoicing/InvoiceFormPage";
import { InvoiceDetailPage } from "../features/invoicing/InvoiceDetailPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform-console" element={<PlatformConsolePage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Layout />}>
          <Route index element={<TodaysFollowUpsPage />} />

          <Route path="leads" element={<LeadListPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />

          <Route path="activity" element={<ActivityPage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          <Route path="settings" element={<SettingsPage />} />

          <Route element={<AdminRoute />}>
            <Route
              path="masters"
              element={
                <Navigate
                  to={`/app/masters/${DEFAULT_MASTER_DATA_TYPE}`}
                  replace
                />
              }
            />
            <Route path="masters/:type" element={<MasterDataPage />} />
            <Route path="employees" element={<EmployeeListPage />} />
            <Route path="leads/import" element={<LeadImportPage />} />
          </Route>

          <Route element={<TeamVisibilityRoute />}>
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RequireEntitlementRoute feature="EMPLOYEE_LEAVE_MANAGEMENT" />}>
            <Route path="leave" element={<MyLeaveRequestsPage />} />
            <Route path="leave/approvals" element={<LeaveApprovalsPage />} />
            <Route path="leave/attendance" element={<MyAttendancePage />} />
            <Route
              path="leave/employee/:employeeId"
              element={<EmployeeLeaveAttendanceDetailPage />}
            />
            <Route path="leave/team-calendar" element={<TeamLeaveCalendarPage />} />
            <Route path="leave/hr-dashboard" element={<HrDashboardPage />} />
            <Route element={<AdminRoute />}>
              <Route path="leave/types" element={<LeaveTypesPage />} />
              <Route path="leave/holidays" element={<HolidaysPage />} />
            </Route>
          </Route>

          <Route element={<RequireEntitlementRoute feature="INVENTORY_MANAGEMENT" />}>
            <Route path="inventory/products" element={<ProductListPage />} />
            <Route path="invoices" element={<InvoiceListPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
