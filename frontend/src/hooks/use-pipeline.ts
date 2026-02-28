"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    connectPipelineWithReconnect,
    type PipelineEntry,
    type PipelineStats,
} from "@/lib/api";

interface PipelineState {
    /** Latest pipeline tick */
    current: PipelineEntry | null;
    /** Rolling history of entries (most recent last) */
    history: PipelineEntry[];
    /** Running stats from the backend */
    stats: PipelineStats | null;
    /** Whether the WebSocket is connected */
    connected: boolean;
}

/**
 * Hook that connects to the backend pipeline WebSocket.
 * Auto-reconnects on disconnect. Returns live data + history.
 *
 * @param maxHistory Maximum number of entries to keep in the history buffer (default 50)
 */
export function usePipeline(maxHistory = 50): PipelineState {
    const [current, setCurrent] = useState<PipelineEntry | null>(null);
    const [history, setHistory] = useState<PipelineEntry[]>([]);
    const [stats, setStats] = useState<PipelineStats | null>(null);
    const [connected, setConnected] = useState(false);
    const historyRef = useRef<PipelineEntry[]>([]);

    const handleMessage = useCallback(
        (data: PipelineEntry | { type: string; data: PipelineEntry[]; stats: PipelineStats }) => {
            if (data.type === "history") {
                // Initial history dump from server
                const msg = data as { type: string; data: PipelineEntry[]; stats: PipelineStats };
                historyRef.current = msg.data.slice(-maxHistory);
                setHistory([...historyRef.current]);
                setStats(msg.stats);
                if (msg.data.length > 0) {
                    setCurrent(msg.data[msg.data.length - 1]);
                }
            } else if (data.type === "pipeline_tick") {
                const entry = data as PipelineEntry;
                setCurrent(entry);
                setStats(entry.stats);
                historyRef.current = [...historyRef.current.slice(-(maxHistory - 1)), entry];
                setHistory([...historyRef.current]);
            } else if (data.type === "stats") {
                const msg = data as { type: string; stats: PipelineStats };
                setStats(msg.stats);
            }
        },
        [maxHistory],
    );

    useEffect(() => {
        const cleanup = connectPipelineWithReconnect(handleMessage, setConnected);
        return cleanup;
    }, [handleMessage]);

    return { current, history, stats, connected };
}
