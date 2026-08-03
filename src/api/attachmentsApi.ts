import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export interface LeadAttachment {
  id: string;
  leadId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export async function getLeadAttachments(leadId: string): Promise<LeadAttachment[]> {
  const response = await axiosInstance.get<LeadAttachment[]>(`/leads/${leadId}/attachments`);
  return response.data;
}

export async function uploadLeadAttachment(leadId: string, file: File): Promise<LeadAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post<LeadAttachment>(
    `/leads/${leadId}/attachments`,
    formData,
  );
  return response.data;
}

export async function deleteLeadAttachment(attachmentId: string): Promise<void> {
  await axiosInstance.delete(`/attachments/${attachmentId}`);
}

/** Downloads and triggers a save-as for an attachment - same blob-URL technique
 * invoicesApi.ts's downloadInvoicePdf already uses for PDF downloads. */
export async function downloadLeadAttachment(attachment: LeadAttachment): Promise<void> {
  const response = await axiosInstance.get(`/attachments/${attachment.id}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useLeadAttachments(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ["leadAttachments", leadId],
    queryFn: () => getLeadAttachments(leadId as string),
    enabled: !!leadId,
  });
}

export function useUploadLeadAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadLeadAttachment(leadId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leadAttachments", leadId] }),
  });
}

export function useDeleteLeadAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteLeadAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leadAttachments", leadId] }),
  });
}
