"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, AlertTriangle, Droplets, Info } from "lucide-react";

type ZoneId = "north" | "orchard" | "south" | "west";

interface Zone {
    id: ZoneId;
    name: string;
    type: string;
    moisture: number; // 0-100%
    status: "optimal" | "dry" | "over-watered";
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function FarmMapPage() {
    const [zones, setZones] = useState<Zone[]>([
        { id: "north", name: "North Field", type: "Corn", moisture: 45, status: "optimal", x: 10, y: 10, width: 35, height: 35 },
        { id: "orchard", name: "East Orchard", type: "Citrus", moisture: 20, status: "dry", x: 55, y: 10, width: 35, height: 45 },
        { id: "south", name: "South Greenhouse", type: "Tomatoes", moisture: 85, status: "over-watered", x: 10, y: 55, width: 45, height: 35 },
        { id: "west", name: "West Pasture", type: "Alfalfa", moisture: 55, status: "optimal", x: 65, y: 65, width: 25, height: 25 },
    ]);

    const [leakActive, setLeakActive] = useState<ZoneId | null>(null);

    // Simulate moisture changes
    useEffect(() => {
        const interval = setInterval(() => {
            setZones(prev => prev.map(zone => {
                let newMoisture = zone.moisture;
                if (leakActive === zone.id) {
                    // Rapidly increase moisture in leak area
                    newMoisture = Math.min(100, zone.moisture + 5);
                } else {
                    // Slow evaporation
                    newMoisture = Math.max(0, zone.moisture - 0.5);
                }

                let newStatus: Zone["status"] = "optimal";
                if (newMoisture < 30) newStatus = "dry";
                else if (newMoisture > 70) newStatus = "over-watered";

                return { ...zone, moisture: newMoisture, status: newStatus };
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, [leakActive]);

    const triggerLeak = (zoneId: ZoneId) => {
        setLeakActive(prev => prev === zoneId ? null : zoneId);
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
                        <p className="text-green-700/80 mt-1">Spatial visualization of soil moisture and irrigation pipelines</p>
                    </div>

                    <div className="flex gap-2">
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
                                {leakActive && (
                                    <span className="flex items-center gap-2 text-red-600 text-sm animate-pulse bg-red-50 px-3 py-1 rounded-full">
                                        <AlertTriangle className="w-4 h-4" /> Pipeline leak detected!
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="relative w-full aspect-video bg-[#e8eedd] overflow-hidden">
                                {/* Simulated Grid Background */}
                                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#c5d1b3 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                                {/* Central Pump Station */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-800 rounded-full z-20 flex items-center justify-center border-4 border-gray-300 shadow-lg">
                                    <Droplets className="w-6 h-6 text-blue-400" />
                                </div>

                                {/* Main Pipelines */}
                                <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                                    {/* North Pipe */}
                                    <line x1="50%" y1="50%" x2="27.5%" y2="27.5%"
                                        className={`stroke-8 ${leakActive === "north" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={leakActive === "north" ? "none" : "5,5"} />
                                    {/* East Pipe */}
                                    <line x1="50%" y1="50%" x2="72.5%" y2="32.5%"
                                        className={`stroke-8 ${leakActive === "orchard" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={leakActive === "orchard" ? "none" : "5,5"} />
                                    {/* South Pipe */}
                                    <line x1="50%" y1="50%" x2="32.5%" y2="72.5%"
                                        className={`stroke-8 ${leakActive === "south" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={leakActive === "south" ? "none" : "5,5"} />
                                    {/* West Pipe */}
                                    <line x1="50%" y1="50%" x2="77.5%" y2="77.5%"
                                        className={`stroke-8 ${leakActive === "west" ? "stroke-red-500 animate-pulse" : "stroke-blue-400/60"}`}
                                        strokeWidth="4" strokeDasharray={leakActive === "west" ? "none" : "5,5"} />
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
                                        {leakActive === zone.id && (
                                            <div className="absolute inset-0 bg-red-500/10 rounded-xl animate-pulse flex items-center justify-center pointer-events-none">
                                            </div>
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
                                    Simulator Controls
                                </CardTitle>
                                <CardDescription>Trigger pipeline events to watch the map react.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {zones.map(zone => (
                                    <Button
                                        key={`btn-\${zone.id}`}
                                        variant={leakActive === zone.id ? "destructive" : "outline"}
                                        className="w-full justify-start border-green-200"
                                        onClick={() => triggerLeak(zone.id)}
                                    >
                                        {leakActive === zone.id ? "Fix Burst in " : "Simulate Burst in "} {zone.name}
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
                            <CardContent className="p-4 flex gap-3 items-start">
                                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-sm text-blue-900">Why this matters?</h4>
                                    <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                                        Spatial context helps operators quickly locate issues. When a pressure drop is detected by the AI,
                                        highlighting the exact pipeline segment saves hours of manual searching across a massive farm.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div >
    );
}
