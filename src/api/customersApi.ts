import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cityId: string | null;
  stateId: string | null;
  industryId: string | null;
  gstin: string | null;
  notes: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetCustomersParams {
  search?: string;
  cityId?: string;
  stateId?: string;
  includeInactive?: boolean;
  page?: number;
  size?: number;
}

export interface CustomerPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  cityId?: string | null;
  stateId?: string | null;
  industryId?: string | null;
  gstin?: string;
  notes?: string;
}

export interface UpdateCustomerPayload extends CustomerPayload {
  active: boolean;
}

export async function getCustomers(
  params: GetCustomersParams = {},
): Promise<PagedResponse<Customer>> {
  const response = await axiosInstance.get<PagedResponse<Customer>>("/customers", { params });
  return response.data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const response = await axiosInstance.get<Customer>(`/customers/${id}`);
  return response.data;
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const response = await axiosInstance.post<Customer>("/customers", payload);
  return response.data;
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  const response = await axiosInstance.put<Customer>(`/customers/${id}`, payload);
  return response.data;
}

export function useCustomers(params: GetCustomersParams = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => getCustomers(params),
  });
}

export function useCustomer(id: string | null | undefined) {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => getCustomer(id as string),
    enabled: !!id,
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["customers"] });
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (payload: CustomerPayload) => createCustomer(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      updateCustomer(id, payload),
    onSuccess: () => invalidate(),
  });
}
