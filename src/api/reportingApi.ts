import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { LeadStatus } from "./leadsApi";

export interface OwnerBreakdown {
  ownerId: string;
  ownerName: string;
  leadCount: number;
  closedWonCount: number;
}

export interface PipelineSummary {
  byStatus: Record<LeadStatus, number>;
  totalLeads: number;
  byOwner: OwnerBreakdown[];
}

export interface ConversionRate {
  totalLeads: number;
  closedWonCount: number;
  lostCount: number;
  conversionRatePercent: number;
}

export interface VisitsCompletedVsMissed {
  completed: number;
  missed: number;
  planned: number;
  completionRatePercent: number;
}

export interface GetVisitsCompletedVsMissedParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface LeadSourceBreakdown {
  label: string;
  count: number;
}

export interface LeadsBySource {
  bySource: LeadSourceBreakdown[];
}

/** entitled is false (revenue always 0) when the org hasn't licensed INVENTORY_MANAGEMENT -
 * the Dashboard hides the Revenue card entirely in that case rather than showing a
 * misleading "0". */
export interface Revenue {
  entitled: boolean;
  revenue: number;
}

export interface GetRevenueParams {
  dateFrom?: string;
  dateTo?: string;
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  const response = await axiosInstance.get<PipelineSummary>(
    "/reports/pipeline-summary",
  );
  return response.data;
}

export async function getConversionRate(): Promise<ConversionRate> {
  const response = await axiosInstance.get<ConversionRate>(
    "/reports/conversion-rate",
  );
  return response.data;
}

export async function getVisitsCompletedVsMissed(
  params: GetVisitsCompletedVsMissedParams = {},
): Promise<VisitsCompletedVsMissed> {
  const response = await axiosInstance.get<VisitsCompletedVsMissed>(
    "/reports/visits-completed-vs-missed",
    { params },
  );
  return response.data;
}

export function usePipelineSummary() {
  return useQuery({
    queryKey: ["reports", "pipeline-summary"],
    queryFn: () => getPipelineSummary(),
  });
}

export function useConversionRate() {
  return useQuery({
    queryKey: ["reports", "conversion-rate"],
    queryFn: () => getConversionRate(),
  });
}

export function useVisitsCompletedVsMissed(
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: ["reports", "visits-completed-vs-missed", dateFrom, dateTo],
    queryFn: () => getVisitsCompletedVsMissed({ dateFrom, dateTo }),
  });
}

export async function getLeadsBySource(): Promise<LeadsBySource> {
  const response = await axiosInstance.get<LeadsBySource>("/reports/leads-by-source");
  return response.data;
}

export async function getRevenue(params: GetRevenueParams = {}): Promise<Revenue> {
  const response = await axiosInstance.get<Revenue>("/reports/revenue", { params });
  return response.data;
}

export function useLeadsBySource(enabled = true) {
  return useQuery({
    queryKey: ["reports", "leads-by-source"],
    queryFn: () => getLeadsBySource(),
    enabled,
  });
}

export function useRevenue(enabled = true) {
  return useQuery({
    queryKey: ["reports", "revenue"],
    queryFn: () => getRevenue(),
    enabled,
  });
}

export type VisitType = "FIELD" | "TELEPHONIC";

export interface VisitsByType {
  byType: Record<VisitType, number>;
  total: number;
}

export interface GetVisitsByTypeParams {
  dateFrom?: string;
  dateTo?: string;
}

export async function getVisitsByType(params: GetVisitsByTypeParams = {}): Promise<VisitsByType> {
  const response = await axiosInstance.get<VisitsByType>("/reports/visits-by-type", { params });
  return response.data;
}

export function useVisitsByType(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["reports", "visits-by-type", dateFrom, dateTo],
    queryFn: () => getVisitsByType({ dateFrom, dateTo }),
  });
}

/** One row of the Interest Level x Status matrix - interestLevel is already resolved to a
 * display label ("Hot"/"Warm"/"Cold"/"Not Set") by the backend. */
export interface InterestLevelStatusRow {
  interestLevel: string;
  byStatus: Record<LeadStatus, number>;
  total: number;
}

export interface InterestLevelStatusMatrix {
  rows: InterestLevelStatusRow[];
}

export async function getInterestLevelStatusMatrix(): Promise<InterestLevelStatusMatrix> {
  const response = await axiosInstance.get<InterestLevelStatusMatrix>(
    "/reports/interest-level-status-matrix",
  );
  return response.data;
}

export function useInterestLevelStatusMatrix() {
  return useQuery({
    queryKey: ["reports", "interest-level-status-matrix"],
    queryFn: () => getInterestLevelStatusMatrix(),
  });
}
