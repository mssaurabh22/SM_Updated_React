import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export interface StatCardProps {
  icon: ReactNode;
  /** One of the theme's palette keys, e.g. "primary", "success", "warning", "error", "info". */
  color?: "primary" | "success" | "warning" | "error" | "info" | "secondary";
  value: ReactNode;
  label: string;
}

/**
 * Compact stat widget: a colored icon in a soft-tinted circle beside a large
 * number + label. Used on Reports and Today's Follow-ups so key figures are
 * scannable at a glance rather than plain unadorned numbers.
 */
export function StatCard({ icon, color = "primary", value, label }: StatCardProps) {
  const theme = useTheme();
  const mainColor = theme.palette[color].main;

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: alpha(mainColor, 0.12),
            color: mainColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
