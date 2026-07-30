import { alpha, createTheme, type Theme } from "@mui/material/styles";

/**
 * Fully-resolved theme inputs, ready for MUI consumption (lowercase mode/density,
 * merged from org branding + personal preference + hardcoded fallbacks — see
 * `resolveEffectiveTheme` in `./ThemeContext.tsx` for how this is produced).
 */
export interface EffectiveThemeSettings {
  primaryColor: string;
  mode: "light" | "dark";
  density: "comfortable" | "compact";
}

/**
 * Builds the MUI theme from fully-resolved settings. Org branding + optional
 * per-user override are merged upstream (see ThemeContext.tsx); this factory only
 * ever sees the final, effective values. The ultimate fallback for anyone who
 * hasn't customized anything is set in ThemeContext.tsx's HARDCODED_DEFAULTS
 * (indigo "#6366f1", light mode, comfortable density, as of the 2026-07-29 reskin).
 */
export function createAppTheme(settings: EffectiveThemeSettings): Theme {
  const isCompact = settings.density === "compact";

  // NOTE: this MUI version's createTheme internals call Object.keys(components)
  // unconditionally, which throws if `components` is `undefined` — so this must
  // always be a real object (possibly empty), never `undefined`.
  const densityComponents = isCompact
    ? {
        MuiButton: {
          defaultProps: {
            size: "small" as const,
          },
        },
        MuiTextField: {
          defaultProps: {
            size: "small" as const,
            margin: "dense" as const,
          },
        },
        MuiFormControl: {
          defaultProps: {
            size: "small" as const,
            margin: "dense" as const,
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              paddingTop: 6,
              paddingBottom: 6,
            },
          },
        },
        MuiToolbar: {
          styleOverrides: {
            regular: {
              minHeight: 52,
            },
          },
        },
      }
    : {};

  // Component/style refinements that apply regardless of density or the chosen
  // primary color — a small, broadly-applicable polish pass over MUI's defaults.
  // Merged with `densityComponents` below (density-specific defaultProps for
  // MuiButton/MuiTextField/MuiFormControl win over these when compact, since
  // Object.assign keeps the last write per top-level key — see merge below).
  const baseComponents = {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: ({ theme }: { theme: Theme }) => ({
          borderColor: theme.palette.divider,
        }),
        elevation1: ({ theme }: { theme: Theme }) => ({
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)"
              : "0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08)",
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          "& .MuiTableCell-root": {
            backgroundColor: theme.palette.action.hover,
            fontWeight: 600,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    // Pill-style active nav item (sidebar only - ListItemButton isn't used
    // anywhere else in the app) instead of MUI's default flat rectangular
    // selected highlight - a small, broadly-noticeable "modern app" touch.
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          borderRadius: (theme.shape.borderRadius as number) * 2,
          marginLeft: theme.spacing(1),
          marginRight: theme.spacing(1),
          width: `calc(100% - ${theme.spacing(2)})`,
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            color: theme.palette.primary.main,
            "& .MuiListItemIcon-root": {
              color: theme.palette.primary.main,
            },
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.18),
            },
          },
        }),
      },
    },
    // A flat, bordered surface (no solid color fill, no drop shadow) instead of MUI's
    // default solid-primary AppBar - matches the "chrome recedes, content leads" look
    // of both reference designs discussed in the UI reskin pass, and works identically
    // in light/dark since it's driven by palette.background/divider, not a hardcoded color.
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.background.paper,
          backgroundImage: "none",
          color: theme.palette.text.primary,
          boxShadow: "none",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    // The permanent sidebar Drawer gets the same flat-bordered treatment, so it reads
    // as one continuous surface with the AppBar rather than a separate colored block.
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }: { theme: Theme }) => ({
          borderRight: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
  };

  // Density overrides are applied per-component on top of the base ones, so
  // compact mode's defaultProps (which base doesn't set) merge in rather than
  // clobbering the base styleOverrides for the same component key.
  const components: Record<string, unknown> = { ...baseComponents };
  for (const [key, value] of Object.entries(densityComponents)) {
    components[key] = { ...(components[key] as object | undefined), ...value };
  }

  // Richer surface tones than MUI's defaults (which use a fairly flat mid-grey for dark
  // mode, and pure white-on-white for light mode) - a near-black background with a
  // slightly-lighter paper tone gives dark mode actual depth between "page" and "card",
  // and a soft off-white background does the same in light mode against white cards.
  const backgroundPalette =
    settings.mode === "dark"
      ? { default: "#0b0d14", paper: "#12141f" }
      : { default: "#f6f7fb", paper: "#ffffff" };

  return createTheme({
    palette: {
      mode: settings.mode,
      primary: {
        main: settings.primaryColor,
      },
      secondary: {
        main: "#00897b",
      },
      background: backgroundPalette,
      divider:
        settings.mode === "dark" ? "rgba(255, 255, 255, 0.09)" : "rgba(17, 24, 39, 0.08)",
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily:
        '"Roboto", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 500,
      },
    },
    components,
  });
}
