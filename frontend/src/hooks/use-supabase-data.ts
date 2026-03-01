/**
 * 🔄 useSupabaseData — Read-only Supabase polling hook
 * =====================================================
 * Fetches sensor_readings directly from Supabase every 30 seconds,
 * so the dashboard works even when the backend is offline.
 *
 * Returns the same shape the pages already consume, making migration easy.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    getRecentReadings,
    getReadingStats,
    getAnomalyDistribution,
    getLatestReading,
    type SensorReading,
} from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────

export interface SupabaseDataState {
    /** Most recent readings (chronological, newest last) */
    readings: SensorReading[];
    /** Latest single reading */
    latest: SensorReading | null;
    /** High-level stats */
    stats: {
        total_rows: number;
        anomaly_count: number;
        anomaly_rate: number;
    } | null;
    /** Anomaly type → count map */
    anomalyDistribution: Record<string, number>;
    /** Whether the initial fetch has completed */
    loading: boolean;
    /** Last error, if any */
    error: string | null;
    /** Timestamp of last successful fetch */
    lastFetchedAt: Date | null;
    /** Manual refresh trigger */
    refresh: () => void;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * @param limit  Number of recent readings to fetch (default 100)
 * @param pollMs Polling interval in ms (default 30 000)
 */
export function useSupabaseData(
    limit = 100,
    pollMs = POLL_INTERVAL_MS,
): SupabaseDataState {
    const [readings, setReadings] = useState<SensorReading[]>([]);
    const [latest, setLatest] = useState<SensorReading | null>(null);
    const [stats, setStats] = useState<SupabaseDataState["stats"]>(null);
    const [anomalyDistribution, setAnomalyDistribution] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

    // Prevent stale closures in the interval
    const mountedRef = useRef(true);

    const fetchAll = useCallback(async () => {
        try {
            // Fire all queries in parallel for speed
            const [readingsRes, statsRes, distRes, latestRes] = await Promise.all([
                getRecentReadings(limit),
                getReadingStats(),
                getAnomalyDistribution(),
                getLatestReading().catch(() => null),
            ]);

            if (!mountedRef.current) return;

            setReadings(readingsRes);
            setStats(statsRes);
            setAnomalyDistribution(distRes);
            setLatest(latestRes);
            setError(null);
            setLastFetchedAt(new Date());
        } catch (err) {
            if (!mountedRef.current) return;
            console.error("Supabase fetch error:", err);
            setError(err instanceof Error ? err.message : "Supabase fetch failed");
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [limit]);

    // Initial fetch + polling (pauses when tab is hidden)
    useEffect(() => {
        mountedRef.current = true;
        fetchAll();

        let timer: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (timer) clearInterval(timer);
            timer = setInterval(fetchAll, pollMs);
        };

        const stopPolling = () => {
            if (timer) { clearInterval(timer); timer = null; }
        };

        const handleVisibility = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                fetchAll(); // immediate refresh on tab focus
                startPolling();
            }
        };

        startPolling();
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            mountedRef.current = false;
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [fetchAll, pollMs]);

    return {
        readings,
        latest,
        stats,
        anomalyDistribution,
        loading,
        error,
        lastFetchedAt,
        refresh: fetchAll,
    };
}
