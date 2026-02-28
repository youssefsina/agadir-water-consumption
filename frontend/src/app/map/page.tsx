"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, AlertTriangle, Droplets, Info, Wifi, WifiOff } from "lucide-react";
import { usePipeline } from "@/hooks/use-pipeline";
import { setAnomalyType } from "@/lib/api";

type ZoneId = "north" | "orchard" | "south" | "west";

interface Zone {
    id: ZoneId;
    name: string;
    type: string;
    moisture: number;
    status: "optimal" | "dry" | "over-watered";
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function FarmMapPage() {
    // Real-time pipeline connection
    const { current, stats, connected } = usePipeline(10);

    // Derive soil moisture from real sensor data
    const realMoisture = current?.sensor_data?.soil_moisture_pct ?? 45;
    const isPipeAnomaly = current?.prediction?.is_anomaly ?? false;
    const anomalyType = current?.prediction?.anomaly_type ?? "Normal";
    const isIrrigating = current?.sensor_data?.is_irrigating ?? 0;

    const [zones, setZones] = useState<Zone[]>([
        { id: "north", name: "North Field", type: "Corn", moisture: 45, status: "optimal", x: 10, y: 10, width: 35, height: 35 },
        { id: "orchard", name: "East Orchard", type: "Citrus", moisture: 38, status: "optimal", x: 55, y: 10, width: 35, height: 45 },
        { id: "south", name: "South Greenhouse", type: "Tomatoes", moisture: 50, status: "optimal", x: 10, y: 55, width: 45, height: 35 },
        { id: "west", name: "West Pasture", type: "Alfalfa", moisture: 42, status: "optimal", x: 65, y: 65, width: 25, height: 25 },
    ]);

    const [activeAnomaly, setActiveAnomaly] = useState<ZoneId | null>(null);

    // Update zones from pipeline data
    useEffect(() => {
        if (!current) return;

        setZones(prev => prev.map((zone, idx) => {
            // Each zone derives from real moisture with slight offsets
            const offsets = [0, -7, 12, -3];
            let newMoisture = Math.max(0, Math.min(100, realMoisture + offsets[idx]));

            // If anomaly in specific zone
            if (isPipeAnomaly && activeAnomaly === zone.id) {
                if (anomalyType === "Over_Irrigation") {
                    newMoisture = Math.min(100, newMoisture + 20);
                } else if (anomalyType === "Pipe_Burst") {
                    newMoisture = Math.min(100, newMoisture + 30);
                }
            }

            let status: Zone["status"] = "optimal";
            if (newMoisture < 30) status = "dry";
            else if (newMoisture > 70) status = "over-watered";

            return { ...zone, moisture: newMoisture, status };
        }));
    }, [current, realMoisture, isPipeAnomaly, anomalyType, activeAnomaly]);

    // Detect which zone the anomaly affects
    useEffect(() => {
        if (isPipeAnomaly) {
            // Map anomaly types to zones for visualization
            if (anomalyType === "Night_Leak") setActiveAnomaly("north");
            else if (anomalyType === "Pipe_Burst") setActiveAnomaly("south");
            else if (anomalyType === "Over_Irrigation") setActiveAnomaly("orchard");
            else if (anomalyType === "Under_Irrigation") setActiveAnomaly("west");
            else setActiveAnomaly(null);
        } else {
            setActiveAnomaly(null);
        }
    }, [isPipeAnomaly, anomalyType]);

    // Trigger anomaly via backend
    const triggerAnomaly = async (zoneId: ZoneId) => {
        const anomalyMap: Record<ZoneId, number> = {
            north: 1, // Night_Leak
            orchard: 3, // Over_Irrigation
            south: 2, // Pipe_Burst
            west: 4, // Under_Irrigation
        };
        try {
            if (activeAnomaly === zoneId) {
                // Reset to normal
                await setAnomalyType(0);
                setActiveAnomaly(null);
            } else {
                await setAnomalyType(anomalyMap[zoneId]);
                setActiveAnomaly(zoneId);
            }
        } catch (e) {
            console.error("Failed to trigger anomaly", e);
        }
    };

    const getZoneColor = (status: Zone["status"]) => {
        switch (status) {
            case "dry": return "bg-orange-200/80 border-orange-400";
            case "optimal": return "bg-green-200/80 border-green-400";
            case "over-watered": return "bg-blue-300/80 border-blue-500";
        }
    };

    const getTextColor = (status: Zone["status"]) => {
        switch (status) {
            case "dry": return "text-orange-900";
            case "optimal": return "text-green-900";
            case "over-watered": return "text-blue-900";
        }
    };

    return (
        <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                            <MapIcon className="w-8 h-8 text-green-600" />
                            Interactive Farm Map
                        </h1>
                        <p className="text-green-700/80 mt-1">Soil moisture from live IoT pipeline — zones react to real anomalies</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${connected
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {connected ? "Live" : "Offline"}
                        </div>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 px-3 py-1">Dry (&lt;30%)</Badge>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 px-3 py-1">Optimal (30-70%)</Badge>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1">Over-watered (&gt;70%)</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="lg:col-span-3 border-green-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-green-50/50 border-b border-green-100 pb-3">
                            <CardTitle className="text-green-800 text-lg flex justify-between items-center">
                                <span>Live Zone Map</span>
                                {isPipeAnomaly && (
                                    <span className="flex items-center gap-2 text-red-600 text-sm animate-pulse bg-red-50 px-3 py-1 rounded-full">
                                        <AlertTriangle className="w-4 h-4" /> {anomalyType} detected!
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="relative w-full aspect-video bg-[#e8eedd] overflow-hidden">
                                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#c5d1b3 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                                {/* Central Pump */}
                                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full z-20 flex items-center justify-center border-4 shadow-lg ${isIrrigating ? "bg-green-700 border-green-400" : "bg-gray-800 border-gray-300"}`}>
                                    <Droplets className={`w-6 h-6 ${isIrrigating ? "text-green-200" : "text-blue-400"}`} />
                                </div>

                                {/* Pipelines */}
                                <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                                    <line x1="50%" y1="50%" x2="27.5%" y2="27.5%"
                                        className={`${activeAnomaly === "north" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={activeAnomaly === "north" ? "none" : "5,5"} />
                                    <line x1="50%" y1="50%" x2="72.5%" y2="32.5%"
                                        className={`${activeAnomaly === "orchard" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={activeAnomaly === "orchard" ? "none" : "5,5"} />
                                    <line x1="50%" y1="50%" x2="32.5%" y2="72.5%"
                                        className={`${activeAnomaly === "south" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={activeAnomaly === "south" ? "none" : "5,5"} />
                                    <line x1="50%" y1="50%" x2="77.5%" y2="77.5%"
                                        className={`${activeAnomaly === "west" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={activeAnomaly === "west" ? "none" : "5,5"} />
                                </svg>

                                {/* Farm Zones */}
                                {zones.map(zone => (
                                    <div
                                        key={zone.id}
                                        className={`absolute border-2 rounded-xl flex flex-col items-center justify-center p-2 shadow-sm transition-all duration-500 z-10 ${getZoneColor(zone.status)} hover:scale-[1.02] cursor-pointer hover:z-30`}
                                        style={{
                                            left: `${zone.x}%`,
                                            top: `${zone.y}%`,
                                            width: `${zone.width}%`,
                                            height: `${zone.height}%`,
                                        }}
                                    >
                                        <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-center shadow-sm w-full max-w-[90%]">
                                            <p className={`font-bold text-sm ${getTextColor(zone.status)}`}>{zone.name}</p>
                                            <p className="text-xs text-gray-600 mb-1">{zone.type}</p>
                                            <div className="flex items-center justify-center gap-1 font-mono text-sm">
                                                <Droplets className={`w-3 h-3 ${getTextColor(zone.status)}`} />
                                                <span className={getTextColor(zone.status)}>{zone.moisture.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        {activeAnomaly === zone.id && (
                                            <div className="absolute inset-0 bg-red-500/10 rounded-xl animate-pulse flex items-center justify-center pointer-events-none"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4">
                        <Card className="border-green-200 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-green-800 text-md flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Trigger Anomalies (Backend)
                                </CardTitle>
                                <CardDescription>Sends commands to the real IoT simulator on the backend.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {zones.map(zone => (
                                    <Button
                                        key={`btn-${zone.id}`}
                                        variant={activeAnomaly === zone.id ? "destructive" : "outline"}
                                        className="w-full justify-start border-green-200"
                                        onClick={() => triggerAnomaly(zone.id)}
                                    >
                                        {activeAnomaly === zone.id ? "Fix: " : "Trigger: "}{zone.name}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    className="w-full justify-start border-green-200 text-green-700"
                                    onClick={() => { setAnomalyType(0); setActiveAnomaly(null); }}
                                >
                                    🔄 Reset to Normal
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Live sensor readout */}
                        {current && (
                            <Card className="border-green-200 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-800 text-sm">Live Sensor Readout</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs space-y-1 text-green-700">
                                    <div className="flex justify-between"><span>Flow:</span><span className="font-mono font-bold">{current.sensor_data.flow_lpm.toFixed(1)} L/min</span></div>
                                    <div className="flex justify-between"><span>Pressure:</span><span className="font-mono font-bold">{current.sensor_data.pressure_bar.toFixed(2)} Bar</span></div>
                                    <div className="flex justify-between"><span>Soil Moisture:</span><span className="font-mono font-bold">{current.sensor_data.soil_moisture_pct.toFixed(1)}%</span></div>
                                    <div className="flex justify-between"><span>Temperature:</span><span className="font-mono font-bold">{current.sensor_data.temperature_c.toFixed(1)}°C</span></div>
                                    <div className="flex justify-between"><span>AI Prediction:</span><span className="font-mono font-bold">{current.prediction.anomaly_type}</span></div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
                            <CardContent className="p-4 flex gap-3 items-start">
                                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-sm text-blue-900">Real-Time Integration</h4>
                                    <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                                        Zones now reflect real soil moisture from the backend IoT simulator.
                                        Triggering an anomaly sends a command to the backend, and the AI model detects it.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
