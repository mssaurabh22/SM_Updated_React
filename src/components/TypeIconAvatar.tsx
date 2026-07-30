import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export type TypeIconColor = "info" | "primary" | "warning" | "error" | "success" | "default";

interface TypeIconAvatarProps {
  icon: ComponentType<SvgIconProps>;
  color: TypeIconColor;
  size?: number;
  /** Desaturated grey instead of the type's own color - for an already-read notification, so
   * it visually recedes next to unread ones still showing their full color. */
  muted?: boolean;
}

/**
 * Rounded-square, softly-tinted icon badge shared by NotificationsPage, ActivityPage, and the
 * Layout bell dropdown - a "timeline entry" visual (colored icon chip beside the text) instead
 * of a bare MUI Chip, part of the visual reskin pass. Purely a rendering choice: the underlying
 * per-type color/icon maps (NOTIFICATION_TYPE_COLORS/ICONS, ACTIVITY_TYPE_COLORS/ICONS) are
 * unchanged, just consumed here instead of feeding Chip's icon/color props directly.
 */
export function TypeIconAvatar({ icon: Icon, color, size = 36, muted = false }: TypeIconAvatarProps) {
  const theme = useTheme();
  const mainColor = color === "default" ? theme.palette.text.secondary : theme.palette[color].main;
  const displayColor = muted ? theme.palette.text.disabled : mainColor;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: muted ? theme.palette.action.hover : alpha(mainColor, 0.14),
        color: displayColor,
        flexShrink: 0,
      }}
    >
      <Icon fontSize="small" />
    </Box>
  );
}
