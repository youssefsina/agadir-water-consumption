/**
 * Central API client for backend (FastAPI) communication.
 * Uses NEXT_PUBLIC_API_URL for dynamic base URL (dev / staging / prod).
 */

import type {
  PipelineStatusResponse,
  PipelineHistoryResponse,
  DashboardInitResponse,
  DataQueryResponse,
  DataStatsResponse,
  DataBatchResponse,
  AiModelsResponse,
  HealthResponse,
} from "@/types/api";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
};

/** WebSocket URL for pipeline live feed (derived from HTTP base). */
export const getWsUrl = (path: string = "/pipeline/ws"): string => {
  const base = getBaseUrl();
  const wsProtocol = base.startsWith("https") ? "wss" : "ws";
  const host = base.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}${path}`;
};

const apiUrl = (path: string): string => `${getBaseUrl()}${path}`;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Pipeline ─────────────────────────────────────────────
export const pipelineApi = {
  getStatus: () =>
    request<PipelineStatusResponse>("/pipeline/status"),

  getHistory: (count: number = 50) =>
    request<PipelineHistoryResponse>(`/pipeline/history?count=${count}`),

  forceTick: () =>
    request<unknown>("/pipeline/force-tick", { method: "POST" }),

  start: () =>
    request<{ status: string; interval: number }>("/pipeline/start", {
      method: "POST",
    }),

  stop: () =>
    request<{ status: string }>("/pipeline/stop", { method: "POST" }),

  setAnomaly: (anomalyType: number) =>
    request<{ status: string; anomaly_type: number }>(
      `/pipeline/set-anomaly?anomaly_type=${anomalyType}`,
      { method: "POST" }
    ),
};

// ── Data ─────────────────────────────────────────────────
export const dataApi = {
  query: (params: {
    dataset?: string;
    start?: string;
    end?: string;
    limit?: number;
    offset?: number;
    anomaly_type?: string;
  } = {}) => {
    const sp = new URLSearchParams();
    if (params.dataset) sp.set("dataset", params.dataset);
    if (params.start) sp.set("start", params.start);
    if (params.end) sp.set("end", params.end);
    if (params.limit != null) sp.set("limit", String(params.limit));
    if (params.offset != null) sp.set("offset", String(params.offset));
    if (params.anomaly_type) sp.set("anomaly_type", params.anomaly_type);
    return request<DataQueryResponse>(`/data/query?${sp.toString()}`);
  },

  getStats: (dataset: string = "raw") =>
    request<DataStatsResponse>(`/data/stats?dataset=${dataset}`),

  getBatch: (start: number = 0, size: number = 50, dataset: string = "raw") =>
    request<DataBatchResponse>(
      `/data/batch?start=${start}&size=${size}&dataset=${dataset}`
    ),

  getAnomalyTypes: () =>
    request<Record<string, number>>("/data/anomaly-types"),

  getFeatures: () =>
    request<{ features: string[]; ranges: Record<string, unknown> }>(
      "/data/features"
    ),
};

// ── AI ────────────────────────────────────────────────────
export const aiApi = {
  listModels: () => request<AiModelsResponse>("/ai/models"),
};

// ── Health ────────────────────────────────────────────────
export const healthApi = {
  check: () => request<HealthResponse>("/health"),
};

// ── Dashboard (combined bootstrap) ───────────────────────
export const dashboardApi = {
  init: (count: number = 50) =>
    request<DashboardInitResponse>(`/dashboard/init?count=${count}`),
};

/** Single entry point for all REST APIs. */
export const api = {
  pipeline: pipelineApi,
  dashboard: dashboardApi,
  data: dataApi,
  ai: aiApi,
  health: healthApi,
  getBaseUrl,
  getWsUrl,
};

export default api;
