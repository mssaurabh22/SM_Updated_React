import type { ReactNode } from "react";
import { Button, CircularProgress, InputAdornment, Stack, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onExport: () => void;
  exportDisabled?: boolean;
  exportLoading?: boolean;
  children?: ReactNode;
}

/** Search box + a page's own filter controls (as children) + Export CSV, one row. */
export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onExport,
  exportDisabled = false,
  exportLoading = false,
  children,
}: TableToolbarProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        mb: 2,
        flexWrap: { xs: "nowrap", sm: "wrap" },
        overflowX: { xs: "auto", sm: "visible" },
        pb: { xs: 0.5, sm: 0 },
        alignItems: "center",
      }}
    >
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 200, flexShrink: 0 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {children}

      <Button
        startIcon={
          exportLoading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />
        }
        variant="outlined"
        size="small"
        onClick={onExport}
        disabled={exportDisabled || exportLoading}
        sx={{ flexShrink: 0, ml: { sm: "auto" } }}
      >
        Export CSV
      </Button>
    </Stack>
  );
}
