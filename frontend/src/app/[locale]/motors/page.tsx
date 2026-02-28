"use client";

import { Activity, Gauge, Zap, AlertTriangle, PowerOff, Settings, Thermometer, Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePipeline } from "@/hooks/use-pipeline";

interface MotorStatus {
    id: string;
    name: string;
    status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "WARNING";
    pressure: number;
    power: number;
    temperature: number;
    efficiency: number;
    uptime: string;
    lastService: string;
}

const MotorRow = ({ motor }: { motor: MotorStatus }) => {
    const t = useTranslations('motors');

    let statusBg = "bg-green-100 text-green-700 border-green-200";
    let statusDot = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
    let statusText = t('online');

    if (motor.status === "WARNING") {
        statusBg = "bg-orange-100 text-orange-700 border-orange-200";
        statusDot = "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse";
        statusText = t('warning');
    } else if (motor.status === "OFFLINE") {
        statusBg = "bg-red-100 text-red-700 border-red-200";
        statusDot = "bg-red-500";
        statusText = t('offline');
    } else if (motor.status === "MAINTENANCE") {
        statusBg = "bg-blue-100 text-blue-700 border-blue-200";
        statusDot = "bg-blue-500";
        statusText = t('maintenance');
    }

    const tempColor = motor.temperature > 70 ? 'text-red-500 font-bold' : motor.temperature > 50 ? 'text-orange-500 font-bold' : 'text-slate-600';

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 flex flex-col items-center md:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-full w-24 h-24 relative">
                {motor.status === "ONLINE" || motor.status === "WARNING" ? (
                    <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                ) : motor.status === "OFFLINE" ? (
                    <PowerOff size={32} className="text-slate-300" />
                ) : (
                    <Settings size={32} className="text-blue-400" />
                )}
                <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${statusDot}`}></div>
            </div>

            <div className="flex-1 text-center md:text-left">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">UNIT {motor.id}</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{motor.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg}`}>
                    {statusText}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Gauge size={12} /> {t('pressure')}</span>
                    <div className="text-lg font-bold text-slate-800">{motor.pressure.toFixed(1)} <span className="text-xs font-normal text-slate-500">Bar</span></div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Zap size={12} /> {t('power')}</span>
                    <div className="text-lg font-bold text-slate-800">{motor.power.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span></div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Thermometer size={12} /> {t('temp')}</span>
                    <div className={`text-lg font-bold ${tempColor}`}>{motor.temperature.toFixed(1)} <span className="text-xs font-normal opacity-70">°C</span></div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Activity size={12} /> {t('efficiency')}</span>
                    <div className="text-lg font-bold text-slate-800">{motor.efficiency}<span className="text-xs font-normal text-slate-500">%</span></div>
                </div>
            </div>
        </div>
    );
};

export default function MotorsPage() {
    const t = useTranslations('motors');
    const { current, stats, connected } = usePipeline(10);

    const sensorData = current?.sensor_data;
    const prediction = current?.prediction;

    const motors: MotorStatus[] = [
        {
            id: "M01",
            name: "Main Pump Station Alpha",
            status: sensorData ? (sensorData.is_irrigating ? "ONLINE" : "OFFLINE") : "OFFLINE",
            pressure: sensorData?.pressure_bar ?? 0,
            power: sensorData ? sensorData.flow_lpm * 0.38 : 0,
            temperature: sensorData?.temperature_c ?? 22,
            efficiency: prediction ? (prediction.is_anomaly ? Math.max(50, 100 - prediction.confidence * 50) : 94) : 0,
            uptime: stats ? `${stats.total_readings} ticks` : "0",
            lastService: "Live",
        },
        {
            id: "M02",
            name: "Secondary Booster Beta",
            status: sensorData?.is_irrigating ? (sensorData.pressure_bar > 1.5 ? "ONLINE" : "WARNING") : "OFFLINE",
            pressure: sensorData ? sensorData.pressure_bar * 0.9 : 0,
            power: sensorData ? sensorData.flow_lpm * 0.25 : 0,
            temperature: sensorData ? sensorData.temperature_c + 3 : 22,
            efficiency: prediction ? (prediction.is_anomaly ? 76 : 91) : 0,
            uptime: stats ? `${stats.total_readings} ticks` : "0",
            lastService: "Pipeline",
        },
        {
            id: "M03",
            name: "Irrigation Feeder Gamma",
            status: prediction?.is_anomaly ? "WARNING" : (sensorData?.is_irrigating ? "ONLINE" : "OFFLINE"),
            pressure: sensorData ? sensorData.pressure_bar * 1.1 : 0,
            power: sensorData ? sensorData.flow_lpm * 0.45 : 0,
            temperature: sensorData ? sensorData.temperature_c + 8 : 22,
            efficiency: prediction ? (prediction.is_anomaly ? Math.max(60, 100 - prediction.confidence * 40) : 88) : 0,
            uptime: stats ? `${stats.total_readings} ticks` : "0",
            lastService: prediction?.anomaly_type || "Normal",
        },
        {
            id: "M04",
            name: "Reserve Pump Delta",
            status: prediction?.anomaly_type === "Pipe_Burst" ? "WARNING" : "OFFLINE",
            pressure: prediction?.anomaly_type === "Pipe_Burst" ? (sensorData?.pressure_bar ?? 0) * 0.5 : 0,
            power: prediction?.anomaly_type === "Pipe_Burst" ? (sensorData?.flow_lpm ?? 0) * 0.3 : 0,
            temperature: 22,
            efficiency: prediction?.anomaly_type === "Pipe_Burst" ? 65 : 0,
            uptime: "Standby",
            lastService: "Emergency only",
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                        <p className="text-slate-500 mt-1">{t('subtitle')} — Live from IoT pipeline</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${connected
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {connected ? "Live" : "Disconnected"}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {motors.map((motor) => (
                        <MotorRow key={motor.id} motor={motor} />
                    ))}
                </div>

                <div className="mt-8 p-4 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-4 text-blue-900 overflow-hidden relative">
                    <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-sm">Real-Time Data</h4>
                        <p className="text-sm mt-1 opacity-80">
                            Motor metrics are derived from the live IoT pipeline. Power is estimated from flow rate.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
