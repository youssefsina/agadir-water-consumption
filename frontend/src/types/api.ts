/**
 * API response types — aligned with backend (FastAPI) schemas.
 * Used for type-safe data transfer between backend and frontend.
 */

// ── Pipeline ─────────────────────────────────────────────
export interface PipelineStats {
  total_readings?: number;
  anomaly_count?: number;
  last_tick_at?: string;
  [key: string]: unknown;
}

export interface PipelineStatusResponse {
  running: boolean;
  interval_seconds: number;
  connected_clients: number;
  stats: PipelineStats;
}

export interface SensorReadingBackend {
  flow_lpm: number;
  pressure_bar: number;
  soil_moisture_pct: number;
  temperature_c: number;
  rain_probability?: number;
  hour_of_day?: number;
  is_irrigating?: number;
  [key: string]: unknown;
}

export interface PredictionBackend {
  is_anomaly: boolean;
  confidence: number;
  anomaly_type?: string;
  anomaly_id?: number;
  [key: string]: unknown;
}

export interface PipelineHistoryEntry {
  timestamp: string;
  sensor_data: SensorReadingBackend;
  prediction: PredictionBackend;
  ground_truth?: number | string;
  stats?: PipelineStats;
  whatsapp_sent?: boolean;
}

export interface PipelineHistoryResponse {
  data: PipelineHistoryEntry[];
  stats: PipelineStats;
}

/** Combined dashboard bootstrap: status + history in one response. */
export interface DashboardInitResponse {
  status: PipelineStatusResponse;
  history: PipelineHistoryResponse;
}

// WebSocket: pipeline_tick message
export interface PipelineTickMessage {
  type: "pipeline_tick";
  timestamp: string;
  sensor_data: SensorReadingBackend;
  prediction: PredictionBackend;
  ground_truth?: number | string;
  stats?: PipelineStats;
  whatsapp_sent?: boolean;
}

// ── Data ────────────────────────────────────────────────
export interface DataQueryParams {
  dataset?: "raw" | "normalized" | "train" | "test";
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  anomaly_type?: string;
}

export interface DataQueryResponse {
  total: number;
  limit: number;
  offset: number;
  data: Record<string, unknown>[];
}

export interface DataStatsResponse {
  total_rows?: number;
  anomaly_distribution?: Record<string, number>;
  feature_ranges?: Record<string, { min: number; max: number }>;
  [key: string]: unknown;
}

export interface DataBatchResponse {
  start_index: number;
  batch_size: number;
  data: Record<string, unknown>[];
}

// ── AI ───────────────────────────────────────────────────
export interface AiModelInfo {
  name: string;
  type?: string;
  [key: string]: unknown;
}

export interface AiModelsResponse {
  models: AiModelInfo[];
}

// ── Health ───────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
  data_rows_loaded: number;
  active_ws_connections: number;
  models_loaded: string[];
  pipeline_running?: boolean;
  pipeline_stats?: PipelineStats;
}
