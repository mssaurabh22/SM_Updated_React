import { useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Holiday } from "../../api/holidaysApi";
import { useDeleteHoliday, useHolidays } from "../../api/holidaysApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";
import { HolidayFormDialog } from "./HolidayFormDialog";
import { ConfirmDialog } from "../../components/ConfirmDialog";

const CURRENT_YEAR = dayjs().year();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

/** Admin-only management screen for the org's holiday calendar (used server-side
 * to exclude non-working days from leave request day counts). */
export function HolidaysPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const { data, isLoading, isError, error } = useHolidays(year);
  const deleteMutation = useDeleteHoliday();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setRowError(null);
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setRowError(parseApiError(error).message);
    }
  };

  const items = [...(data ?? [])].sort((a, b) =>
    a.holidayDate.localeCompare(b.holidayDate),
  );
  const term = search.trim().toLowerCase();
  const visibleItems = term
    ? items.filter((item) => item.name.toLowerCase().includes(term))
    : items;

  const handleExport = () => {
    exportToCsv<Holiday>(`holidays-${year}-${dayjs().format("YYYY-MM-DD")}.csv`, visibleItems, [
      { label: "Name", value: (i) => i.name },
      { label: "Date", value: (i) => i.holidayDate },
    ]);
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
      >
        <Typography variant="h5">Holidays</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
          Add Holiday
        </Button>
      </Stack>

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name..."
        onExport={handleExport}
        exportDisabled={items.length === 0}
      >
        <TextField
          select
          label="Year"
          size="small"
          sx={{ minWidth: 120, flexShrink: 0 }}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {YEAR_OPTIONS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </TableToolbar>

      {rowError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRowError(null)}>
          {rowError}
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
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No holidays configured for {year}.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.length > 0 && visibleItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No holidays match your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {visibleItems.map((holiday) => (
                <TableRow key={holiday.id} hover>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>{dayjs(holiday.holidayDate).format("DD MMM YYYY")}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setPendingDelete(holiday)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <HolidayFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          title="Delete holiday?"
          message={`Are you sure you want to delete "${pendingDelete.name}" (${dayjs(pendingDelete.holidayDate).format("DD MMM YYYY")})?`}
          isPending={deleteMutation.isPending}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </Box>
  );
}
