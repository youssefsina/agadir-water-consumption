"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Droplet, CircleDollarSign, TrendingDown, Target, Zap, AlertCircle, Loader2 } from "lucide-react";
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

export default function AnalyticsPage() {
    const [stats, setStats] = useState<DataStats | null>(null);
    const [anomalyTypes, setAnomalyTypes] = useState<Record<string, number>>({});
    const [models, setModels] = useState<AIModel[]>([]);
    const [pipelineData, setPipelineData] = useState<PipelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [statsRes, anomalyRes, modelsRes, historyRes] = await Promise.all([
                    getDataStats("raw"),
                    getAnomalyTypes(),
                    listAIModels(),
                    getPipelineHistory(200),
                ]);
                setStats(statsRes);
                setAnomalyTypes(anomalyRes);
                setModels(modelsRes.models);
                setPipelineData(historyRes.data);
                setError(null);
            } catch (err) {
                console.error("Analytics fetch error", err);
                setError("Failed to load analytics data from backend");
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Refresh every 60 seconds
        const timer = setInterval(fetchData, 60000);
        return () => clearInterval(timer);
    }, []);

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

    // Build anomaly distribution bar chart data
    const anomalyBarData = Object.entries(anomalyTypes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    // Compute stats from pipeline data
    const totalAnomalies = pipelineData.filter(e => e.prediction.is_anomaly).length;
    const totalNormal = pipelineData.length - totalAnomalies;

    // Estimate water savings based on anomaly count
    const estimatedLitersSaved = totalAnomalies * 850; // rough per-incident estimate
    const estimatedMoneySaved = (estimatedLitersSaved * 0.007).toFixed(0); // ~$0.007 per liter in Agadir area

    if (loading) {
        return (
            <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                    <p className="text-green-700 font-medium">Loading analytics from backend...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                            <BrainCircuit className="w-8 h-8 text-indigo-600" />
                            AI Performance Analytics
                        </h1>
                        <p className="text-green-700/80 mt-1">Random Forest anomaly detection model — live pipeline data</p>
                    </div>
                    {error && (
                        <Badge variant="destructive" className="px-3 py-1">
                            <AlertCircle className="w-3 h-3 mr-1" /> {error}
                        </Badge>
                    )}
                </div>

                {/* Hero Counters — from real data */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                                        <Droplet className="w-4 h-4" /> Est. Water Saved
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        {estimatedLitersSaved >= 1000
                                            ? `${(estimatedLitersSaved / 1000).toFixed(1)}K`
                                            : estimatedLitersSaved
                                        } <span className="text-2xl font-semibold opacity-80">Liters</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-blue-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <TrendingDown className="w-4 h-4" /> From {totalAnomalies} anomalies detected
                            </div>
                            <Droplet className="absolute -right-6 -bottom-6 w-40 h-40 text-blue-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2">
                                        <CircleDollarSign className="w-4 h-4" /> Est. Money Saved
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        ${estimatedMoneySaved}
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-emerald-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <Zap className="w-4 h-4" /> Pumping energy + water costs
                            </div>
                            <CircleDollarSign className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-indigo-100 font-medium mb-1 flex items-center gap-2">
                                        <Target className="w-4 h-4" /> Total Pipeline Readings
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        {pipelineData.length} <span className="text-xl font-semibold opacity-80">entries</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-indigo-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <BrainCircuit className="w-4 h-4" /> {totalAnomalies} anomalies, {totalNormal} normal
                            </div>
                            <BrainCircuit className="absolute -right-6 -bottom-6 w-40 h-40 text-indigo-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Scatter Plot from real pipeline data */}
                    <Card className="lg:col-span-2 border-indigo-100 shadow-md">
                        <CardHeader className="bg-white pb-2 border-b border-indigo-50">
                            <div>
                                <CardTitle className="text-indigo-900 flex items-center gap-2">
                                    Flow vs Pressure — Anomaly Clustering
                                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 uppercase tracking-wider">Live Data</span>
                                </CardTitle>
                                <CardDescription>
                                    {pipelineData.length} pipeline readings plotted. Normal operations cluster together; anomalies appear as outliers.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" dataKey="x" name="Flow" unit=" L/min" stroke="#64748b"
                                            label={{ value: 'Irrigation Flow Rate (L/min)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }} />
                                        <YAxis type="number" dataKey="y" name="Pressure" unit=" Bar" stroke="#64748b"
                                            label={{ value: 'Pipeline Pressure (Bar)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                                        <ZAxis type="number" dataKey="z" range={[40, 400]} name="Confidence %" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Scatter name={`Normal (${scatterNormal.length})`} data={scatterNormal} fill="#10b981" fillOpacity={0.6} />
                                        <Scatter name={`Anomalies (${scatterAnomalies.length})`} data={scatterAnomalies} fill="#ef4444" fillOpacity={0.8} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Model Insights Sidebar */}
                    <div className="flex flex-col gap-4">
                        <Card className="border-indigo-100 shadow-sm flex-1 bg-gradient-to-b from-white to-indigo-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-indigo-900 text-lg">Model Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-indigo-950/80 leading-relaxed">
                                <div className="mt-2 pt-2 border-t border-indigo-100">
                                    <div className="text-xs font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Loaded Models</div>
                                    {models.length > 0 ? models.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">{m.name || m.type}</span>
                                            <Badge className={`${m.is_loaded ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                                                {m.is_loaded ? "Loaded" : "Not Loaded"}
                                            </Badge>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-indigo-500">Loading models...</p>
                                    )}
                                </div>

                                {stats && (
                                    <div className="pt-3 border-t border-indigo-100">
                                        <div className="text-xs font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Dataset Stats</div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium">Total Rows</span>
                                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">{stats.total_rows?.toLocaleString()}</Badge>
                                        </div>
                                        {stats.time_range && (
                                            <div className="text-xs text-indigo-600 mt-1">
                                                Range: {new Date(stats.time_range.start).toLocaleDateString()} — {new Date(stats.time_range.end).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Anomaly Distribution Bar Chart */}
                {anomalyBarData.length > 0 && (
                    <Card className="border-indigo-100 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-indigo-900">Anomaly Type Distribution (Training Data)</CardTitle>
                            <CardDescription>Distribution across the loaded dataset from the backend</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={anomalyBarData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Feature Ranges from backend */}
                {stats?.feature_ranges && Object.keys(stats.feature_ranges).length > 0 && (
                    <Card className="border-indigo-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-indigo-900 text-lg">Feature Ranges (from Dataset)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Object.entries(stats.feature_ranges).map(([feature, range]) => (
                                    <div key={feature} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                        <p className="text-xs font-semibold text-indigo-800 mb-1 truncate">{feature}</p>
                                        <div className="text-xs text-indigo-600 space-y-0.5">
                                            <div className="flex justify-between"><span>Min:</span><span className="font-mono">{range.min.toFixed(2)}</span></div>
                                            <div className="flex justify-between"><span>Max:</span><span className="font-mono">{range.max.toFixed(2)}</span></div>
                                            <div className="flex justify-between"><span>Mean:</span><span className="font-mono">{range.mean.toFixed(2)}</span></div>
                                            <div className="flex justify-between"><span>Std:</span><span className="font-mono">{range.std.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
