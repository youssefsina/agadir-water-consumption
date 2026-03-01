"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Droplet, CircleDollarSign, TrendingDown, Target, Zap, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
} from 'recharts';
import {
    getDataStats,
    getAnomalyTypes,
    listAIModels,
    getPipelineHistory,
    type DataStats,
    type AIModel,
    type PipelineEntry,
} from "@/lib/api";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import type { SensorReading } from "@/lib/supabase";

export default function AnalyticsPage() {
    const t = useTranslations('analytics');

    // ── Supabase direct reads (30s poll) ──────────────────
    const {
        readings: dbReadings,
        stats: dbStats,
        anomalyDistribution: dbAnomalyDist,
        loading: dbLoading,
        error: dbError,
    } = useSupabaseData(200);

    // ── Backend API data (models + fallback) ─────────────
    const [backendStats, setBackendStats] = useState<DataStats | null>(null);
    const [backendAnomalyTypes, setBackendAnomalyTypes] = useState<Record<string, number>>({});
    const [models, setModels] = useState<AIModel[]>([]);
    const [backendPipelineData, setBackendPipelineData] = useState<PipelineEntry[]>([]);
    const [backendLoading, setBackendLoading] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBackend = async () => {
            try {
                setBackendLoading(true);
                const [statsRes, anomalyRes, modelsRes, historyRes] = await Promise.all([
                    getDataStats("raw").catch(() => null),
                    getAnomalyTypes().catch(() => ({})),
                    listAIModels().catch(() => ({ models: [] })),
                    getPipelineHistory(200).catch(() => ({ data: [], stats: null })),
                ]);
                if (statsRes) setBackendStats(statsRes);
                setBackendAnomalyTypes(anomalyRes as Record<string, number>);
                setModels(modelsRes.models);
                setBackendPipelineData(historyRes.data);
                setBackendError(null);
            } catch (err) {
                console.error("Backend analytics fetch error", err);
                setBackendError("Backend unavailable — using DB data");
            } finally {
                setBackendLoading(false);
            }
        };
        fetchBackend();
        const timer = setInterval(fetchBackend, 60000);
        return () => clearInterval(timer);
    }, []);

    // ── Merge: prefer Supabase DB, fall back to backend ──
    const anomalyTypes = Object.keys(dbAnomalyDist).length > 0 ? dbAnomalyDist : backendAnomalyTypes;
    const stats = dbStats ? { total_rows: dbStats.total_rows } as DataStats : backendStats;
    const loading = dbLoading && backendLoading;
    const error = dbError && backendError ? backendError : null;

    // Build pipeline-like entries from DB readings for scatter chart
    const pipelineData: PipelineEntry[] = backendPipelineData.length > 0
        ? backendPipelineData
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

    // Build scatter data from real pipeline entries
    const scatterNormal: { x: number; y: number; z: number }[] = [];
    const scatterAnomalies: { x: number; y: number; z: number; type: string }[] = [];

    pipelineData.forEach((entry) => {
        const point = {
            x: entry.sensor_data.flow_lpm,
            y: entry.sensor_data.pressure_bar,
            z: entry.prediction.confidence * 100,
        };
        if (entry.prediction.is_anomaly) {
            scatterAnomalies.push({ ...point, type: entry.prediction.anomaly_type });
        } else {
            scatterNormal.push(point);
        }
    });

    // Anomaly distribution bar chart from dataset
    const anomalyBarData = Object.entries(anomalyTypes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const totalAnomalies = pipelineData.filter(e => e.prediction.is_anomaly).length;
    const totalNormal = pipelineData.length - totalAnomalies;
    const estimatedLitersSaved = totalAnomalies * 850;
    const estimatedMoneySaved = (estimatedLitersSaved * 0.007).toFixed(0);

    if (loading) {
        return (
            <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                    <p className="text-green-700 font-medium">{t('loadingAnalytics')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col items-start gap-2">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 flex items-center gap-3">
                            <BrainCircuit className="w-10 h-10 text-indigo-600" />
                            {t('title')}
                        </h1>
                        <p className="text-xl text-green-700/90 font-medium">{t('systemSummaryDesc').split('.')[0] + '.'}</p>
                    </div>
                    {error && (
                        <Badge variant="destructive" className="px-4 py-2 text-base">
                            <AlertCircle className="w-5 h-5 ltr:mr-2 rtl:ml-2" /> {error}
                        </Badge>
                    )}
                </div>

                {/* Main 3 Huge Counters */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="rounded-3xl border-2 border-blue-100 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg overflow-hidden relative">
                        <CardContent className="p-8">
                            <div className="z-10 relative">
                                <p className="text-blue-100 font-bold text-lg mb-2 flex items-center gap-2 uppercase tracking-wide">
                                    <Droplet className="w-5 h-5" /> {t('waterSaved')}
                                </p>
                                <h2 className="text-6xl md:text-7xl font-black tracking-tight mb-4">
                                    {estimatedLitersSaved >= 1000 ? `${(estimatedLitersSaved / 1000).toFixed(1)}K` : estimatedLitersSaved}
                                    <span className="text-2xl font-bold opacity-90 ml-2">{t('liters')}</span>
                                </h2>
                                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-base font-bold">
                                    <TrendingDown className="w-5 h-5" /> {t('reduction')}
                                </div>
                            </div>
                            <Droplet className="absolute -right-10 -bottom-10 w-64 h-64 text-blue-400 opacity-20" />
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg overflow-hidden relative">
                        <CardContent className="p-8">
                            <div className="z-10 relative">
                                <p className="text-emerald-100 font-bold text-lg mb-2 flex items-center gap-2 uppercase tracking-wide">
                                    <CircleDollarSign className="w-5 h-5" /> {t('moneySaved')}
                                </p>
                                <h2 className="text-6xl md:text-7xl font-black tracking-tight mb-4">
                                    ${estimatedMoneySaved}
                                </h2>
                                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-base font-bold">
                                    <Zap className="w-5 h-5" /> {t('energyCosts')}
                                </div>
                            </div>
                            <CircleDollarSign className="absolute -right-10 -bottom-10 w-64 h-64 text-emerald-400 opacity-20" />
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg overflow-hidden relative">
                        <CardContent className="p-8">
                            <div className="z-10 relative">
                                <p className="text-indigo-100 font-bold text-lg mb-2 flex items-center gap-2 uppercase tracking-wide">
                                    <Target className="w-5 h-5" /> {t('detected')}
                                </p>
                                <h2 className="text-6xl md:text-7xl font-black tracking-tight mb-4">
                                    {totalAnomalies}
                                    <span className="text-2xl font-bold opacity-90 ml-2">{t('prevented')}</span>
                                </h2>
                                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-base font-bold">
                                    <BrainCircuit className="w-5 h-5" /> {t('insights')}
                                </div>
                            </div>
                            <BrainCircuit className="absolute -right-10 -bottom-10 w-64 h-64 text-indigo-400 opacity-20" />
                        </CardContent>
                    </Card>
                </div>

                {/* Friendly Summary Panel */}
                <Card className="rounded-3xl border-2 border-green-100 shadow-sm bg-white">
                    <CardHeader className="bg-green-50/50 border-b border-green-100 pb-4">
                        <CardTitle className="text-green-800 text-2xl font-bold flex items-center gap-3">
                            <AlertCircle className="w-8 h-8 text-green-600" />
                            {t('systemSummaryTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8">
                        <p className="text-xl text-green-800 font-medium leading-relaxed">
                            {t('systemSummaryDesc').replace('{totalAnomalies}', String(totalAnomalies)).replace('{estimatedLitersSaved}', String(estimatedLitersSaved)).replace('{estimatedMoneySaved}', String(estimatedMoneySaved))}
                        </p>
                    </CardContent>
                </Card>

                {/* Developer / Technical Stats Collapsible */}
                <details className="group border border-indigo-200 bg-white shadow-sm rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between p-6 cursor-pointer bg-indigo-50/50 hover:bg-indigo-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <BrainCircuit className="w-6 h-6 text-indigo-700" />
                            <h3 className="text-xl font-bold text-indigo-900">{t('advancedAI')} <span className="text-sm font-normal text-indigo-600 ml-2">{t('technicalDetails')}</span></h3>
                        </div>
                        <span className="transition group-open:rotate-180">
                            <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                    </summary>
                    <div className="p-6 border-t border-indigo-100 space-y-8">

                        {/* The charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="border border-indigo-100 rounded-xl p-4">
                                <h4 className="font-bold text-indigo-900 mb-4">{t('modelVisualization')} {t('liveData')}</h4>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis type="number" dataKey="x" name={t('flow')} unit="L" stroke="#64748b" />
                                            <YAxis type="number" dataKey="y" name={t('pressure')} unit="Bar" stroke="#64748b" />
                                            <ZAxis type="number" dataKey="z" range={[40, 200]} name={t('conf')} />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Legend />
                                            <Scatter name={`${t('normal')} (${scatterNormal.length})`} data={scatterNormal} fill="#10b981" />
                                            <Scatter name={`${t('anomalies')} (${scatterAnomalies.length})`} data={scatterAnomalies} fill="#ef4444" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {anomalyBarData.length > 0 && (
                                <div className="border border-indigo-100 rounded-xl p-4">
                                    <h4 className="font-bold text-indigo-900 mb-4">{t('anomalyDist')}</h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={anomalyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                                                <YAxis stroke="#64748b" fontSize={10} />
                                                <Tooltip />
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Model status */}
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <h4 className="font-bold text-indigo-900 mb-3 uppercase tracking-wide text-xs">{t('aiModelsLoaded')} ({models.length})</h4>
                            <div className="flex flex-wrap gap-2">
                                {models.map((m, i) => (
                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${m.is_loaded ? "bg-white border-green-200 text-green-800" : "bg-white border-red-200 text-red-800"}`}>
                                        <div className={`w-2 h-2 rounded-full ${m.is_loaded ? "bg-green-500" : "bg-red-500"}`} />
                                        {m.name || m.type}
                                    </div>
                                ))}
                            </div>
                            {stats && (
                                <p className="text-sm font-medium text-indigo-700 mt-4 border-t border-indigo-100 pt-3">
                                    {t('datasetRows')} {stats.total_rows?.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                </details>

            </div>
        </div>
    );
}
