import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import type { Lead } from "../../api/leadsApi";
import { useLeads } from "../../api/leadsApi";

interface AddVisitEntryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Chose to log a visit for a brand-new lead - the caller opens LeadCreateDialog next
   * (unchanged flow: fill in the lead, optionally log today's visit as part of the same form). */
  onSelectNewLead: () => void;
  /** Picked an existing lead from search - the caller opens VisitFormDialog directly for it,
   * skipping lead creation entirely since the lead already exists. */
  onSelectExistingLead: (lead: Lead) => void;
}

/**
 * Entry point for the Leads page's "Add Visit" action (replaces the old bare "Add Lead"
 * button - see LeadListPage). Most of the time a rep opening this is either about to log a
 * visit for someone already in the CRM, or is meeting/calling a brand-new prospect - this
 * dialog asks which one up front instead of assuming "new lead" every time.
 */
export function AddVisitEntryDialog({
  open,
  onClose,
  onSelectNewLead,
  onSelectExistingLead,
}: AddVisitEntryDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [step, setStep] = useState<"choose" | "search">("choose");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setSearchTerm("");
    setDebouncedTerm("");
  }, [open]);

  // Debounced so every keystroke doesn't fire a request - 300ms is enough for a
  // name/phone/email search box without feeling laggy.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const searchEnabled = step === "search" && debouncedTerm.length >= 2;
  const { data, isFetching } = useLeads(
    { search: debouncedTerm, size: 10 },
    { enabled: searchEnabled },
  );
  const results = searchEnabled ? (data?.content ?? []) : [];

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <DialogTitle>
        {step === "search" ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton size="small" edge="start" onClick={() => setStep("choose")}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <span>Find existing lead</span>
          </Stack>
        ) : (
          "Add Visit"
        )}
      </DialogTitle>
      <DialogContent>
        {step === "choose" && (
          <Stack spacing={2} sx={{ pt: 1, pb: 2 }}>
            <Typography color="text.secondary" variant="body2">
              Is this visit for a lead already in the CRM, or someone new?
            </Typography>
            <Button
              variant="outlined"
              size="large"
              startIcon={<PersonSearchIcon />}
              onClick={() => setStep("search")}
              sx={{ justifyContent: "flex-start", py: 1.5 }}
            >
              Existing lead
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<PersonAddIcon />}
              onClick={onSelectNewLead}
              sx={{ justifyContent: "flex-start", py: 1.5 }}
            >
              New lead
            </Button>
          </Stack>
        )}

        {step === "search" && (
          <Stack spacing={1.5} sx={{ pt: 1, pb: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Search by name, company, phone, or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
              <Typography variant="caption" color="text.secondary">
                Keep typing - at least 2 characters.
              </Typography>
            )}
            {searchEnabled && isFetching && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            )}
            {searchEnabled && !isFetching && results.length === 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: "center" }}>
                No matching lead found.
              </Typography>
            )}
            {results.length > 0 && (
              <List disablePadding>
                {results.map((lead) => (
                  <ListItemButton
                    key={lead.id}
                    onClick={() => onSelectExistingLead(lead)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={lead.companyName}
                      secondary={`${lead.contactPerson} · ${lead.contactNo}${lead.email ? ` · ${lead.email}` : ""}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
