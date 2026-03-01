"use client";

import { Activity, Gauge, Zap, AlertTriangle, PowerOff, Settings, Thermometer, Wifi, WifiOff, Droplets } from "lucide-react";
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

    let statusBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
    let statusDot = "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]";
    let statusText = "Working Perfect";

    if (motor.status === "WARNING") {
        statusBg = "bg-orange-100 text-orange-800 border-orange-300";
        statusDot = "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)] animate-pulse";
        statusText = "Needs Attention";
    } else if (motor.status === "OFFLINE") {
        statusBg = "bg-red-100 text-red-800 border-red-300";
        statusDot = "bg-red-500";
        statusText = "Turned Off";
    } else if (motor.status === "MAINTENANCE") {
        statusBg = "bg-blue-100 text-blue-800 border-blue-300";
        statusDot = "bg-blue-500";
        statusText = "Being Fixed";
    }

    const tempColor = motor.temperature > 70 ? 'text-red-600 font-extrabold' : motor.temperature > 50 ? 'text-orange-600 font-extrabold' : 'text-slate-700 font-extrabold';

    return (
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col items-center md:flex-row gap-8 shadow-sm hover:shadow-md transition-shadow">
            {/* Status Icon Indicator */}
            <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl w-32 h-32 relative">
                {motor.status === "ONLINE" || motor.status === "WARNING" ? (
                    <div className="w-14 h-14 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                ) : motor.status === "OFFLINE" ? (
                    <PowerOff className="w-12 h-12 text-slate-300" />
                ) : (
                    <Settings className="w-12 h-12 text-blue-400" />
                )}
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${statusDot}`}></div>
            </div>

            {/* Title / Name */}
            <div className="flex-1 text-center md:text-left">
                <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">PART CODE: {motor.id}</div>
                <h3 className="text-3xl font-extrabold text-slate-800 mb-3">{motor.name}</h3>
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border-2 ${statusBg}`}>
                    {statusText}
                </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full md:w-auto mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 md:border-l-2 border-slate-100 md:pl-8">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-sm text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5"><Gauge className="w-4 h-4" /> Pressure</span>
                    <div className="text-3xl font-black text-slate-800 mt-1">{motor.pressure.toFixed(1)} <span className="text-base font-bold text-slate-400">Bar</span></div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-sm text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5"><Zap className="w-4 h-4" /> Power Used</span>
                    <div className="text-3xl font-black text-slate-800 mt-1">{motor.power.toFixed(1)} <span className="text-base font-bold text-slate-400">kW</span></div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-sm text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5"><Thermometer className="w-4 h-4" /> Temp</span>
                    <div className={`text-3xl mt-1 ${tempColor}`}>{motor.temperature.toFixed(1)} <span className="text-base font-bold opacity-70">°C</span></div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-sm text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5"><Activity className="w-4 h-4" /> Health%</span>
                    <div className="text-3xl font-black text-slate-800 mt-1">{motor.efficiency}<span className="text-base font-bold text-slate-400">%</span></div>
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
            name: "Main Water Pump",
            status: sensorData ? (sensorData.is_irrigating ? "ONLINE" : "OFFLINE") : "OFFLINE",
            pressure: sensorData?.pressure_bar ?? 0,
            power: sensorData ? sensorData.flow_lpm * 0.38 : 0,
            temperature: sensorData?.temperature_c ?? 22,
            efficiency: prediction ? (prediction.is_anomaly ? Math.max(50, 100 - prediction.confidence * 50) : 100) : 0,
            uptime: stats ? `${stats.total_readings} ticks` : "0",
            lastService: "Live",
        },
        {
            id: "M02",
            name: "Field Sprinkler Engine",
            status: sensorData?.is_irrigating ? (sensorData.pressure_bar > 1.5 ? "ONLINE" : "WARNING") : "OFFLINE",
            pressure: sensorData ? sensorData.pressure_bar * 0.9 : 0,
            power: sensorData ? sensorData.flow_lpm * 0.25 : 0,
            temperature: sensorData ? sensorData.temperature_c + 3 : 22,
            efficiency: prediction ? (prediction.is_anomaly ? 76 : 95) : 0,
            uptime: stats ? `${stats.total_readings} ticks` : "0",
            lastService: "Pipeline",
        },
        {
            id: "M03",
            name: "Drip System Pump",
            status: prediction?.is_anomaly ? "WARNING" : (sensorData?.is_irrigating ? "ONLINE" : "OFFLINE"),
            pressure: sensorData ? sensorData.pressure_bar * 1.1 : 0,
            power: sensorData ? sensorData.flow_lpm * 0.45 : 0,
            temperature: sensorData ? sensorData.temperature_c + 8 : 22,
            efficiency: prediction ? (prediction.is_anomaly ? Math.max(60, 100 - prediction.confidence * 40) : 98) : 0,
            uptime: stats ? `${stats.total_readings} ticks` : "0",
            lastService: prediction?.anomaly_type || "Normal",
        },
        {
            id: "M04",
            name: "Emergency Backup Pump",
            status: prediction?.anomaly_type === "Pipe_Burst" ? "WARNING" : "OFFLINE",
            pressure: prediction?.anomaly_type === "Pipe_Burst" ? (sensorData?.pressure_bar ?? 0) * 0.5 : 0,
            power: prediction?.anomaly_type === "Pipe_Burst" ? (sensorData?.flow_lpm ?? 0) * 0.3 : 0,
            temperature: 22,
            efficiency: prediction?.anomaly_type === "Pipe_Burst" ? 65 : 100,
            uptime: "Standby",
            lastService: "Emergency only",
        },
    ];

    return (
        <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col items-start gap-2">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 flex items-center gap-3">
                            <Droplets className="w-10 h-10 text-emerald-600" />
                            Water Pumps Status
                        </h1>
                        <p className="text-xl text-green-700/90 font-medium">Check the health and activity of your water pumps.</p>
                    </div>
                </div>

                {/* Connection Status Banner */}
                <div className={`p-6 rounded-3xl border-2 flex items-center gap-4 ${connected ? "bg-emerald-100 border-emerald-300 text-emerald-900" : "bg-red-100 border-red-300 text-red-900"}`}>
                    {connected ? <Wifi className="w-8 h-8 text-emerald-600" /> : <WifiOff className="w-8 h-8 text-red-600" />}
                    <div>
                        <h2 className="text-2xl font-bold">{connected ? "Pumps Connected" : "Connection Lost"}</h2>
                        <p className="text-lg font-medium opacity-90">{connected ? "Getting live data from the fields right now." : "Cannot reach the pumps. Check internet connection."}</p>
                    </div>
                </div>

                {/* Motors List */}
                <div className="flex flex-col gap-6">
                    {motors.map((motor) => (
                        <MotorRow key={motor.id} motor={motor} />
                    ))}
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-white border-2 border-green-100 rounded-3xl flex items-start gap-4 text-green-900">
                    <AlertTriangle className="w-8 h-8 text-green-500 shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-xl">How to use this page?</h4>
                        <p className="text-lg mt-2 text-green-800">
                            This page shows you exactly what each pump is doing. If a pump is "Working Perfect", you don't need to do anything. If a pump says "Needs Attention", you should check it out as it might be struggling to push water or is getting too hot.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
