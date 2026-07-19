import { useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useClockIn, useClockOut, useMyAttendance } from "../../api/attendanceApi";
import { parseApiError } from "../../api/errorHelpers";
import { AttendanceCalendarGrid } from "./AttendanceCalendarGrid";

const TODAY = dayjs().format("YYYY-MM-DD");

/**
 * Employee-facing attendance home: clock-in/out for today plus a month
 * calendar of past days. Clock status is always read from the current month's
 * data (regardless of which month is being browsed below), since "today" only
 * ever falls in the current month.
 */
export function MyAttendancePage() {
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const yearMonth = month.format("YYYY-MM");
  const isCurrentMonth = yearMonth === dayjs().format("YYYY-MM");

  const { data: currentMonthDays } = useMyAttendance();
  const {
    data: viewedDays,
    isLoading,
    isError,
    error,
  } = useMyAttendance(yearMonth);

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const [actionError, setActionError] = useState<string | null>(null);

  const todayEntry = currentMonthDays?.find((d) => d.date === TODAY);

  const handleClockIn = async () => {
    setActionError(null);
    try {
      await clockInMutation.mutateAsync();
    } catch (err) {
      setActionError(parseApiError(err).message);
    }
  };

  const handleClockOut = async () => {
    setActionError(null);
    try {
      await clockOutMutation.mutateAsync();
    } catch (err) {
      setActionError(parseApiError(err).message);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        My Attendance
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {!todayEntry?.checkInAt && (
          <Button
            variant="contained"
            disabled={clockInMutation.isPending}
            onClick={handleClockIn}
          >
            {clockInMutation.isPending ? "Clocking in..." : "Clock In"}
          </Button>
        )}

        {todayEntry?.checkInAt && !todayEntry.checkOutAt && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Typography variant="body2" color="text.secondary">
              Checked in at {dayjs(todayEntry.checkInAt).format("HH:mm")}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={clockOutMutation.isPending}
              onClick={handleClockOut}
            >
              {clockOutMutation.isPending ? "Clocking out..." : "Clock Out"}
            </Button>
          </Stack>
        )}

        {todayEntry?.checkInAt && todayEntry.checkOutAt && (
          <Typography variant="body2" color="text.secondary">
            Clocked out at {dayjs(todayEntry.checkOutAt).format("HH:mm")} (checked in at{" "}
            {dayjs(todayEntry.checkInAt).format("HH:mm")})
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
        >
          <Typography variant="h6">{month.format("MMMM YYYY")}</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              onClick={() => setMonth((m) => m.subtract(1, "month"))}
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </IconButton>
            <Button
              size="small"
              disabled={isCurrentMonth}
              onClick={() => setMonth(dayjs().startOf("month"))}
            >
              Today
            </Button>
            <IconButton
              size="small"
              onClick={() => setMonth((m) => m.add(1, "month"))}
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Stack>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseApiError(error).message}
          </Alert>
        )}

        {viewedDays && <AttendanceCalendarGrid days={viewedDays} />}
      </Paper>
    </Box>
  );
}
