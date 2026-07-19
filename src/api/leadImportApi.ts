import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { LeadStatus } from "./leadsApi";

export interface LeadImportPreviewResponse {
  headers: string[];
  previewRows: string[][];
  suggestedMapping: Record<string, number>;
  totalDataRowCount: number;
}

export interface LeadImportCommitRequest {
  columnMapping: Record<string, number>;
  defaultOwnerId: string;
  defaultStatus: LeadStatus;
}

export interface LeadImportSkippedDuplicate {
  rowNumber: number;
  companyName: string;
  existingLeadId: string;
}

export interface LeadImportRowError {
  rowNumber: number;
  message: string;
}

export interface LeadImportResultResponse {
  totalRows: number;
  importedCount: number;
  skippedDuplicateCount: number;
  errorCount: number;
  skippedDuplicates: LeadImportSkippedDuplicate[];
  errors: LeadImportRowError[];
}

export interface ImportableField {
  key: string;
  label: string;
  required: boolean;
}

/** The 16 lead fields the import wizard can map file columns onto, in mapping-UI order. */
export const IMPORTABLE_FIELDS: ImportableField[] = [
  { key: "companyName", label: "Company Name", required: true },
  { key: "contactPerson", label: "Contact Person", required: true },
  { key: "contactNo", label: "Contact No", required: true },
  { key: "email", label: "Email", required: false },
  { key: "industry", label: "Industry", required: false },
  { key: "businessType", label: "Business Type", required: false },
  { key: "leadSource", label: "Lead Source", required: false },
  { key: "designation", label: "Designation", required: false },
  { key: "state", label: "State", required: false },
  { key: "city", label: "City", required: false },
  { key: "turnover", label: "Turnover", required: false },
  { key: "requirements", label: "Requirements", required: false },
  { key: "currentProductSolution", label: "Current Product/Solution", required: false },
  { key: "budgetRange", label: "Budget Range", required: false },
  { key: "remarks", label: "Remarks", required: false },
  { key: "status", label: "Status", required: false },
];

export async function previewLeadImport(
  file: File,
): Promise<LeadImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post<LeadImportPreviewResponse>(
    "/leads/import/preview",
    formData,
  );
  return response.data;
}

/**
 * The `request` part must be sent as a Blob with an explicit application/json
 * type - Spring's @RequestPart deserializes based on the part's own content-type,
 * and a plain string part defaults to text/plain and gets rejected.
 */
export async function commitLeadImport(
  file: File,
  request: LeadImportCommitRequest,
): Promise<LeadImportResultResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" }),
  );
  const response = await axiosInstance.post<LeadImportResultResponse>(
    "/leads/import/commit",
    formData,
  );
  return response.data;
}

export function useCommitLeadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, request }: { file: File; request: LeadImportCommitRequest }) =>
      commitLeadImport(file, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });
}
