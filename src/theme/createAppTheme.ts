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
 * hasn't customized anything is unchanged from the original static theme:
 * primary "#1565c0", light mode, comfortable density.
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
        outlined: {
          borderColor: "rgba(127, 127, 127, 0.24)",
        },
        elevation1: {
          boxShadow:
            "0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08)",
        },
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
  };

  // Density overrides are applied per-component on top of the base ones, so
  // compact mode's defaultProps (which base doesn't set) merge in rather than
  // clobbering the base styleOverrides for the same component key.
  const components: Record<string, unknown> = { ...baseComponents };
  for (const [key, value] of Object.entries(densityComponents)) {
    components[key] = { ...(components[key] as object | undefined), ...value };
  }

  return createTheme({
    palette: {
      mode: settings.mode,
      primary: {
        main: settings.primaryColor,
      },
      secondary: {
        main: "#00897b",
      },
    },
    shape: {
      borderRadius: 10,
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
