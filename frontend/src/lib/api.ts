/**
 * Backend API client for AgriFlow Smart Irrigation.
 * Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000)
 */

const getBase = () =>
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "http://localhost:8000";

const getWsBase = () => {
  const base = getBase();
  return base.replace(/^http/, "ws");
};

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  const { params, ...rest } = options || {};
  const url = new URL(path, getBase());
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    ...rest,
    headers: { "Content-Type": "application/json", ...rest.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types (matches backend) ─────────────────────────────────────────────

export interface HealthStatus {
  status: string;
  version: string;
  uptime_seconds: number;
  data_rows_loaded: number;
  active_ws_connections: number;
  models_loaded: string[];
}

export interface DataQueryResponse {
  total: number;
  limit: number;
  offset: number;
  data: BackendSensorRow[];
}

export interface BackendSensorRow {
  timestamp: string;
  flow_lpm: number;
  pressure_bar: number;
  soil_moisture_pct: number;
  temperature_c: number;
  rain_probability?: number;
  hour_of_day?: number;
  is_irrigating?: number;
  anomaly_label?: number;
  anomaly_type?: string;
  [key: string]: unknown;
}

export interface DataStats {
  total_rows: number;
  time_range: { start: string; end: string };
  anomaly_distribution: Record<string, number>;
  feature_ranges: Record<string, { min: number; max: number; mean: number; std: number }>;
}

export interface DataBatchResponse {
  start_index: number;
  batch_size: number;
  data: BackendSensorRow[];
}

export interface AIModelInfo {
  name: string;
  type: string;
  parameters: number;
  device: string;
  trained: boolean;
}

export interface AIModelsResponse {
  models: AIModelInfo[];
}

export interface PredictFromDatasetResponse {
  prediction: {
    model?: string;
    mode?: string;
    anomaly_score?: number;
    is_anomaly?: boolean;
    confidence?: number;
    predicted_class?: number;
    predicted_label?: string;
    probabilities?: Record<string, number>;
    reconstruction_error?: number;
    [key: string]: unknown;
  };
  dataset_range: { dataset: string; start_index: number; end_index: number; seq_length: number };
  actual_labels: string[];
}

export interface WebhookEvent {
  event_id?: string;
  device_id?: string;
  event_type?: string;
  timestamp?: string;
  received_at?: string;
  data?: Record<string, unknown>;
}

export interface WebhookEventsResponse {
  total: number;
  events: WebhookEvent[];
}

export interface StreamStatusResponse {
  active_connections: number;
  status: "streaming" | "idle";
}

// ─── REST API ───────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus> {
  return fetchApi<HealthStatus>("/health");
}

export async function getDataQuery(params: {
  dataset?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  anomaly_type?: string;
}): Promise<DataQueryResponse> {
  return fetchApi<DataQueryResponse>("/data/query", { params: params as Record<string, string | number | undefined> });
}

export async function getDataStats(dataset?: string): Promise<DataStats> {
  return fetchApi<DataStats>("/data/stats", { params: { dataset: dataset || "raw" } });
}

export async function getDataBatch(params: {
  start?: number;
  size?: number;
  dataset?: string;
}): Promise<DataBatchResponse> {
  return fetchApi<DataBatchResponse>("/data/batch", { params: params as Record<string, string | number | undefined> });
}

export async function getAnomalyTypes(): Promise<Record<string, number>> {
  return fetchApi<Record<string, number>>("/data/anomaly-types");
}

export async function getAIModels(): Promise<AIModelsResponse> {
  return fetchApi<AIModelsResponse>("/ai/models");
}

export async function postPredictFromDataset(params: {
  model_name?: string;
  start_index?: number;
  seq_length?: number;
  dataset?: string;
}): Promise<PredictFromDatasetResponse> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return fetchApi<PredictFromDatasetResponse>(`/ai/predict/from-dataset?${search.toString()}`, {
    method: "POST",
  });
}

export async function getWebhookEvents(params?: {
  limit?: number;
  device_id?: string;
  event_type?: string;
}): Promise<WebhookEventsResponse> {
  return fetchApi<WebhookEventsResponse>("/webhook/events", {
    params: params as Record<string, string | number | undefined>,
  });
}

export async function getStreamStatus(): Promise<StreamStatusResponse> {
  return fetchApi<StreamStatusResponse>("/stream/status");
}

// ─── WebSocket URLs ──────────────────────────────────────────────────────

export function getWsSensorsUrl(params?: { speed?: number; batch?: number; start?: number }): string {
  const base = `${getWsBase()}/ws/sensors`;
  const search = new URLSearchParams();
  if (params?.speed != null) search.set("speed", String(params.speed));
  if (params?.batch != null) search.set("batch", String(params.batch));
  if (params?.start != null) search.set("start", String(params.start));
  const q = search.toString();
  return q ? `${base}?${q}` : base;
}

export function getWsAlertsUrl(params?: { speed?: number; start?: number }): string {
  const base = `${getWsBase()}/ws/alerts`;
  const search = new URLSearchParams();
  if (params?.speed != null) search.set("speed", String(params.speed));
  if (params?.start != null) search.set("start", String(params.start));
  const q = search.toString();
  return q ? `${base}?${q}` : base;
}

// ─── Helpers: map backend row to dashboard shape ──────────────────────────

export interface SensorDataForUI {
  time: string;
  flow: number;
  pressure: number;
  moisture: number;
  temperature: number;
  anomalyScore: number;
}

export function backendRowToSensorData(row: BackendSensorRow): SensorDataForUI {
  const ts = row.timestamp || "";
  const time = ts.slice(11, 19) || ts; // HH:MM:SS or keep as-is
  const anomalyScore =
    row.anomaly_type && row.anomaly_type !== "Normal" ? 70 + Math.random() * 25 : 5 + Math.random() * 20;
  return {
    time,
    flow: Number(row.flow_lpm) ?? 0,
    pressure: Number(row.pressure_bar) ?? 0,
    moisture: Number(row.soil_moisture_pct) ?? 0,
    temperature: Number(row.temperature_c) ?? 0,
    anomalyScore,
  };
}
