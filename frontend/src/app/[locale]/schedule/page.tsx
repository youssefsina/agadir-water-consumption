"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, CloudRain, Sun, Cloud, ThermometerSun, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getPipelineHistory, type PipelineEntry } from "@/lib/api";
import { useSupabaseData } from "@/hooks/use-supabase-data";

interface ScheduleEvent {
    time: string;
    zone: string;
    status: "completed" | "skipped" | "scheduled" | "pending_ai";
    action: string;
    reason?: string;
}

interface DaySchedule {
    day: string;
    date: string;
    weather: {
        type: string;
        temp: string;
        rainChance: string;
        icon: typeof Sun;
        color: string;
    };
    events: ScheduleEvent[];
}

export default function SchedulePage() {
    const t = useTranslations('schedule');
    // ── Supabase direct reads (30s poll) ──────────────────
    const { readings: dbReadings, loading: dbLoading } = useSupabaseData(100);

    const [backendData, setBackendData] = useState<PipelineEntry[]>([]);
    const [backendLoading, setBackendLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setBackendLoading(true);
                const res = await getPipelineHistory(100).catch(() => ({ data: [] }));
                setBackendData(res.data);
            } catch (err) {
                console.error("Schedule fetch error", err);
            } finally {
                setBackendLoading(false);
            }
        };
        fetchData();
        const timer = setInterval(fetchData, 60000);
        return () => clearInterval(timer);
    }, []);

    // Merge: prefer backend pipeline data, fall back to DB readings
    const pipelineData: PipelineEntry[] = backendData.length > 0
        ? backendData
        : dbReadings.map((r) => ({
            type: "db",
            timestamp: r.timestamp,
            tick: r.id,
            sensor_data: {
                flow_lpm: r.flow_lpm,
                pressure_bar: r.pressure_bar,
                soil_moisture_pct: r.soil_moisture_pct,
                temperature_c: r.temperature_c,
                rain_probability: r.rain_probability,
                hour_of_day: r.hour_of_day,
                is_irrigating: r.is_irrigating,
            },
            prediction: {
                anomaly_id: r.anomaly_label,
                anomaly_type: r.anomaly_type,
                is_anomaly: r.anomaly_label !== 0,
                confidence: r.anomaly_confidence,
                probabilities: {},
            },
            ground_truth: { anomaly_label: r.anomaly_label, anomaly_type: r.anomaly_type },
            server_time: 0,
            stats: { total_readings: 0, stored_readings: 0, anomaly_count: 0, anomaly_rate: 0, last_anomaly: null, whatsapp_messages_sent: 0 },
        }));

    const loading = dbLoading && backendLoading;


    const anomalies = pipelineData.filter(e => e.prediction.is_anomaly);
    const skippedByRain = pipelineData.filter(e => e.sensor_data.rain_probability > 0.6 && !e.sensor_data.is_irrigating);
    const estimatedLitersSaved = skippedByRain.length * 30 * 120;

    const groupByDate = (entries: PipelineEntry[]): Record<string, PipelineEntry[]> => {
        const groups: Record<string, PipelineEntry[]> = {};
        entries.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
            if (!groups[date]) groups[date] = [];
            groups[date].push(entry);
        });
        return groups;
    };

    const dateGroups = groupByDate(pipelineData);
    const sortedDates = Object.keys(dateGroups).slice(-4);

    const buildDaySchedule = (dateStr: string, entries: PipelineEntry[]): DaySchedule => {
        const parts = dateStr.split(", ");
        const dayName = parts[0] || dateStr;
        const datePart = parts[1] || "";

        const avgRainProb = entries.reduce((sum, e) => sum + e.sensor_data.rain_probability, 0) / entries.length;
        const avgTemp = entries.reduce((sum, e) => sum + e.sensor_data.temperature_c, 0) / entries.length;

        let weatherType = "Sunny";
        let weatherIcon = Sun;
        let color = "text-amber-500";
        if (avgRainProb > 0.6) { weatherType = "Heavy Rain"; weatherIcon = CloudRain; color = "text-blue-500"; }
        else if (avgRainProb > 0.3) { weatherType = "Cloudy"; weatherIcon = Cloud; color = "text-gray-500"; }
        else if (avgTemp > 30) { weatherType = "Hot"; weatherIcon = ThermometerSun; color = "text-orange-400"; }

        const events: ScheduleEvent[] = [];
        const irrigating = entries.filter(e => e.sensor_data.is_irrigating);
        const skipped = entries.filter(e => e.sensor_data.rain_probability > 0.6 && !e.sensor_data.is_irrigating);
        const anomalyEntries = entries.filter(e => e.prediction.is_anomaly);

        if (irrigating.length > 0) {
            events.push({
                time: new Date(irrigating[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                zone: "All Zones",
                status: "completed",
                action: `${t('completed')}: ${irrigating.length} ticks (~${(irrigating.length * 0.5).toFixed(0)} min)`,
            });
        }

        if (skipped.length > 0) {
            events.push({
                time: new Date(skipped[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                zone: "All Zones",
                status: "skipped",
                action: `${t('scheduled')}: Irrigation`,
                reason: `Auto-Skipped: ${(avgRainProb * 100).toFixed(0)}% rain`,
            });
        }

        anomalyEntries.slice(0, 3).forEach(ae => {
            events.push({
                time: new Date(ae.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                zone: ae.prediction.anomaly_type,
                status: "pending_ai",
                action: `${t('pendingAI')}: ${ae.prediction.anomaly_type}`,
                reason: `Confidence: ${(ae.prediction.confidence * 100).toFixed(0)}%`,
            });
        });

        if (events.length === 0) {
            events.push({
                time: entries.length > 0 ? new Date(entries[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
                zone: "All Zones",
                status: "completed",
                action: `${entries.length} readings — Normal`,
            });
        }

        return { day: dayName, date: datePart, weather: { type: weatherType, temp: `${avgTemp.toFixed(0)}°C`, rainChance: `${(avgRainProb * 100).toFixed(0)}%`, icon: weatherIcon, color }, events };
    };

    const scheduleData = sortedDates.map(date => buildDaySchedule(date, dateGroups[date]));

    if (loading && pipelineData.length === 0) {
        return (
            <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 flex items-center justify-center pt-20">
                <div className="flex flex-col items-center gap-4 bg-white p-10 rounded-3xl shadow-sm border-2 border-emerald-100">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-xl text-emerald-800 font-bold">Checking watering schedule...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col items-start gap-2">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 flex items-center gap-3">
                            <CalendarRange className="w-10 h-10 text-green-600" />
                            Smart Watering Plan
                        </h1>
                        <p className="text-xl text-green-700/90 font-medium">See when your fields were watered and what the AI plans next.</p>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm hover:bg-blue-100 transition-colors cursor-default">
                        <CloudRain className="w-6 h-6 text-blue-500" />
                        <span className="text-base font-bold text-blue-900">Weather Sync ON</span>
                    </div>
                </div>

                {/* AI Summary Banner */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10 w-full md:w-2/3 space-y-3">
                        <h2 className="text-2xl font-extrabold flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                            AI Assistant Summary
                        </h2>
                        <p className="text-emerald-50 leading-relaxed text-lg font-medium">
                            I&apos;ve found <strong>{anomalies.length}</strong> issues recently, and skipped watering <strong>{skippedByRain.length}</strong> times because it was going to rain.
                            This saved you around <strong>{estimatedLitersSaved.toLocaleString()} liters</strong> of water!
                        </p>
                    </div>
                    <CloudRain className="absolute -right-6 -bottom-6 w-48 h-48 text-emerald-300 opacity-20 rotate-12" />
                </div>

                {/* Schedule List */}
                <div className="space-y-6">
                    {scheduleData.length === 0 ? (
                        <Card className="rounded-3xl border-2 border-green-200 shadow-sm p-12 text-center text-green-600/70 bg-white">
                            <p className="text-xl font-bold">{t('noActions') || "No history available yet."}</p>
                        </Card>
                    ) : (
                        scheduleData.map((day, idx) => (
                            <Card key={idx} className="rounded-3xl border-2 border-green-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row">
                                    {/* Weather/Date Block */}
                                    <div className="bg-emerald-50 md:w-56 p-6 border-b md:border-b-0 md:border-r-2 border-green-100 flex md:flex-col items-center justify-between md:justify-center text-center gap-4">
                                        <div>
                                            <p className="text-xl font-extrabold text-green-950">{day.day}</p>
                                            <p className="text-sm font-bold text-green-700 mt-1 uppercase tracking-widest">{day.date}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100/50">
                                            <day.weather.icon className={`w-10 h-10 ${day.weather.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-3xl font-black text-green-950">{day.weather.temp}</p>
                                            <p className="text-sm font-bold text-blue-600 flex items-center justify-center gap-1.5 mt-1 border border-blue-200 bg-blue-50 px-3 py-1 rounded-full">
                                                <CloudRain className="w-4 h-4" /> {day.weather.rainChance} Rain
                                            </p>
                                        </div>
                                    </div>

                                    {/* Events Block */}
                                    <div className="flex-1 p-0">
                                        <div className="divide-y-2 divide-green-50/80 h-full flex flex-col justify-center">
                                            {day.events.map((ev, evIdx) => (
                                                <div key={evIdx} className={`p-6 flex flex-col md:flex-row gap-6 items-start md:items-center ${ev.status === 'skipped' ? 'bg-red-50/40' : 'hover:bg-slate-50 transition-colors'}`}>
                                                    <div className="w-24 shrink-0 font-extrabold text-green-900 text-lg">{ev.time}</div>
                                                    <div className="w-40 shrink-0">
                                                        <Badge className="text-base px-4 py-1.5 text-green-800 border-green-300 bg-white shadow-sm font-bold">{ev.zone}</Badge>
                                                    </div>
                                                    <div className="flex-1">
                                                        {ev.status === "completed" && (
                                                            <span className="text-green-800 text-lg font-bold flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm border-2 border-white"></div>
                                                                {ev.action}
                                                            </span>
                                                        )}
                                                        {ev.status === "scheduled" && (
                                                            <span className="text-blue-800 text-lg font-bold flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded-full bg-blue-400 shadow-sm border-2 border-white"></div>
                                                                {ev.action}
                                                            </span>
                                                        )}
                                                        {ev.status === "pending_ai" && (
                                                            <div className="text-orange-700">
                                                                <span className="flex items-center gap-3 text-lg font-bold"><Sparkles className="w-5 h-5" /> {ev.action}</span>
                                                                <p className="text-base mt-2 text-orange-800/80 font-medium">Auto-detected details: {ev.reason}</p>
                                                            </div>
                                                        )}
                                                        {ev.status === "skipped" && (
                                                            <div>
                                                                <span className="text-gray-400 line-through text-lg font-bold">{ev.action}</span>
                                                                <div className="mt-3 flex items-center gap-2 text-base font-bold text-red-700 bg-red-100 w-max px-4 py-2 rounded-xl border border-red-200 shadow-sm">
                                                                    <AlertCircle className="w-5 h-5" />{ev.reason}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
