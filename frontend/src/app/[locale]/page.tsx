"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

import {
    Activity,
    Droplets,
    AlertTriangle,
    Thermometer,
    Gauge,
    PowerOff,
    PauseCircle,
    Settings,
    Wifi,
    WifiOff,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { usePipeline } from "@/hooks/use-pipeline";
import { useSupabaseData } from "@/hooks/use-supabase-data";
import { useDevMode } from "@/hooks/use-dev-mode";
import {
    setAnomalyType,
    getHealth,
    type HealthStatus,
} from "@/lib/api";

type Scenario = "NORMAL" | "LEAK_NIGHT" | "BURST" | "OVER_IRR" | "UNDER_IRR" | "RAIN";
type DecisionState = "ON" | "PAUSE" | "STOP";

interface AlertItem {
    id: string;
    time: string;
    message: string;
    type: "warning" | "destructive" | "info";
    recipients?: string[];
}

interface ChartPoint {
    time: string;
    flow: number;
    pressure: number;
    moisture: number;
    temperature: number;
    anomalyScore: number;
}

const Sparkline = ({ data, dataKey, color }: { data: ChartPoint[], dataKey: string, color: string }) => (
    <div className="h-16 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill={`url(#color-${dataKey})`} strokeWidth={3} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

export default function Dashboard() {
    const t = useTranslations("dashboard");

    const [scenario, setScenario] = useState<Scenario>("NORMAL");
    const [decision, setDecision] = useState<DecisionState>("ON");
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    const { devMode } = useDevMode();

    const [currentData, setCurrentData] = useState<ChartPoint>({
        time: "--:--",
        flow: 0,
        pressure: 0,
        moisture: 0,
        temperature: 0,
        anomalyScore: 0,
    });
    const [chartData, setChartData] = useState<ChartPoint[]>([]);

    // Backend status
    const [health, setHealth] = useState<HealthStatus | null>(null);

    // Real-time pipeline connection
    const { current, history, connected } = usePipeline(30);

    // Read-only Supabase data — polls every 30s, works even when backend is offline
    const { readings: dbReadings, stats: dbStats, error: dbError } = useSupabaseData(60);

    // Use DB data as fallback when pipeline has no history yet
    useEffect(() => {
        if (dbReadings.length > 0) {
            if (history.length === 0) {
                const points: ChartPoint[] = dbReadings.slice(-30).map((r) => ({
                    time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                    flow: r.flow_lpm,
                    pressure: r.pressure_bar,
                    moisture: r.soil_moisture_pct,
                    temperature: r.temperature_c,
                    anomalyScore: r.anomaly_label ? r.anomaly_confidence * 100 : Math.max(5, r.anomaly_confidence * 20),
                }));
                setChartData(points);
                if (points.length > 0) setCurrentData(points[points.length - 1]);
            }
            if (alerts.length === 0) {
                const histAlerts = dbReadings
                    .filter((r) => r.anomaly_label === 1)
                    .slice(-10)
                    .reverse()
                    .map((r) => ({
                        id: String(r.id || Math.random()),
                        time: new Date(r.timestamp).toLocaleTimeString(),
                        message: t("anomalyDetected", { type: r.anomaly_type || t("unknownAnomaly"), confidence: (r.anomaly_confidence * 100).toFixed(0) }),
                        type: "destructive" as const,
                    }));
                if (histAlerts.length > 0) setAlerts(histAlerts);
            }
        }
    }, [history.length, dbReadings, alerts.length]);

    // Fetch health and pipeline status periodically (non-blocking)
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const [h] = await Promise.all([
                    getHealth().catch(() => null),
                ]);
                if (h) setHealth(h);
            } catch (err) {
                console.error("Failed to fetch status", err);
            }
        };
        fetchStatus();
        const timer = setInterval(fetchStatus, 30000);
        return () => clearInterval(timer);
    }, []);

    // Add alert helper
    const addAlert = useCallback((message: string, type: "warning" | "destructive" | "info", recipients?: string[]) => {
        setAlerts((prev) => {
            if (prev.length > 0 && prev[0].message === message) return prev;
            return [
                { id: Math.random().toString(36).substr(2, 9), time: new Date().toLocaleTimeString(), message, type, recipients },
                ...prev.slice(0, 19),
            ];
        });
    }, []);

    // Parse pipeline history into chart data
    useEffect(() => {
        if (history.length > 0) {
            const points: ChartPoint[] = history.map((entry) => ({
                time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                flow: entry.sensor_data.flow_lpm,
                pressure: entry.sensor_data.pressure_bar,
                moisture: entry.sensor_data.soil_moisture_pct,
                temperature: entry.sensor_data.temperature_c,
                anomalyScore: entry.prediction.is_anomaly
                    ? entry.prediction.confidence * 100
                    : Math.max(5, entry.prediction.confidence * 20),
            }));
            setChartData(points);
            if (points.length > 0) {
                setCurrentData(points[points.length - 1]);
            }
        }
    }, [history]);

    // React to new pipeline ticks
    useEffect(() => {
        if (!current) return;

        const sd = current.sensor_data;
        const pred = current.prediction;

        // Update decision from real sensor data
        if (sd.is_irrigating) {
            setDecision("ON");
        } else if (sd.rain_probability > 0.6) {
            setDecision("PAUSE");
        } else {
            setDecision("STOP");
        }

        // Alert on anomalies
        if (pred.is_anomaly) {
            const anType = pred.anomaly_type || t("unknownAnomaly");
            let recipients: string[] | undefined = undefined;
            if (current.whatsapp_result?.results) {
                recipients = current.whatsapp_result.results.filter((r: any) => r.success).map((r: any) => r.phone);
            }
            addAlert(t("anomalyDetected", { type: anType, confidence: (pred.confidence * 100).toFixed(0) }), "destructive", recipients);
        }
    }, [current, addAlert]);

    // Handle scenario change — sends to backend
    const handleSetScenario = async (scen: Scenario, anomalyId: number) => {
        setScenario(scen);
        try {
            await setAnomalyType(anomalyId);
        } catch (e) {
            console.error("Failed to set scenario", e);
        }
    };

    const getAnomalyColor = (score: number) => {
        if (score < 30) return "bg-green-500";
        if (score < 70) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Farmer System Status Banner */}
                <div className={`rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border ${decision === "ON" ? "bg-green-500 border-green-600 text-white" :
                    decision === "PAUSE" ? "bg-amber-400 border-amber-500 text-amber-950" :
                        "bg-red-500 border-red-600 text-white"
                    }`}>
                    <div className="flex items-center gap-6">
                        <div className="bg-white/20 p-4 rounded-full">
                            {decision === "ON" ? <Droplets className="w-12 h-12" /> :
                                decision === "PAUSE" ? <PauseCircle className="w-12 h-12" /> :
                                    <PowerOff className="w-12 h-12" />}
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-5xl font-extrabold mb-2">
                                {decision === "ON" ? t("wateringOn") :
                                    decision === "PAUSE" ? t("wateringPaused") :
                                        t("wateringOff")}
                            </h2>
                            <p className="text-lg md:text-xl opacity-90 font-medium">
                                {decision === "ON" ? t("cropsGettingWater") :
                                    decision === "PAUSE" ? t("tempPauseRain") :
                                        t("noWaterFlowing")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Important Alerts row */}
                {alerts.length > 0 && alerts[0].type === "destructive" && (
                    <div className="bg-red-100 border-2 border-red-500 rounded-2xl p-6 flex items-start gap-4">
                        <AlertTriangle className="w-10 h-10 text-red-600 shrink-0" />
                        <div>
                            <h3 className="text-2xl font-bold text-red-800">{t("attentionNeeded")}</h3>
                            <p className="text-lg text-red-900 mt-1">{alerts[0].message}</p>
                        </div>
                    </div>
                )}

                {/* Main 4 Metrics - Huge Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {/* Soil Moisture */}
                    <Card className="rounded-3xl border-2 border-emerald-100 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl md:text-2xl font-bold text-emerald-800">{t("soilMoisture")}</CardTitle>
                            <Droplets className="w-8 h-8 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="h-full flex flex-col justify-between group">
                            <div>
                                <div className="text-5xl md:text-7xl font-black text-emerald-950 mb-4">{currentData.moisture.toFixed(0)}<span className="text-2xl md:text-4xl text-emerald-600 font-bold ml-1">%</span></div>
                                <p className="mt-4 text-emerald-700 font-medium text-lg">
                                    {currentData.moisture < 30 ? t("soilTooDry") : currentData.moisture > 60 ? t("soilVeryWet") : t("perfectMoisture")}
                                </p>
                            </div>
                            <Sparkline data={chartData} dataKey="moisture" color="#10b981" />
                        </CardContent>
                    </Card>

                    {/* Water Flow */}
                    <Card className="rounded-3xl border-2 border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl md:text-2xl font-bold text-blue-800">{t("waterFlow")}</CardTitle>
                            <Activity className="w-8 h-8 text-blue-500" />
                        </CardHeader>
                        <CardContent className="h-full flex flex-col justify-between group">
                            <div>
                                <div className="text-5xl md:text-7xl font-black text-blue-950 mb-4">{currentData.flow.toFixed(0)}<span className="text-lg md:text-2xl text-blue-600 font-bold ml-2 text-wrap">L/min</span></div>
                                <div className="pt-2">
                                    <p className="text-blue-700 font-medium text-lg flex items-center gap-2">
                                        {currentData.flow > 100 ? t("waterFlowingQuickly") : currentData.flow > 0 ? t("waterFlowingNormally") : t("noFlowDetected")}
                                    </p>
                                </div>
                            </div>
                            <Sparkline data={chartData} dataKey="flow" color="#3b82f6" />
                        </CardContent>
                    </Card>

                    {/* Pressure */}
                    <Card className="rounded-3xl border-2 border-indigo-100 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl md:text-2xl font-bold text-indigo-800">{t("pressure")}</CardTitle>
                            <Gauge className="w-8 h-8 text-indigo-500" />
                        </CardHeader>
                        <CardContent className="h-full flex flex-col justify-between group">
                            <div>
                                <div className="text-5xl md:text-7xl font-black text-indigo-950 mb-4">{currentData.pressure.toFixed(1)}<span className="text-2xl md:text-4xl text-indigo-600 font-bold ml-2">Bar</span></div>
                                <p className="text-indigo-700 font-medium text-lg">
                                    {currentData.pressure < 1.0 ? t("pressureLow") : t("pressureGood")}
                                </p>
                            </div>
                            <Sparkline data={chartData} dataKey="pressure" color="#6366f1" />
                        </CardContent>
                    </Card>

                    {/* Temperature */}
                    <Card className="rounded-3xl border-2 border-orange-100 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl md:text-2xl font-bold text-orange-800">{t("ambientTemp")}</CardTitle>
                            <Thermometer className="w-8 h-8 text-orange-500" />
                        </CardHeader>
                        <CardContent className="h-full flex flex-col justify-between group">
                            <div>
                                <div className="text-5xl md:text-7xl font-black text-orange-950 mb-4">{currentData.temperature.toFixed(0)}<span className="text-2xl md:text-4xl text-orange-600 font-bold ml-2">°C</span></div>
                                <p className="text-orange-700 font-medium text-lg">
                                    {currentData.temperature > 35 ? t("tempVeryHot") : currentData.temperature < 15 ? t("tempCold") : t("tempMild")}
                                </p>
                            </div>
                            <Sparkline data={chartData} dataKey="temperature" color="#f97316" />
                        </CardContent>
                    </Card>
                </div>

                {/* Middle Section: Chart & Alerts */}
                <div className="flex flex-col gap-6">
                    {/* Main Chart */}
                    <Card className="w-full rounded-3xl border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl md:text-2xl font-bold text-green-800">{t("flowPressureHistory")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[500px] w-full mt-4 bg-white rounded-2xl p-4 border border-green-50 shadow-inner">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorFlowMain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorPressureMain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#166534' }}
                                        />
                                        <Area yAxisId="left" type="monotone" dataKey="flow" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorFlowMain)" name={t("waterFlow")} isAnimationActive={false} />
                                        <Area yAxisId="right" type="monotone" dataKey="pressure" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPressureMain)" name={t("pressure")} isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Alerts */}
                    <Card className="rounded-3xl border-2 border-red-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl md:text-2xl font-bold text-red-800 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                {t("recentAlerts")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[400px] mt-2 space-y-3">
                            {alerts.length === 0 ? (
                                <div className="text-center text-gray-500 py-12 font-medium">
                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Droplets className="w-8 h-8 text-green-500" />
                                    </div>
                                    {t("allSystemsNormal")}
                                </div>
                            ) : (
                                alerts.map(alert => (
                                    <Dialog key={alert.id}>
                                        <DialogTrigger asChild>
                                            <button className={`w-full text-left p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${alert.type === 'destructive' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold ${alert.type === 'destructive' ? 'text-red-800' : 'text-yellow-800'}`}>{alert.type === 'destructive' ? t("criticalActionNeeded") : t("warningTitle")}</span>
                                                    <span className="text-xs text-gray-500 font-bold">{alert.time}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 items-start mt-1">
                                                    <p className="text-sm text-gray-700 font-medium line-clamp-1">{alert.message}</p>
                                                    {alert.recipients && alert.recipients.length > 0 && (
                                                        <span className="text-[10px] bg-green-100/50 text-green-800 px-2 py-0.5 rounded-full border border-green-200 mt-1 line-clamp-1 text-left font-semibold">
                                                            📱 {alert.recipients.length === 1 ? t("whatsappSentToOne") : t("whatsappSentTo", { count: alert.recipients.length })}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px] rounded-3xl pb-8">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-3 text-2xl pt-2">
                                                    <AlertTriangle className={`w-8 h-8 ${alert.type === 'destructive' ? 'text-red-600' : 'text-yellow-600'}`} />
                                                    {alert.type === 'destructive' ? t("criticalAlert") : t("systemWarning")}
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="py-2">
                                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{t("timeOfEvent")}</p>
                                                    <p className="text-lg font-extrabold text-gray-900">{alert.time}</p>
                                                </div>
                                                <p className="text-lg text-gray-800 font-medium leading-relaxed bg-red-50/50 p-4 border border-red-100 rounded-2xl mb-4">
                                                    {alert.message}
                                                </p>
                                                {alert.recipients && alert.recipients.length > 0 && (
                                                    <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                                                        <p className="text-xs text-green-700 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                                                            {t("whatsappNotificationSent")}
                                                        </p>
                                                        <ul className="space-y-1">
                                                            {alert.recipients.map((phone, idx) => (
                                                                <li key={idx} className="text-sm font-medium text-green-900 bg-white px-3 py-1.5 rounded-xl border border-green-100 flex items-center justify-between">
                                                                    <span>{phone}</span>
                                                                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 font-bold uppercase tracking-wider rounded-full">{t("delivered")}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <div className="mt-8 pt-6 border-t border-gray-100">
                                                    <p className="text-sm text-gray-600 font-medium flex items-start gap-2">
                                                        <Settings className="w-5 h-5 text-gray-400 shrink-0" />
                                                        {t("aiSuggestsCheck")}
                                                    </p>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {devMode && (
                    <details className="group border border-emerald-200 bg-white shadow-sm rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                        <summary className="flex items-center justify-between p-6 cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <Settings className="w-6 h-6 text-green-700" />
                                <h3 className="text-xl font-bold text-green-900">{t("advSimulatorTitle")} <span className="text-sm font-normal text-green-600 ml-2">{t("forTestingOnly")}</span></h3>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                            </span>
                        </summary>
                        <div className="p-6 border-t border-green-100 space-y-6">
                            {/* Simulation */}
                            <div>
                                <h4 className="font-semibold text-green-800 mb-3">{t("scenarioSimulator")}</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Button size="lg" variant={scenario === "NORMAL" ? "default" : "outline"} onClick={() => handleSetScenario("NORMAL", 0)} className={scenario === "NORMAL" ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                        {t("scenarioNormal")}
                                    </Button>
                                    <Button size="lg" variant={scenario === "LEAK_NIGHT" ? "destructive" : "outline"} onClick={() => handleSetScenario("LEAK_NIGHT", 1)}>
                                        {t("scenarioLeak")}
                                    </Button>
                                    <Button size="lg" variant={scenario === "BURST" ? "destructive" : "outline"} onClick={() => handleSetScenario("BURST", 2)}>
                                        {t("scenarioBurst")}
                                    </Button>
                                    <Button size="lg" variant={scenario === "OVER_IRR" ? "default" : "outline"} onClick={() => handleSetScenario("OVER_IRR", 3)} className={scenario === "OVER_IRR" ? "bg-yellow-500 text-white hover:bg-yellow-600" : ""}>
                                        {t("scenarioOverIrr")}
                                    </Button>
                                    <Button size="lg" variant={scenario === "UNDER_IRR" ? "destructive" : "outline"} onClick={() => handleSetScenario("UNDER_IRR", 4)}>
                                        {t("scenarioUnderIrr")}
                                    </Button>
                                    <Button size="lg" variant={scenario === "RAIN" ? "secondary" : "outline"} onClick={() => handleSetScenario("RAIN", 5)}>
                                        {t("scenarioRain")}
                                    </Button>
                                </div>
                            </div>

                            {/* Status indicators */}
                            <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-green-100">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${connected ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                    {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                    {connected ? t("connectionLive") : t("connectionOffline")}
                                </div>

                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${dbError ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                    {t("databaseStatus")}: {dbError ? t("errorStatus") : t("onlineStatus")} ({dbStats?.total_rows?.toLocaleString() ?? "0"} {t("records")})
                                </div>

                                {health && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-green-200 text-sm font-bold text-green-700">
                                        {t("backendEngine")}: {health.status}
                                    </div>
                                )}
                            </div>
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
