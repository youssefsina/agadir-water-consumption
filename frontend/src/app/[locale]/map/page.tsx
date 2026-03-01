"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, AlertTriangle, Droplets, Info, Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePipeline } from "@/hooks/use-pipeline";
import { useDevMode } from "@/hooks/use-dev-mode";
import { setAnomalyType } from "@/lib/api";
import dynamic from "next/dynamic";

const FarmMap = dynamic(() => import('./MapComponent'), { ssr: false });

type ZoneId = "north" | "orchard" | "south" | "west";

interface Zone {
    id: ZoneId;
    name: string;
    type: string;
    moisture: number;
    status: "optimal" | "dry" | "over-watered";
    bounds: [[number, number], [number, number]];
}

export default function FarmMapPage() {
    const t = useTranslations('map');
    const { current, stats, connected } = usePipeline(10);
    const { devMode } = useDevMode();

    const realMoisture = current?.sensor_data?.soil_moisture_pct ?? 45;
    const isPipeAnomaly = current?.prediction?.is_anomaly ?? false;
    const anomalyType = current?.prediction?.anomaly_type ?? "Normal";
    const isIrrigating = current?.sensor_data?.is_irrigating ?? 0;

    const [zones, setZones] = useState<Zone[]>([
        { id: "north", name: "North Field", type: "Corn", moisture: 45, status: "optimal", bounds: [[30.1552, -9.4265], [30.1561, -9.4251]] },
        { id: "orchard", name: "East Orchard", type: "Citrus", moisture: 38, status: "optimal", bounds: [[30.1548, -9.4249], [30.1561, -9.4238]] },
        { id: "south", name: "South Greenhouse", type: "Tomatoes", moisture: 50, status: "optimal", bounds: [[30.1542, -9.4265], [30.1550, -9.4256]] },
        { id: "west", name: "West Pasture", type: "Alfalfa", moisture: 42, status: "optimal", bounds: [[30.1542, -9.4254], [30.1550, -9.4245]] },
    ]);

    const [activeAnomaly, setActiveAnomaly] = useState<ZoneId | null>(null);

    useEffect(() => {
        if (!current) return;
        setZones(prev => prev.map((zone, idx) => {
            const offsets = [0, -7, 12, -3];
            let newMoisture = Math.max(0, Math.min(100, realMoisture + offsets[idx]));
            if (isPipeAnomaly && activeAnomaly === zone.id) {
                if (anomalyType === "Over_Irrigation") newMoisture = Math.min(100, newMoisture + 20);
                else if (anomalyType === "Pipe_Burst") newMoisture = Math.min(100, newMoisture + 30);
            }
            let status: Zone["status"] = "optimal";
            if (newMoisture < 30) status = "dry";
            else if (newMoisture > 70) status = "over-watered";
            return { ...zone, moisture: newMoisture, status };
        }));
    }, [current, realMoisture, isPipeAnomaly, anomalyType, activeAnomaly]);

    useEffect(() => {
        if (isPipeAnomaly) {
            if (anomalyType === "Night_Leak") setActiveAnomaly("north");
            else if (anomalyType === "Pipe_Burst") setActiveAnomaly("south");
            else if (anomalyType === "Over_Irrigation") setActiveAnomaly("orchard");
            else if (anomalyType === "Under_Irrigation") setActiveAnomaly("west");
            else setActiveAnomaly(null);
        } else {
            setActiveAnomaly(null);
        }
    }, [isPipeAnomaly, anomalyType]);

    const triggerAnomaly = async (zoneIdStr: string) => {
        const zoneId = zoneIdStr as ZoneId;
        const anomalyMap: Record<ZoneId, number> = { north: 1, orchard: 3, south: 2, west: 4 };
        try {
            if (activeAnomaly === zoneId) {
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



    return (
        <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col items-start gap-2">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 flex items-center gap-3">
                            <MapIcon className="w-10 h-10 text-emerald-600" />
                            {t('title')}
                        </h1>
                        <p className="text-xl text-green-700/90 font-medium">{t('desc')}</p>
                    </div>
                </div>

                {/* Important Alert */}
                {isPipeAnomaly && (
                    <div className="bg-red-100 border-2 border-red-500 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm">
                        <AlertTriangle className="w-12 h-12 text-red-600 shrink-0" />
                        <div>
                            <h3 className="text-3xl font-bold text-red-800 uppercase tracking-wide">{t('problemTitle')}</h3>
                            <p className="text-xl text-red-900 mt-2 font-medium" dangerouslySetInnerHTML={{ __html: t('problemDesc').replace('{anomalyType}', anomalyType).replace('{activeAnomaly}', String(activeAnomaly)) }} />
                            <p className="text-lg text-red-800 mt-1">{t('problemCheck')}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* The Map itself */}
                    <Card className="lg:col-span-3 rounded-3xl border-2 border-green-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-green-50/50 border-b border-green-100 pb-4">
                            <CardTitle className="text-green-800 text-2xl font-bold flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <span>{t('liveZoneMap')}</span>
                                <div className="flex gap-2 items-center text-base font-normal">
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-300 px-3 py-1 text-sm hover:bg-orange-200">{t('tooDry')}</Badge>
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 px-3 py-1 text-sm hover:bg-emerald-200">{t('perfect')}</Badge>
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1 text-sm hover:bg-blue-200">{t('tooWet')}</Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[400px] md:h-[500px]">
                            <FarmMap
                                zones={zones}
                                activeAnomaly={activeAnomaly}
                                onZoneClick={triggerAnomaly}
                                isIrrigating={isIrrigating}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4">
                        <Card className="rounded-3xl border-2 border-emerald-100 shadow-sm hover:shadow-md transition-all">
                            <CardHeader className="pb-3 border-b border-emerald-100">
                                <CardTitle className="text-emerald-800 text-xl font-bold flex items-center gap-2">
                                    <Droplets className="w-6 h-6 text-emerald-500" />
                                    {t('wateringStatus')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div>
                                    <p className="text-emerald-600 font-medium mb-1 text-sm uppercase tracking-wide">{t('flowRate')}</p>
                                    <p className="text-3xl font-extrabold text-emerald-950">{current?.sensor_data.flow_lpm.toFixed(0) || "0"} <span className="text-lg font-bold text-emerald-700">L/m</span></p>
                                </div>
                                <div className="border-t border-emerald-100 pt-3">
                                    <p className="text-emerald-600 font-medium mb-1 text-sm uppercase tracking-wide">{t('avgMoisture')}</p>
                                    <p className="text-3xl font-extrabold text-emerald-950">{current?.sensor_data.soil_moisture_pct.toFixed(0) || "0"}<span className="text-lg font-bold text-emerald-700">%</span></p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* System Diagnostics / Testing Tools */}
                {devMode && (
                    <details className="group border border-emerald-200 bg-white shadow-sm rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex items-center justify-between p-6 cursor-pointer bg-emerald-50/50 hover:bg-emerald-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <Info className="w-6 h-6 text-emerald-700" />
                                <h3 className="text-xl font-bold text-emerald-900">{t('simTools')} <span className="text-sm font-normal text-emerald-600 ml-2">{t('testingOnly')}</span></h3>
                            </div>
                            <span className="transition group-open:rotate-180">
                                <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                            </span>
                        </summary>
                        <div className="p-6 border-t border-emerald-100 space-y-6">
                            <div className="flex flex-col gap-3">
                                <p className="text-emerald-800 font-medium">{t('clickTrigger')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {zones.map(zone => (
                                        <Button key={`btn-${zone.id}`} size="lg" variant={activeAnomaly === zone.id ? "destructive" : "outline"} className={activeAnomaly !== zone.id ? "border-emerald-200 hover:bg-emerald-50" : ""} onClick={() => triggerAnomaly(zone.id)}>
                                            {activeAnomaly === zone.id ? t('fix') : t('break')}{zone.name}
                                        </Button>
                                    ))}
                                    <Button size="lg" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => { setAnomalyType(0); setActiveAnomaly(null); }}>
                                        {t('resetAll')}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-emerald-100">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${connected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                    {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                    {connected ? t('connLive') : t('connOffline')}
                                </div>
                            </div>
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
