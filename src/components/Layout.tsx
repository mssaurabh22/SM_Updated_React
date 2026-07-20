import { useState } from "react";
import type { MouseEvent } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import TuneIcon from "@mui/icons-material/Tune";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HistoryIcon from "@mui/icons-material/History";
import BarChartIcon from "@mui/icons-material/BarChart";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarViewMonthIcon from "@mui/icons-material/CalendarViewMonth";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import dayjs from "dayjs";
import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "../entitlement/EntitlementContext";
import type { Notification } from "../api/notificationsApi";
import { useMarkNotificationRead, useNotifications } from "../api/notificationsApi";

const DRAWER_WIDTH = 220;

/** Small static (non-sticky) group label between nav sections - plain List has no built-in grouping otherwise. */
function NavSectionHeader({ label }: { label: string }) {
  return (
    <ListSubheader
      disableSticky
      sx={{
        lineHeight: "32px",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        bgcolor: "transparent",
      }}
    >
      {label}
    </ListSubheader>
  );
}

interface NotificationPayload {
  leadId?: string;
  companyName?: string;
  visitId?: string;
  count?: number;
  leaveRequestId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

function parseNotificationPayload(
  raw: string | null,
): NotificationPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NotificationPayload;
  } catch {
    return null;
  }
}

/** Generic per-type message, enriched with details parsed from payload when available. */
function describeNotification(notification: Notification): string {
  const payload = parseNotificationPayload(notification.payload);
  switch (notification.type) {
    case "LEAD_REASSIGNED":
      return payload?.companyName
        ? `You were assigned the lead "${payload.companyName}".`
        : "You were assigned a lead.";
    case "VISIT_MISSED":
      return payload?.companyName
        ? `A visit for "${payload.companyName}" was missed.`
        : "A scheduled visit was missed.";
    case "LEAD_LAPSED":
      return payload?.companyName
        ? `Your lead "${payload.companyName}" has lapsed - its follow-up date passed.`
        : "One of your leads has lapsed.";
    case "LEAD_LAPSED_DIGEST": {
      const count = payload?.count;
      return count
        ? `${count} of your team's lead${count === 1 ? "" : "s"} lapsed last night - review the pipeline.`
        : "Some of your team's leads lapsed last night - review the pipeline.";
    }
    case "LEAVE_REQUEST_SUBMITTED":
      return "A leave request was submitted for your approval.";
    case "LEAVE_REQUEST_APPROVED":
      return "Your leave request was approved.";
    case "LEAVE_REQUEST_REJECTED":
      return "Your leave request was rejected.";
    default:
      return "You have a new notification.";
  }
}

/**
 * Authenticated app shell: an AppBar (title, logged-in user, logout) plus a simple
 * sidebar with only the one destination that exists so far. New sections
 * (leads/visits/employees/masters/settings) will get their own nav items and
 * routes in later phases.
 */
export function Layout() {
  const { email, role, logout } = useAuth();
  const { hasEntitlement } = useEntitlements();
  const hasLeaveManagement = hasEntitlement("EMPLOYEE_LEAVE_MANAGEMENT");
  const hasTeamVisibility = hasEntitlement("TEAM_VISIBILITY");
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [notifAnchorEl, setNotifAnchorEl] = useState<HTMLElement | null>(null);
  const notifMenuOpen = Boolean(notifAnchorEl);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: notificationsPage } = useNotifications(false, { size: 20 });
  const markReadMutation = useMarkNotificationRead();

  const notifications = notificationsPage?.content ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleToggleMobileNav = () => {
    setMobileNavOpen((prev) => !prev);
  };

  const handleCloseMobileNav = () => {
    setMobileNavOpen(false);
  };

  /** Navigates to the destination and, on mobile, closes the temporary drawer
   * so it doesn't stay open over the newly-navigated page. */
  const handleNavigate = (path: string) => {
    navigate(path);
    handleCloseMobileNav();
  };

  const handleOpenNotifications = (event: MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotifAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const payload = parseNotificationPayload(notification.payload);
    handleCloseNotifications();
    if (payload?.leadId) {
      navigate(`/app/leads/${payload.leadId}`);
    } else if (notification.type === "LEAD_LAPSED_DIGEST") {
      navigate("/app/leads?status=LAPSED");
    } else if (notification.type === "LEAVE_REQUEST_SUBMITTED") {
      navigate("/app/leave/approvals");
    } else if (
      notification.type === "LEAVE_REQUEST_APPROVED" ||
      notification.type === "LEAVE_REQUEST_REJECTED"
    ) {
      navigate("/app/leave");
    }
  };

  const navList = (
    <List>
      <ListItemButton
        selected={location.pathname === "/app"}
        onClick={() => handleNavigate("/app")}
      >
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItemButton>

      <NavSectionHeader label="Sales" />

      <ListItemButton
        selected={location.pathname.startsWith("/app/leads")}
        onClick={() => handleNavigate("/app/leads")}
      >
        <ListItemIcon>
          <AssignmentIcon />
        </ListItemIcon>
        <ListItemText primary="Leads" />
      </ListItemButton>

      <ListItemButton
        selected={location.pathname.startsWith("/app/activity")}
        onClick={() => handleNavigate("/app/activity")}
      >
        <ListItemIcon>
          <HistoryIcon />
        </ListItemIcon>
        <ListItemText primary="Activity" />
      </ListItemButton>

      {/* ADMINs already get a "Reports" item in the Administration section below - this is
          only for a non-admin manager reaching it via TEAM_VISIBILITY (see TeamVisibilityRoute). */}
      {role !== "ADMIN" && hasTeamVisibility && (
        <ListItemButton
          selected={location.pathname.startsWith("/app/reports")}
          onClick={() => handleNavigate("/app/reports")}
        >
          <ListItemIcon>
            <BarChartIcon />
          </ListItemIcon>
          <ListItemText primary="Reports" />
        </ListItemButton>
      )}

      {hasLeaveManagement && (
        <>
          <NavSectionHeader label="Leave & Attendance" />

          <ListItemButton
            selected={location.pathname === "/app/leave"}
            onClick={() => handleNavigate("/app/leave")}
          >
            <ListItemIcon>
              <BeachAccessIcon />
            </ListItemIcon>
            <ListItemText primary="My Leave" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname.startsWith("/app/leave/approvals")}
            onClick={() => handleNavigate("/app/leave/approvals")}
          >
            <ListItemIcon>
              <FactCheckIcon />
            </ListItemIcon>
            <ListItemText primary="Leave Approvals" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname.startsWith("/app/leave/attendance")}
            onClick={() => handleNavigate("/app/leave/attendance")}
          >
            <ListItemIcon>
              <AccessTimeIcon />
            </ListItemIcon>
            <ListItemText primary="My Attendance" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname.startsWith("/app/leave/team-calendar")}
            onClick={() => handleNavigate("/app/leave/team-calendar")}
          >
            <ListItemIcon>
              <CalendarViewMonthIcon />
            </ListItemIcon>
            <ListItemText primary="Team Calendar" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname.startsWith("/app/leave/hr-dashboard")}
            onClick={() => handleNavigate("/app/leave/hr-dashboard")}
          >
            <ListItemIcon>
              <SpaceDashboardIcon />
            </ListItemIcon>
            <ListItemText primary="HR Dashboard" />
          </ListItemButton>
        </>
      )}

      {role === "ADMIN" && (
        <>
          <NavSectionHeader label="Administration" />

          <ListItemButton
            selected={location.pathname.startsWith("/app/masters")}
            onClick={() => handleNavigate("/app/masters")}
          >
            <ListItemIcon>
              <TuneIcon />
            </ListItemIcon>
            <ListItemText primary="Masters" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname.startsWith("/app/employees")}
            onClick={() => handleNavigate("/app/employees")}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Employees" />
          </ListItemButton>

          <ListItemButton
            selected={location.pathname.startsWith("/app/reports")}
            onClick={() => handleNavigate("/app/reports")}
          >
            <ListItemIcon>
              <BarChartIcon />
            </ListItemIcon>
            <ListItemText primary="Reports" />
          </ListItemButton>

          {hasLeaveManagement && (
            <>
              <ListItemButton
                selected={location.pathname.startsWith("/app/leave/types")}
                onClick={() => handleNavigate("/app/leave/types")}
              >
                <ListItemIcon>
                  <EventBusyIcon />
                </ListItemIcon>
                <ListItemText primary="Leave Types" />
              </ListItemButton>

              <ListItemButton
                selected={location.pathname.startsWith("/app/leave/holidays")}
                onClick={() => handleNavigate("/app/leave/holidays")}
              >
                <ListItemIcon>
                  <CalendarMonthIcon />
                </ListItemIcon>
                <ListItemText primary="Holidays" />
              </ListItemButton>
            </>
          )}
        </>
      )}

      <Divider sx={{ my: 1 }} />

      <ListItemButton
        selected={location.pathname.startsWith("/app/settings")}
        onClick={() => handleNavigate("/app/settings")}
      >
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText primary="Settings" />
      </ListItemButton>
    </List>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleToggleMobileNav}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontSize: { xs: "1.05rem", sm: "1.25rem" } }}
          >
            {isMobile ? "SalesManager" : "SalesManager CRM"}
          </Typography>
          {email && (
            <Typography variant="body2" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
              {email}
            </Typography>
          )}
          {role && (
            <Chip
              label={role}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ color: "inherit", borderColor: "rgba(255,255,255,0.5)" }}
            />
          )}
          <IconButton color="inherit" onClick={handleOpenNotifications}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notifAnchorEl}
            open={notifMenuOpen}
            onClose={handleCloseNotifications}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { width: 340, maxHeight: 420 } } }}
          >
            {notifications.length === 0 && (
              <MenuItem disabled>No notifications yet</MenuItem>
            )}
            {notifications.flatMap((notification, index) => {
              const items = [];
              if (index > 0) {
                items.push(<Divider key={`${notification.id}-divider`} />);
              }
              items.push(
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    whiteSpace: "normal",
                    alignItems: "flex-start",
                    py: 1.5,
                    bgcolor: notification.isRead ? "transparent" : "action.hover",
                  }}
                >
                  <Box>
                    <Typography variant="body2">
                      {describeNotification(notification)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(notification.createdAt).format("DD MMM YYYY, HH:mm")}
                    </Typography>
                  </Box>
                </MenuItem>,
              );
              return items;
            })}
          </Menu>
          {isMobile ? (
            <IconButton
              color="inherit"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogoutIcon />
            </IconButton>
          ) : (
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileNavOpen}
          onClose={handleCloseMobileNav}
          ModalProps={{ keepMounted: true }}
          sx={{
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          <Toolbar />
          {navList}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          <Toolbar />
          {navList}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
