/**
 * 🌊 API Service — Centralized backend communication layer
 * =========================================================
 * Connects to the FastAPI backend via NEXT_PUBLIC_API_URL
 * Provides typed fetch wrappers for all REST endpoints + WebSocket helpers.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://agadir-water-consumption-vejs.vercel.app";
const WS_BASE = API_BASE.replace(/^http/, "ws");

// ── Types ────────────────────────────────────────────────

export interface PipelineStats {
    total_readings: number;
    stored_readings: number;
    anomaly_count: number;
    anomaly_rate: number;
    last_anomaly: PipelineEntry | null;
    whatsapp_messages_sent: number;
}

export interface SensorData {
    flow_lpm: number;
    pressure_bar: number;
    soil_moisture_pct: number;
    temperature_c: number;
    rain_probability: number;
    hour_of_day: number;
    is_irrigating: number;
    flow_rolling_mean?: number;
    flow_rolling_std?: number;
    pressure_rolling_mean?: number;
    pressure_drop?: number;
    flow_deviation?: number;
    soil_delta?: number;
    evap_index?: number;
    anomaly_label?: number;
    anomaly_type?: string;
    tick?: number;
    timestamp?: string;
}

export interface Prediction {
    anomaly_id: number;
    anomaly_type: string;
    is_anomaly: boolean;
    confidence: number;
    probabilities: Record<string, number>;
}

export interface PipelineEntry {
    type: string;
    timestamp: string;
    tick: number;
    sensor_data: SensorData;
    prediction: Prediction;
    ground_truth: {
        anomaly_label: number;
        anomaly_type: string;
    };
    server_time: number;
    stats: PipelineStats;
    whatsapp_sent?: boolean;
}

export interface HealthStatus {
    status: string;
    version: string;
    uptime_seconds: number;
    data_rows_loaded: number;
    active_ws_connections: number;
    models_loaded: string[];
    pipeline_running: boolean | null;
    pipeline_stats: PipelineStats | null;
}

export interface DataQueryResult {
    total: number;
    limit: number;
    offset: number;
    data: Record<string, unknown>[];
}

export interface DataStats {
    total_rows: number;
    time_range: {
        start: string;
        end: string;
    };
    anomaly_distribution: Record<string, number>;
    feature_ranges: Record<string, {
        min: number;
        max: number;
        mean: number;
        std: number;
    }>;
}

export interface AIModel {
    name: string;
    type: string;
    is_loaded: boolean;
    [key: string]: unknown;
}

export interface PipelineStatus {
    running: boolean;
    interval_seconds: number;
    connected_clients: number;
    stats: PipelineStats;
}

export interface PipelineHistoryResponse {
    data: PipelineEntry[];
    stats: PipelineStats;
}

export interface WhatsAppLogEntry {
    timestamp: string;
    anomaly_type: string;
    result: Record<string, unknown>;
}

export interface WhatsAppContact {
    id: number;
    name: string;
    phone: string;
    active: boolean;
    created_at: string;
}

export interface WebhookEvent {
    event_id: string;
    device_id?: string;
    event_type?: string;
    timestamp?: string;
    received_at: string;
    data: Record<string, unknown>;
}

// ── Generic Fetch ────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
}

// ── Health ────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus> {
    return apiFetch<HealthStatus>("/health");
}

// ── Data Endpoints ───────────────────────────────────────

export async function queryData(params?: {
    dataset?: string;
    start?: string;
    end?: string;
    limit?: number;
    offset?: number;
    anomaly_type?: string;
}): Promise<DataQueryResult> {
    const sp = new URLSearchParams();
    if (params?.dataset) sp.set("dataset", params.dataset);
    if (params?.start) sp.set("start", params.start);
    if (params?.end) sp.set("end", params.end);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    if (params?.anomaly_type) sp.set("anomaly_type", params.anomaly_type);
    return apiFetch<DataQueryResult>(`/data/query?${sp.toString()}`);
}

export async function getDataStats(dataset = "raw"): Promise<DataStats> {
    return apiFetch<DataStats>(`/data/stats?dataset=${dataset}`);
}

export async function getAnomalyTypes(): Promise<Record<string, number>> {
    return apiFetch<Record<string, number>>("/data/anomaly-types");
}

export async function getFeatures(): Promise<{ features: string[]; ranges: Record<string, { min: number; max: number; mean: number; std: number }> }> {
    return apiFetch("/data/features");
}

// ── AI Endpoints ─────────────────────────────────────────

export async function listAIModels(): Promise<{ models: AIModel[] }> {
    return apiFetch<{ models: AIModel[] }>("/ai/models");
}

// ── Pipeline Endpoints ───────────────────────────────────

export async function getPipelineStatus(): Promise<PipelineStatus> {
    return apiFetch<PipelineStatus>("/pipeline/status");
}

export async function getPipelineHistory(count = 50): Promise<PipelineHistoryResponse> {
    return apiFetch<PipelineHistoryResponse>(`/pipeline/history?count=${count}`);
}

export async function forcePipelineTick(): Promise<PipelineEntry> {
    return apiFetch<PipelineEntry>("/pipeline/force-tick", { method: "POST" });
}

export async function startPipeline(): Promise<{ status: string; interval: number }> {
    return apiFetch("/pipeline/start", { method: "POST" });
}

export async function stopPipeline(): Promise<{ status: string }> {
    return apiFetch("/pipeline/stop", { method: "POST" });
}

export async function setAnomalyType(anomalyType: number): Promise<{ status: string; anomaly_type: number }> {
    return apiFetch(`/pipeline/set-anomaly?anomaly_type=${anomalyType}`, { method: "POST" });
}

export async function getWhatsAppLog(): Promise<{ total: number; log: WhatsAppLogEntry[] }> {
    return apiFetch("/pipeline/whatsapp-log");
}

// ── Webhook Endpoints ────────────────────────────────────

export async function getWebhookEvents(params?: {
    limit?: number;
    device_id?: string;
    event_type?: string;
}): Promise<{ total: number; events: WebhookEvent[] }> {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.device_id) sp.set("device_id", params.device_id);
    if (params?.event_type) sp.set("event_type", params.event_type);
    return apiFetch(`/webhook/events?${sp.toString()}`);
}

// ── Stream Status ────────────────────────────────────────

export async function getStreamStatus(): Promise<{ active_connections: number; status: string }> {
    return apiFetch("/stream/status");
}

// ── WhatsApp Contact Settings ────────────────────────────

export async function getWhatsAppContacts(): Promise<{ contacts: WhatsAppContact[] }> {
    return apiFetch("/settings/whatsapp/contacts");
}

export async function addWhatsAppContact(name: string, phone: string): Promise<{ status: string; contact: WhatsAppContact }> {
    return apiFetch("/settings/whatsapp/contacts", {
        method: "POST",
        body: JSON.stringify({ name, phone }),
    });
}

export async function updateWhatsAppContact(
    id: number,
    data: { name?: string; phone?: string; active?: boolean },
): Promise<{ status: string; contact: WhatsAppContact }> {
    return apiFetch(`/settings/whatsapp/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteWhatsAppContact(id: number): Promise<{ status: string; id: number }> {
    return apiFetch(`/settings/whatsapp/contacts/${id}`, { method: "DELETE" });
}

// ── WebSocket Helper ─────────────────────────────────────

export function createPipelineWebSocket(
    onMessage: (data: PipelineEntry | { type: string; data: PipelineEntry[]; stats: PipelineStats }) => void,
    onError?: (err: Event) => void,
    onClose?: () => void,
    onOpen?: () => void,
): WebSocket {
    const ws = new WebSocket(`${WS_BASE}/pipeline/ws`);

    ws.onopen = () => {
        console.log("🔌 Pipeline WebSocket connected");
        onOpen?.();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (err) {
            console.error("Failed to parse WS message", err);
        }
    };

    ws.onerror = (err) => {
        console.error("WebSocket error", err);
        onError?.(err);
    };

    ws.onclose = () => {
        console.log("🔌 Pipeline WebSocket disconnected");
        onClose?.();
    };

    return ws;
}

/**
 * Auto-reconnecting WebSocket wrapper for the pipeline.
 * Returns a cleanup function.
 */
export function connectPipelineWithReconnect(
    onMessage: (data: PipelineEntry | { type: string; data: PipelineEntry[]; stats: PipelineStats }) => void,
    onConnectionChange?: (connected: boolean) => void,
): () => void {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
        if (destroyed) return;

        ws = createPipelineWebSocket(
            onMessage,
            () => {
                onConnectionChange?.(false);
                scheduleReconnect();
            },
            () => {
                onConnectionChange?.(false);
                scheduleReconnect();
            },
            () => {
                onConnectionChange?.(true);
            },
        );
    }

    function scheduleReconnect() {
        if (destroyed) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
    }

    connect();

    return () => {
        destroyed = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (ws) {
            ws.onclose = null;
            ws.onerror = null;
            ws.close();
        }
    };
}
