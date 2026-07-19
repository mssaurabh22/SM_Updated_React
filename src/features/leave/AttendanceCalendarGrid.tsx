import dayjs from "dayjs";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { AttendanceDay, AttendanceStatus } from "../../api/attendanceApi";
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS } from "./attendanceStatusConfig";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEGEND_ORDER: AttendanceStatus[] = ["PRESENT", "ABSENT", "ON_LEAVE", "HOLIDAY", "WEEKEND"];

function StatusLegend() {
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", rowGap: 0.5, mb: 1.5 }}>
      {LEGEND_ORDER.map((status) => {
        const color = ATTENDANCE_STATUS_COLORS[status];
        const mainColor = color === "default" ? theme.palette.text.disabled : theme.palette[color].main;
        return (
          <Stack key={status} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: alpha(mainColor, 0.2),
                border: "1px solid",
                borderColor: alpha(mainColor, 0.6),
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {ATTENDANCE_STATUS_LABELS[status]}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

interface AttendanceCalendarGridProps {
  days: AttendanceDay[];
}

/**
 * Month calendar view shared by MyAttendancePage and the Employee Leave &
 * Attendance detail page: a 7-column grid of day cells color-coded by status,
 * with leading blanks so the 1st of the month lines up under its weekday.
 */
export function AttendanceCalendarGrid({ days }: AttendanceCalendarGridProps) {
  const theme = useTheme();

  if (days.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        No attendance data for this month.
      </Typography>
    );
  }

  const leadingBlanks = dayjs(days[0].date).day();

  return (
    <Box>
      <StatusLegend />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.5, sm: 1 }, mb: 0.5 }}>
        {WEEKDAY_LABELS.map((label) => (
          <Typography
            key={label}
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ fontWeight: 600 }}
          >
            {label}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.5, sm: 1 } }}>
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <Box key={`blank-${index}`} />
        ))}
        {days.map((day) => {
          const color = ATTENDANCE_STATUS_COLORS[day.status];
          const mainColor =
            color === "default"
              ? theme.palette.text.disabled
              : theme.palette[color].main;
          return (
            <Box
              key={day.date}
              title={ATTENDANCE_STATUS_LABELS[day.status]}
              sx={{
                border: "1px solid",
                borderColor: alpha(mainColor, 0.4),
                borderRadius: 1,
                bgcolor: alpha(mainColor, 0.1),
                p: { xs: 0.5, sm: 1 },
                minHeight: { xs: 44, sm: 64 },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
                {dayjs(day.date).date()}
              </Typography>
              {day.checkInAt && (
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ fontSize: { xs: "0.55rem", sm: "0.65rem" }, lineHeight: 1.2 }}
                >
                  In {dayjs(day.checkInAt).format("HH:mm")}
                </Typography>
              )}
              {day.checkOutAt && (
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ fontSize: { xs: "0.55rem", sm: "0.65rem" }, lineHeight: 1.2 }}
                >
                  Out {dayjs(day.checkOutAt).format("HH:mm")}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
