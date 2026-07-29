import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export type InvoiceStatus = "UNPAID" | "PAID";

export interface InvoiceLineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRatePercent: number;
  lineSubtotal: number;
  lineTaxAmount: number;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  leadId: string | null;
  ownerId: string;
  createdBy: string;
  customerName: string;
  customerContactPerson: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  customerGstin: string | null;
  invoiceDate: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: InvoiceStatus;
  notes: string | null;
  lineItems: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GetInvoicesParams {
  status?: InvoiceStatus;
  ownerId?: string;
  page?: number;
  size?: number;
}

/** Exactly one of productId or description+unitPrice must be set - see backend
 * InvoiceService's line-item validation. */
export interface InvoiceLineItemPayload {
  productId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  taxRatePercent?: number;
}

export interface CreateInvoicePayload {
  leadId?: string;
  customerName: string;
  customerContactPerson?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  invoiceDate: string;
  lineItems: InvoiceLineItemPayload[];
  notes?: string;
}

export async function getInvoices(
  params: GetInvoicesParams = {},
): Promise<PagedResponse<Invoice>> {
  const response = await axiosInstance.get<PagedResponse<Invoice>>("/invoices", {
    params,
  });
  return response.data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const response = await axiosInstance.get<Invoice>(`/invoices/${id}`);
  return response.data;
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const response = await axiosInstance.post<Invoice>("/invoices", payload);
  return response.data;
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<Invoice> {
  const response = await axiosInstance.patch<Invoice>(`/invoices/${id}/status`, { status });
  return response.data;
}

/** Downloads and triggers a save-as for the invoice PDF - same blob-URL technique
 * utils/exportToCsv.ts already uses for CSV downloads. */
export async function downloadInvoicePdf(id: string, invoiceNumber: string): Promise<void> {
  const response = await axiosInstance.get(`/invoices/${id}/pdf`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useInvoices(params: GetInvoicesParams = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => getInvoices(params),
  });
}

export function useInvoice(id: string | null | undefined) {
  return useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => getInvoice(id as string),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // A catalog line deducts stock - the Products list should reflect it immediately.
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
