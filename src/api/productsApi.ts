import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export interface Product {
  id: string;
  organizationId: string;
  sku: string | null;
  name: string;
  description: string | null;
  unitPrice: number;
  taxRatePercent: number;
  unitOfMeasure: string | null;
  hsnSacCode: string | null;
  stockQuantity: number;
  lowStockThreshold: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductsParams {
  includeInactive?: boolean;
  page?: number;
  size?: number;
}

export interface CreateProductPayload {
  sku?: string;
  name: string;
  description?: string;
  unitPrice: number;
  taxRatePercent?: number;
  unitOfMeasure?: string;
  hsnSacCode?: string;
  stockQuantity: number;
  lowStockThreshold?: number;
}

/** No stockQuantity field - stock only ever changes via a stock adjustment (see
 * StockAdjustmentPayload), never a plain product-details edit. */
export interface UpdateProductPayload {
  sku?: string;
  name: string;
  description?: string;
  unitPrice: number;
  taxRatePercent?: number;
  unitOfMeasure?: string;
  hsnSacCode?: string;
  lowStockThreshold?: number;
  active: boolean;
}

/** quantityChange is signed: positive = stock in, negative = stock out. */
export interface StockAdjustmentPayload {
  quantityChange: number;
  note?: string;
}

export async function getProducts(
  params: GetProductsParams = {},
): Promise<PagedResponse<Product>> {
  const response = await axiosInstance.get<PagedResponse<Product>>(
    "/inventory/products",
    { params },
  );
  return response.data;
}

export async function getProduct(id: string): Promise<Product> {
  const response = await axiosInstance.get<Product>(`/inventory/products/${id}`);
  return response.data;
}

/** Exact, case-insensitive SKU match - the lookup a barcode scan (or a manually typed SKU +
 * Enter) resolves against. Throws (404) if no active product has that SKU - callers should
 * catch and show an inline "not found" message rather than treating this like a normal list
 * fetch. */
export async function getProductBySku(sku: string): Promise<Product> {
  const response = await axiosInstance.get<Product>(
    `/inventory/products/by-sku/${encodeURIComponent(sku)}`,
  );
  return response.data;
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const response = await axiosInstance.post<Product>("/inventory/products", payload);
  return response.data;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const response = await axiosInstance.put<Product>(`/inventory/products/${id}`, payload);
  return response.data;
}

export async function adjustProductStock(
  id: string,
  payload: StockAdjustmentPayload,
): Promise<Product> {
  const response = await axiosInstance.post<Product>(
    `/inventory/products/${id}/stock-adjustments`,
    payload,
  );
  return response.data;
}

export function useProducts(params: GetProductsParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getProducts(params),
  });
}

export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => getProduct(id as string),
    enabled: !!id,
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["products"] });
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useAdjustProductStock() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StockAdjustmentPayload }) =>
      adjustProductStock(id, payload),
    onSuccess: () => invalidate(),
  });
}
