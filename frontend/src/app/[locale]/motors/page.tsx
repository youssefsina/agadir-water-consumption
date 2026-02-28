"use client";

import { useState, useEffect } from "react";
import { Activity, Gauge, Zap, AlertTriangle, PowerOff, Settings, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface MotorStatus {
    id: string;
    name: string;
    status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "WARNING";
    pressure: number; // Bar
    power: number; // kW
    temperature: number; // °C
    efficiency: number; // %
    uptime: string;
    lastService: string;
}

const mockMotors: MotorStatus[] = [
    {
        id: "M01",
        name: "Main Pump Station Alpha",
        status: "ONLINE",
        pressure: 4.2,
        power: 45.5,
        temperature: 42,
        efficiency: 94,
        uptime: "14d 6h",
        lastService: "2023-10-15",
    },
    {
        id: "M02",
        name: "Secondary Booster Beta",
        status: "ONLINE",
        pressure: 3.8,
        power: 32.1,
        temperature: 45,
        efficiency: 91,
        uptime: "30d 12h",
        lastService: "2023-09-20",
    },
    {
        id: "M03",
        name: "Irrigation Feeder Gamma",
        status: "WARNING",
        pressure: 2.1,
        power: 58.0,
        temperature: 78,
        efficiency: 76,
        uptime: "5d 2h",
        lastService: "2023-11-01",
    },
    {
        id: "M04",
        name: "Reserve Pump Delta",
        status: "OFFLINE",
        pressure: 0.0,
        power: 0.0,
        temperature: 22,
        efficiency: 0,
        uptime: "0h",
        lastService: "2023-08-10",
    }
];

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

            {/* Visual Icon (Simple Motor) */}
            <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-full w-24 h-24 relative">
                {motor.status === "ONLINE" || motor.status === "WARNING" ? (
                    <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                ) : motor.status === "OFFLINE" ? (
                    <PowerOff size={32} className="text-slate-300" />
                ) : (
                    <Settings size={32} className="text-blue-400" />
                )}
                {/* Status Indicator Dot */}
                <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${statusDot}`}></div>
            </div>

            {/* Core Info */}
            <div className="flex-1 text-center md:text-left">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">UNIT {motor.id}</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{motor.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg}`}>
                    {statusText}
                </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                {/* Pressure */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                        <Gauge size={12} /> {t('pressure')}
                    </span>
                    <div className="text-lg font-bold text-slate-800">
                        {motor.pressure.toFixed(1)} <span className="text-xs font-normal text-slate-500">Bar</span>
                    </div>
                </div>

                {/* Power */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                        <Zap size={12} /> {t('power')}
                    </span>
                    <div className="text-lg font-bold text-slate-800">
                        {motor.power.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
                    </div>
                </div>

                {/* Temp */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                        <Thermometer size={12} /> {t('temp')}
                    </span>
                    <div className={`text-lg font-bold ${tempColor}`}>
                        {motor.temperature.toFixed(1)} <span className="text-xs font-normal opacity-70">°C</span>
                    </div>
                </div>

                {/* Efficiency / Health */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <span className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                        <Activity size={12} /> {t('efficiency')}
                    </span>
                    <div className="text-lg font-bold text-slate-800">
                        {motor.efficiency}<span className="text-xs font-normal text-slate-500">%</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default function MotorsPage() {
    const t = useTranslations('motors');
    const [motors, setMotors] = useState<MotorStatus[]>(mockMotors);

    useEffect(() => {
        // Simulate real-time data fluctuations
        const interval = setInterval(() => {
            setMotors(currentMotors => currentMotors.map(motor => {
                if (motor.status === "OFFLINE" || motor.status === "MAINTENANCE") return motor;

                const pressureFluctuation = (Math.random() - 0.5) * 0.2;
                const tempFluctuation = (Math.random() - 0.5) * 1.5;
                const powerFluctuation = (Math.random() - 0.5) * 1.0;

                return {
                    ...motor,
                    pressure: Math.max(0, motor.pressure + pressureFluctuation),
                    temperature: Math.max(20, motor.temperature + tempFluctuation),
                    power: Math.max(0, motor.power + powerFluctuation),
                };
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                        <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="outline" className="w-full md:w-auto border-slate-300">
                            Download Logs
                        </Button>
                    </div>
                </div>

                {/* Motors List */}
                <div className="flex flex-col gap-4">
                    {motors.map((motor) => (
                        <MotorRow key={motor.id} motor={motor} />
                    ))}
                </div>

                {/* Simplified Rules note */}
                <div className="mt-8 p-4 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-4 text-blue-900 overflow-hidden relative">
                    <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-sm">System Note</h4>
                        <p className="text-sm mt-1 opacity-80">
                            Pumps automatically enter a WARNING state if core temperatures exceed 75°C.
                            The master system will enforce an emergency OFFLINE state at 85°C to prevent hardware damage.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
