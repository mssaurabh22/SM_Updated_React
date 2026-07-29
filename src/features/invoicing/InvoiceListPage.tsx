import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import type { Invoice, InvoiceStatus } from "../../api/invoicesApi";
import { getInvoices, useInvoices } from "../../api/invoicesApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<InvoiceStatus, "success" | "warning"> = {
  PAID: "success",
  UNPAID: "warning",
};

export function InvoiceListPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [search, setSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useInvoices({
    status: statusFilter || undefined,
    page,
    size: PAGE_SIZE,
  });

  const visibleInvoices = useMemo(() => {
    const content = data?.content ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return content;
    return content.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.customerName.toLowerCase().includes(term),
    );
  }, [data, search]);

  const handleExport = async () => {
    setExportError(null);
    setExportLoading(true);
    try {
      const all = await getInvoices({ status: statusFilter || undefined, size: 1000 });
      exportToCsv<Invoice>(`invoices-${dayjs().format("YYYY-MM-DD")}.csv`, all.content, [
        { label: "Invoice #", value: (i) => i.invoiceNumber },
        { label: "Customer", value: (i) => i.customerName },
        { label: "Date", value: (i) => i.invoiceDate },
        { label: "Grand Total", value: (i) => i.grandTotal },
        { label: "Status", value: (i) => i.status },
      ]);
    } catch (err) {
      setExportError(parseApiError(err).message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Invoices</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => navigate("/app/invoices/new")}
        >
          New Invoice
        </Button>
      </Stack>

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice #, customer..."
        onExport={handleExport}
        exportDisabled={!data || data.content.length === 0}
        exportLoading={exportLoading}
      >
        <TextField
          select
          label="Status"
          size="small"
          sx={{ minWidth: 150, flexShrink: 0 }}
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value as InvoiceStatus | "");
          }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="UNPAID">Unpaid</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
        </TextField>
      </TableToolbar>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
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
        <>
          {data.content.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No invoices yet.
              </Typography>
            </Paper>
          )}

          {data.content.length > 0 && visibleInvoices.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No invoices match your search.
              </Typography>
            </Paper>
          )}

          {isMobile && visibleInvoices.length > 0 && (
            <Stack spacing={1.5}>
              {visibleInvoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  variant="outlined"
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                >
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="subtitle1">{invoice.invoiceNumber}</Typography>
                      <Chip label={invoice.status} color={STATUS_COLORS[invoice.status]} size="small" />
                    </Stack>
                    <Typography variant="body2">{invoice.customerName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(invoice.invoiceDate).format("DD MMM YYYY")} - {invoice.grandTotal}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {!isMobile && visibleInvoices.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Grand Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                    >
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{dayjs(invoice.invoiceDate).format("DD MMM YYYY")}</TableCell>
                      <TableCell align="right">{invoice.grandTotal}</TableCell>
                      <TableCell>
                        <Chip label={invoice.status} color={STATUS_COLORS[invoice.status]} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {data.totalPages > 1 && (
            <Stack direction="row" sx={{ justifyContent: "center", mt: 2 }}>
              <Pagination
                count={data.totalPages}
                page={page + 1}
                onChange={(_, next) => setPage(next - 1)}
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
