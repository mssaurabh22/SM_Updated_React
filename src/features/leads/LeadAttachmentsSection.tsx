import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import type { LeadAttachment } from "../../api/attachmentsApi";
import {
  downloadLeadAttachment,
  useDeleteLeadAttachment,
  useLeadAttachments,
  useUploadLeadAttachment,
} from "../../api/attachmentsApi";
import { parseApiError } from "../../api/errorHelpers";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LeadAttachmentsSectionProps {
  leadId: string;
}

/**
 * Attachments (business card photo, brochure, PO copy, etc.) for a saved Lead - lives in the
 * Additional Details accordion. Deliberately only reachable from the Lead's own detail page,
 * not the create dialog: a brand-new lead has no id yet to attach a file to, and building
 * queued-upload-then-attach-after-create machinery for a rarely-used field isn't worth it.
 */
export function LeadAttachmentsSection({ leadId }: LeadAttachmentsSectionProps) {
  const { data: attachments, isLoading, isError, error } = useLeadAttachments(leadId);
  const uploadMutation = useUploadLeadAttachment(leadId);
  const deleteMutation = useDeleteLeadAttachment(leadId);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (err) {
      setUploadError(parseApiError(err).message);
    }
  };

  const handleDownload = async (attachment: LeadAttachment) => {
    setDownloadError(null);
    try {
      await downloadLeadAttachment(attachment);
    } catch (err) {
      setDownloadError(parseApiError(err).message);
    }
  };

  const handleDelete = async (attachment: LeadAttachment) => {
    setDeletingId(attachment.id);
    try {
      await deleteMutation.mutateAsync(attachment.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle2">Attachments</Typography>
        <Button
          size="small"
          component="label"
          startIcon={
            uploadMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />
          }
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
          <input type="file" hidden onChange={handleFileChange} />
        </Button>
      </Stack>

      {uploadError && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}
      {downloadError && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setDownloadError(null)}>
          {downloadError}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {attachments && attachments.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No attachments yet.
        </Typography>
      )}

      {attachments && attachments.length > 0 && (
        <List dense disablePadding>
          {attachments.map((attachment) => (
            <ListItem
              key={attachment.id}
              disableGutters
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => handleDownload(attachment)}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={deletingId === attachment.id}
                    onClick={() => handleDelete(attachment)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={attachment.fileName}
                secondary={`${formatFileSize(attachment.fileSize)} · ${dayjs(attachment.createdAt).format("DD MMM YYYY")}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
