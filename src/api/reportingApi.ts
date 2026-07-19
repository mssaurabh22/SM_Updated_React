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
