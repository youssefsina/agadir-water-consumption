/**
 * 🗄️ Supabase Client — Read-only frontend access
 * ================================================
 * Uses the public anon key to SELECT data directly from Supabase,
 * bypassing the backend for read operations.
 * The anon key + Row Level Security keeps it safe.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn(
        "⚠️ Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
        "Direct DB reads will fail — falling back to backend API."
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Database types matching supabase_setup.sql ───────────

export interface SensorReading {
    id: number;
    timestamp: string;
    flow_lpm: number;
    pressure_bar: number;
    soil_moisture_pct: number;
    temperature_c: number;
    rain_probability: number;
    hour_of_day: number;
    is_irrigating: number;
    flow_rolling_mean: number | null;
    flow_rolling_std: number | null;
    pressure_rolling_mean: number | null;
    pressure_drop: number | null;
    flow_deviation: number | null;
    soil_delta: number | null;
    evap_index: number | null;
    anomaly_label: number;
    anomaly_type: string;
    anomaly_confidence: number;
    device_id: string | null;
}

export interface WebhookEventRow {
    id: string;
    event_type: string;
    device_id: string;
    received_at: string;
    payload: Record<string, unknown>;
}

// ── Read-only query helpers ──────────────────────────────

/** Fetch the N most recent sensor readings */
export async function getRecentReadings(limit = 100) {
    const { data, error } = await supabase
        .from("sensor_readings")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data as SensorReading[]).reverse(); // chronological order
}

/** Fetch sensor readings in a time range */
export async function getReadingsInRange(start: string, end: string, limit = 500) {
    const { data, error } = await supabase
        .from("sensor_readings")
        .select("*")
        .gte("timestamp", start)
        .lte("timestamp", end)
        .order("timestamp", { ascending: true })
        .limit(limit);

    if (error) throw error;
    return data as SensorReading[];
}

/** Get anomaly distribution counts */
export async function getAnomalyDistribution() {
    const { data, error } = await supabase
        .from("sensor_readings")
        .select("anomaly_type");

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data as { anomaly_type: string }[]).forEach((row) => {
        counts[row.anomaly_type] = (counts[row.anomaly_type] || 0) + 1;
    });
    return counts;
}

/** Get basic stats */
export async function getReadingStats() {
    // count total rows
    const { count, error: countErr } = await supabase
        .from("sensor_readings")
        .select("*", { count: "exact", head: true });

    if (countErr) throw countErr;

    // anomaly count
    const { count: anomalyCount, error: anomErr } = await supabase
        .from("sensor_readings")
        .select("*", { count: "exact", head: true })
        .neq("anomaly_type", "Normal");

    if (anomErr) throw anomErr;

    return {
        total_rows: count ?? 0,
        anomaly_count: anomalyCount ?? 0,
        anomaly_rate: count ? ((anomalyCount ?? 0) / count) * 100 : 0,
    };
}

/** Get latest single reading */
export async function getLatestReading() {
    const { data, error } = await supabase
        .from("sensor_readings")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

    if (error) throw error;
    return data as SensorReading;
}

/** Get webhook events */
export async function getRecentWebhookEvents(limit = 20) {
    const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as WebhookEventRow[];
}
