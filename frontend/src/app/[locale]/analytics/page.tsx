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

export default function AnalyticsPage() {
    const t = useTranslations('analytics');

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
                setError("Failed to load analytics data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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
                    <p className="text-green-700 font-medium">Loading analytics...</p>
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
                            {t('title')}
                        </h1>
                        <p className="text-green-700/80 mt-1">{t('subtitle')} — Live pipeline data</p>
                    </div>
                    {error && (
                        <Badge variant="destructive" className="px-3 py-1">
                            <AlertCircle className="w-3 h-3 ltr:mr-1 rtl:ml-1" /> {error}
                        </Badge>
                    )}
                </div>

                {/* Hero Counters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                                        <Droplet className="w-4 h-4" /> {t('waterSaved')}
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        {estimatedLitersSaved >= 1000 ? `${(estimatedLitersSaved / 1000).toFixed(1)}K` : estimatedLitersSaved}
                                        <span className="text-2xl font-semibold opacity-80"> {t('liters')}</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-blue-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <TrendingDown className="w-4 h-4" /> {t('reduction')}
                            </div>
                            <Droplet className="absolute -right-6 -bottom-6 w-40 h-40 text-blue-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2">
                                        <CircleDollarSign className="w-4 h-4" /> {t('moneySaved')}
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">${estimatedMoneySaved}</h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-emerald-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <Zap className="w-4 h-4" /> {t('energyCosts')}
                            </div>
                            <CircleDollarSign className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-indigo-100 font-medium mb-1 flex items-center gap-2">
                                        <Target className="w-4 h-4" /> {t('detected')}
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        {totalAnomalies} <span className="text-xl font-semibold opacity-80">{t('prevented')}</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-indigo-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <BrainCircuit className="w-4 h-4" /> {t('insights')}
                            </div>
                            <BrainCircuit className="absolute -right-6 -bottom-6 w-40 h-40 text-indigo-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-indigo-100 shadow-md">
                        <CardHeader className="bg-white pb-2 border-b border-indigo-50">
                            <div>
                                <CardTitle className="text-indigo-900 flex items-center gap-2">
                                    {t('modelVisualization')}
                                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 uppercase tracking-wider">Live Data</span>
                                </CardTitle>
                                <CardDescription>{t('modelDesc')}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" dataKey="x" name="Flow" unit=" L/min" stroke="#64748b"
                                            label={{ value: 'Flow Rate (L/min)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }} />
                                        <YAxis type="number" dataKey="y" name="Pressure" unit=" Bar" stroke="#64748b"
                                            label={{ value: 'Pressure (Bar)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                                        <ZAxis type="number" dataKey="z" range={[40, 400]} name="Confidence %" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Scatter name={`${t('normalOperations')} (${scatterNormal.length})`} data={scatterNormal} fill="#10b981" fillOpacity={0.6} />
                                        <Scatter name={`Anomalies (${scatterAnomalies.length})`} data={scatterAnomalies} fill="#ef4444" fillOpacity={0.8} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4">
                        <Card className="border-indigo-100 shadow-sm flex-1 bg-gradient-to-b from-white to-indigo-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-indigo-900 text-lg">{t('insightsDesc')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-indigo-950/80 leading-relaxed">
                                <div className="mt-2 pt-2 border-t border-indigo-100">
                                    <div className="text-xs font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Models</div>
                                    {models.length > 0 ? models.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">{m.name || m.type}</span>
                                            <Badge className={`${m.is_loaded ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                                                {m.is_loaded ? "Loaded" : "Not Loaded"}
                                            </Badge>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-indigo-500">Loading...</p>
                                    )}
                                </div>
                                {stats && (
                                    <div className="pt-3 border-t border-indigo-100">
                                        <div className="text-xs font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Dataset</div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium">Total Rows</span>
                                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">{stats.total_rows?.toLocaleString()}</Badge>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {anomalyBarData.length > 0 && (
                    <Card className="border-indigo-100 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-indigo-900">Anomaly Type Distribution</CardTitle>
                            <CardDescription>From training dataset loaded in the backend</CardDescription>
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
            </div>
        </div>
    );
}
