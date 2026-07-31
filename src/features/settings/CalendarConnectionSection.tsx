import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import {
  getAuthorizeUrl,
  useCalendarConnectionStatus,
  useDisconnectCalendar,
  type CalendarProvider,
} from "../../api/calendarConnectionApi";
import { parseApiError } from "../../api/errorHelpers";

const PROVIDER_LABELS: Record<CalendarProvider, string> = {
  GOOGLE: "Google Calendar",
  OUTLOOK: "Outlook",
};

/** A plain SectionCard sibling (rendered by SettingsPage, same conditional-render pattern as
 * BillingProfileSection) - gated on hasEntitlement("CALENDAR_SYNC") by the caller. Connect is a
 * full-page redirect (window.location.href), not an API call - see calendarConnectionApi.ts's
 * getAuthorizeUrl comment for why. The ?calendar=connected|error query param this page is
 * reloaded with (CalendarConnectionController's callback redirect) surfaces a one-time result
 * banner, then is stripped from the URL so refreshing the page doesn't re-show it. */
export function CalendarConnectionSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusQuery = useCalendarConnectionStatus(true);
  const disconnectMutation = useDisconnectCalendar();
  const [connectError, setConnectError] = useState<string | null>(null);

  const redirectResult = searchParams.get("calendar");

  useEffect(() => {
    if (!redirectResult) return;
    const next = new URLSearchParams(searchParams);
    next.delete("calendar");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectResult]);

  const handleConnect = async (provider: CalendarProvider) => {
    setConnectError(null);
    try {
      const url = await getAuthorizeUrl(provider);
      window.location.href = url;
    } catch (err) {
      setConnectError(parseApiError(err).message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
    } catch {
      // Disconnect is a no-op-safe delete server-side - nothing meaningful to show on failure
      // beyond the status simply staying as-is, which the invalidated query already reflects.
    }
  };

  const status = statusQuery.data;

  return (
    <Stack spacing={2}>
      {redirectResult === "connected" && (
        <Alert severity="success">Calendar connected successfully.</Alert>
      )}
      {redirectResult === "error" && (
        <Alert severity="error">Couldn't connect your calendar - please try again.</Alert>
      )}
      {connectError && <Alert severity="error">{connectError}</Alert>}

      {status?.connected ? (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Chip label={PROVIDER_LABELS[status.provider!]} color="primary" size="small" />
            <Typography variant="body2" color="text.secondary">
              Connected {dayjs(status.connectedAt).format("DD MMM YYYY")}
            </Typography>
          </Stack>
          {status.lastSyncError && (
            <Alert severity="warning">Last sync attempt failed: {status.lastSyncError}</Alert>
          )}
          <Button
            size="small"
            color="error"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
          >
            Disconnect
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => handleConnect("GOOGLE")}>
            Connect Google Calendar
          </Button>
          <Button variant="outlined" onClick={() => handleConnect("OUTLOOK")}>
            Connect Outlook
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
