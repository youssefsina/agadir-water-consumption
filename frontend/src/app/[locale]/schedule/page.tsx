"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, CloudRain, Sun, Cloud, ThermometerSun, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getPipelineHistory, type PipelineEntry } from "@/lib/api";

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
    const [pipelineData, setPipelineData] = useState<PipelineEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await getPipelineHistory(100);
                setPipelineData(res.data);
            } catch (err) {
                console.error("Schedule fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const timer = setInterval(fetchData, 60000);
        return () => clearInterval(timer);
    }, []);

    const totalEntries = pipelineData.length;
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
            <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                    <p className="text-green-700 font-medium">Loading schedule...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                            <CalendarRange className="w-8 h-8 text-green-600" />
                            {t('title')}
                        </h1>
                        <p className="text-green-700/80 mt-1">{t('subtitle')} — {totalEntries} readings</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                        <CloudRain className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-900">{t('weatherSyncActive')}</span>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10 w-full md:w-2/3">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            {t('aiSummaryTitle')}
                        </h2>
                        <p className="text-emerald-50 leading-relaxed text-sm">
                            {anomalies.length} anomalies detected, {skippedByRain.length} irrigation cycles skipped for rain.
                            Estimated {estimatedLitersSaved.toLocaleString()} liters saved.
                        </p>
                    </div>
                    <CloudRain className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-500/30 rotate-12" />
                </div>

                <div className="space-y-4">
                    {scheduleData.length === 0 ? (
                        <Card className="border-green-200 shadow-sm p-8 text-center text-green-600/70">
                            <p>{t('noActions')}</p>
                        </Card>
                    ) : (
                        scheduleData.map((day, idx) => (
                            <Card key={idx} className="border-green-200 shadow-sm overflow-hidden">
                                <div className="flex flex-col md:flex-row">
                                    <div className="bg-emerald-50 md:w-48 p-4 border-b md:border-b-0 md:border-r border-green-100 flex md:flex-col items-center justify-between md:justify-center text-center gap-2">
                                        <div>
                                            <p className="font-bold text-green-900">{day.day}</p>
                                            <p className="text-xs text-green-700/70">{day.date}</p>
                                        </div>
                                        <day.weather.icon className={`w-8 h-8 ${day.weather.color}`} />
                                        <div>
                                            <p className="text-xl font-bold text-green-950">{day.weather.temp}</p>
                                            <p className="text-xs font-semibold text-blue-600 flex items-center justify-center gap-1">
                                                <CloudRain className="w-3 h-3" /> {day.weather.rainChance}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 p-0">
                                        <div className="divide-y divide-green-50">
                                            {day.events.map((ev, evIdx) => (
                                                <div key={evIdx} className={`p-4 flex flex-col md:flex-row gap-4 items-start md:items-center ${ev.status === 'skipped' ? 'bg-red-50/30' : ''}`}>
                                                    <div className="w-24 shrink-0 font-medium text-green-900 text-sm">{ev.time}</div>
                                                    <div className="w-32 shrink-0">
                                                        <Badge variant="outline" className="text-green-800 border-green-200 bg-white">{ev.zone}</Badge>
                                                    </div>
                                                    <div className="flex-1">
                                                        {ev.status === "completed" && (
                                                            <span className="text-green-700 text-sm flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                {ev.action}
                                                            </span>
                                                        )}
                                                        {ev.status === "scheduled" && (
                                                            <span className="text-green-600/80 text-sm flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                                                                {ev.action}
                                                            </span>
                                                        )}
                                                        {ev.status === "pending_ai" && (
                                                            <div className="text-orange-600 text-sm">
                                                                <span className="flex items-center gap-2 font-medium"><Sparkles className="w-3 h-3" /> {ev.action}</span>
                                                                <p className="text-xs mt-1 text-orange-600/70">{ev.reason}</p>
                                                            </div>
                                                        )}
                                                        {ev.status === "skipped" && (
                                                            <div>
                                                                <span className="text-gray-400 line-through text-sm">{ev.action}</span>
                                                                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100/50 w-max px-2 py-1 rounded-md border border-red-100">
                                                                    <AlertCircle className="w-3 h-3" />{ev.reason}
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
