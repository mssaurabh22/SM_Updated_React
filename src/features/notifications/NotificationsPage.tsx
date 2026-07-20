import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import type { Notification, NotificationType } from "../../api/notificationsApi";
import {
  NOTIFICATION_TYPES,
  getNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../../api/notificationsApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";
import {
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
  describeNotification,
  getNotificationTarget,
} from "../../utils/notificationFormat";

const PAGE_SIZE = 20;

/**
 * Full notification history - the bell dropdown (Layout) only ever shows the latest 10 with a
 * "See all" link here. Same read/unread visual language as the bell (bold text + a colored
 * dot for unread), same search+export+pagination convention as every other list in the app.
 * "unread only" is a real server-side filter (NotificationService already supported it); the
 * Type filter narrows the currently-loaded page only, same as ActivityPage's Type filter and
 * the app-wide search-box convention - the backend has no per-type notification filter today.
 */
export function NotificationsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "">("");
  const [search, setSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useNotifications(unreadOnly, {
    page,
    size: PAGE_SIZE,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const visibleNotifications = useMemo(() => {
    const content = data?.content ?? [];
    const term = search.trim().toLowerCase();
    return content.filter((n) => {
      if (typeFilter && n.type !== typeFilter) return false;
      if (!term) return true;
      return describeNotification(n).toLowerCase().includes(term);
    });
  }, [data, search, typeFilter]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const target = getNotificationTarget(notification);
    if (target) {
      navigate(target);
    }
  };

  const handleExport = async () => {
    setExportError(null);
    setExportLoading(true);
    try {
      const all = await getNotifications({ unreadOnly, size: 1000 });
      exportToCsv<Notification>(`notifications-${dayjs().format("YYYY-MM-DD")}.csv`, all.content, [
        { label: "Type", value: (n) => NOTIFICATION_TYPE_LABELS[n.type] },
        { label: "Message", value: (n) => describeNotification(n) },
        { label: "Read", value: (n) => (n.isRead ? "Yes" : "No") },
        { label: "When", value: (n) => dayjs(n.createdAt).format("YYYY-MM-DD HH:mm") },
      ]);
    } catch (err) {
      setExportError(parseApiError(err).message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Notifications</Typography>
        <Button
          startIcon={<DoneAllIcon />}
          variant="outlined"
          disabled={unreadCount === 0 || markAllReadMutation.isPending}
          onClick={() => markAllReadMutation.mutate()}
        >
          Mark all read
        </Button>
      </Stack>

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search notifications..."
        onExport={handleExport}
        exportDisabled={!data || data.content.length === 0}
        exportLoading={exportLoading}
      >
        <TextField
          select
          label="Type"
          size="small"
          sx={{ minWidth: 200, flexShrink: 0 }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NotificationType | "")}
        >
          <MenuItem value="">All types</MenuItem>
          {NOTIFICATION_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {NOTIFICATION_TYPE_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          sx={{ flexShrink: 0, ml: 0 }}
          control={
            <Checkbox
              checked={unreadOnly}
              onChange={(e) => {
                setPage(0);
                setUnreadOnly(e.target.checked);
              }}
            />
          }
          label="Unread only"
        />
      </TableToolbar>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {parseApiError(error).message}
        </Alert>
      )}

      {data && (
        <>
          {data.content.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No notifications yet.
              </Typography>
            </Paper>
          )}

          {data.content.length > 0 && visibleNotifications.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No notifications match your search.
              </Typography>
            </Paper>
          )}

          {isMobile && visibleNotifications.length > 0 && (
            <Stack spacing={1.5}>
              {visibleNotifications.map((notification) => {
                const Icon = NOTIFICATION_TYPE_ICONS[notification.type];
                return (
                  <Card
                    key={notification.id}
                    variant="outlined"
                    sx={{ cursor: "pointer", bgcolor: notification.isRead ? "transparent" : "action.selected" }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}
                      >
                        <Chip
                          icon={<Icon fontSize="small" />}
                          label={NOTIFICATION_TYPE_LABELS[notification.type]}
                          color={NOTIFICATION_TYPE_COLORS[notification.type]}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(notification.createdAt).format("DD MMM, HH:mm")}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                        {!notification.isRead && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              mt: 0.75,
                              flexShrink: 0,
                              bgcolor: "error.main",
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: notification.isRead ? 400 : 700 }}
                        >
                          {describeNotification(notification)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {!isMobile && visibleNotifications.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Type</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleNotifications.map((notification) => {
                    const Icon = NOTIFICATION_TYPE_ICONS[notification.type];
                    return (
                      <TableRow
                        key={notification.id}
                        hover
                        sx={{
                          cursor: "pointer",
                          bgcolor: notification.isRead ? "transparent" : "action.selected",
                        }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <TableCell sx={{ width: 24 }}>
                          {!notification.isRead && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: "error.main",
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<Icon fontSize="small" />}
                            label={NOTIFICATION_TYPE_LABELS[notification.type]}
                            color={NOTIFICATION_TYPE_COLORS[notification.type]}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: notification.isRead ? 400 : 700 }}>
                          {describeNotification(notification)}
                        </TableCell>
                        <TableCell>
                          {dayjs(notification.createdAt).format("DD MMM YYYY, HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {data.totalPages > 1 && (
            <Stack direction="row" sx={{ justifyContent: "center", mt: 2 }}>
              <Pagination
                count={data.totalPages}
                page={page + 1}
                onChange={(_, next) => setPage(next - 1)}
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
