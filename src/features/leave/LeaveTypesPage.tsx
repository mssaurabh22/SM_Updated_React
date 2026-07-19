import { useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { LeaveType } from "../../api/leaveTypesApi";
import {
  useDeactivateLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
} from "../../api/leaveTypesApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";
import { LeaveTypeFormDialog } from "./LeaveTypeFormDialog";
import { ConfirmDialog } from "../../components/ConfirmDialog";

/**
 * Admin-only CRUD screen for the org's leave types (Casual, Sick, Earned, ...).
 * Structurally mirrors MasterDataPage's table pattern: dialog-based create/edit,
 * inline deactivate/activate, no hard delete.
 */
export function LeaveTypesPage() {
  const { data, isLoading, isError, error } = useLeaveTypes(true);
  const deactivateMutation = useDeactivateLeaveType();
  const updateMutation = useUpdateLeaveType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveType | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<LeaveType | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const openCreateDialog = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: LeaveType) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    setRowError(null);
    try {
      await deactivateMutation.mutateAsync(pendingDeactivate.id);
      setPendingDeactivate(null);
    } catch (error) {
      setRowError(parseApiError(error).message);
    }
  };

  const handleActivate = async (item: LeaveType) => {
    setRowError(null);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        payload: {
          name: item.name,
          defaultAllocationDays: item.defaultAllocationDays,
          sortOrder: item.sortOrder,
          active: true,
        },
      });
    } catch (error) {
      setRowError(parseApiError(error).message);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {parseApiError(error).message}
      </Alert>
    );
  }

  const items = [...(data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const term = search.trim().toLowerCase();
  const visibleItems = term
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term),
      )
    : items;

  const handleExport = () => {
    exportToCsv<LeaveType>(`leave-types-${dayjs().format("YYYY-MM-DD")}.csv`, visibleItems, [
      { label: "Name", value: (i) => i.name },
      { label: "Code", value: (i) => i.code },
      { label: "Default Allocation", value: (i) => i.defaultAllocationDays },
      { label: "Sort Order", value: (i) => i.sortOrder },
      { label: "Status", value: (i) => (i.active ? "Active" : "Inactive") },
    ]);
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
      >
        <Typography variant="h5">Leave Types</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreateDialog}>
          Add
        </Button>
      </Stack>

      {rowError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRowError(null)}>
          {rowError}
        </Alert>
      )}

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, code..."
        onExport={handleExport}
        exportDisabled={items.length === 0}
      />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell align="right">Default allocation</TableCell>
              <TableCell align="right">Sort order</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No leave types yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.length > 0 && visibleItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No leave types match your search.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <code>{item.code}</code>
                </TableCell>
                <TableCell align="right">{item.defaultAllocationDays}</TableCell>
                <TableCell align="right">{item.sortOrder}</TableCell>
                <TableCell>
                  <Chip
                    label={item.active ? "Active" : "Inactive"}
                    color={item.active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEditDialog(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {item.active ? (
                    <Tooltip title="Deactivate">
                      <IconButton size="small" onClick={() => setPendingDeactivate(item)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Activate">
                      <IconButton
                        size="small"
                        onClick={() => handleActivate(item)}
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <LeaveTypeFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        leaveType={editingItem}
      />

      {pendingDeactivate && (
        <ConfirmDialog
          open={!!pendingDeactivate}
          title="Deactivate leave type?"
          message={`Are you sure you want to deactivate "${pendingDeactivate.name}"? It will no longer be selectable for new leave requests, but existing requests referencing it are unaffected.`}
          isPending={deactivateMutation.isPending}
          confirmLabel="Deactivate"
          onCancel={() => setPendingDeactivate(null)}
          onConfirm={handleConfirmDeactivate}
        />
      )}
    </Box>
  );
}
