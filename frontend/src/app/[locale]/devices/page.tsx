"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Router, Radio, Activity, Battery, BatteryMedium, BatteryFull, BatteryWarning, Wifi, WifiOff, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
   getHealth,
   getPipelineStatus,
   getWebhookEvents,
   getWhatsAppLog,
   getStreamStatus,
   type HealthStatus,
   type PipelineStatus,
   type WebhookEvent,
   type WhatsAppLogEntry,
} from "@/lib/api";
import { useSupabaseData } from "@/hooks/use-supabase-data";

type DeviceStatus = "online" | "offline" | "warning";
type DeviceType = "Gateway" | "Flow Meter" | "Pressure Sensor" | "Soil Node";

interface Device {
   id: string;
   name: string;
   type: DeviceType;
   status: DeviceStatus;
   battery: number;
   signal: number;
   lastSeen: string;
   firmware: string;
}

export default function DevicesPage() {
   const t = useTranslations('devices');

   // Supabase direct reads (30s poll)
   const { stats: dbStats, error: dbError, lastFetchedAt: dbLastFetch } = useSupabaseData(10);

   const [health, setHealth] = useState<HealthStatus | null>(null);
   const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
   const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
   const [whatsappLog, setWhatsappLog] = useState<WhatsAppLogEntry[]>([]);
   const [streamStatus, setStreamStatus] = useState<{ active_connections: number; status: string } | null>(null);
   const [loading, setLoading] = useState(true);

   const fetchAll = async () => {
      try {
         setLoading(true);
         const [h, ps, we, wa, ss] = await Promise.all([
            getHealth().catch(() => null),
            getPipelineStatus().catch(() => null),
            getWebhookEvents({ limit: 20 }).catch(() => ({ events: [] })),
            getWhatsAppLog().catch(() => ({ log: [] })),
            getStreamStatus().catch(() => null),
         ]);
         setHealth(h);
         if (ps) setPipelineStatus(ps);
         setWebhookEvents((we as { events: WebhookEvent[] }).events);
         setWhatsappLog((wa as { log: WhatsAppLogEntry[] }).log);
         setStreamStatus(ss);
      } catch (err) {
         console.error("Devices fetch error", err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchAll();
      const timer = setInterval(fetchAll, 15000);
      return () => clearInterval(timer);
   }, []);

   const devices: Device[] = [
      {
         id: "SUPA-DB",
         name: "Supabase Database (Read-Only)",
         type: "Gateway",
         status: dbError ? "offline" : "online",
         battery: 100,
         signal: dbError ? -110 : -10,
         lastSeen: dbStats ? `${dbStats.total_rows.toLocaleString()} rows` : (dbError ? "Error" : "Connecting..."),
         firmware: "supabase.co",
      },
      {
         id: "SRV-MAIN",
         name: "FastAPI Backend Server",
         type: "Gateway",
         status: health?.status === "healthy" ? "online" : "offline",
         battery: 100,
         signal: health?.status === "healthy" ? -20 : -110,
         lastSeen: health ? `Uptime: ${Math.floor(health.uptime_seconds / 60)}m` : "Unknown",
         firmware: `v${health?.version || "?"}`,
      },
      {
         id: "SIM-IOT-1",
         name: "IoT Simulator (Pipeline)",
         type: "Flow Meter",
         status: pipelineStatus?.running ? "online" : "offline",
         battery: 100,
         signal: pipelineStatus?.running ? -20 : -110,
         lastSeen: pipelineStatus?.running
            ? `${pipelineStatus.stats.total_readings} ticks`
            : "Stopped",
         firmware: `${pipelineStatus?.interval_seconds || 30}s interval`,
      },
      {
         id: "WS-PIPE",
         name: "Pipeline WebSocket Hub",
         type: "Gateway",
         status: (pipelineStatus?.connected_clients || 0) > 0 ? "online" : "warning",
         battery: 100,
         signal: (pipelineStatus?.connected_clients || 0) > 0 ? -50 : -90,
         lastSeen: `${pipelineStatus?.connected_clients || 0} client(s)`,
         firmware: "wss://agadir-water-consumption-vejs.vercel.app",
      },
      {
         id: "RF-MODEL",
         name: "Random Forest AI Model",
         type: "Pressure Sensor",
         status: (health?.models_loaded?.length || 0) > 0 ? "online" : "offline",
         battery: 100,
         signal: (health?.models_loaded?.length || 0) > 0 ? -20 : -110,
         lastSeen: health?.models_loaded?.join(", ") || "No models",
         firmware: "model.pkl",
      },
      {
         id: "WA-SVC",
         name: "WhatsApp Service",
         type: "Soil Node",
         status: (whatsappLog.length > 0 || pipelineStatus?.stats.whatsapp_messages_sent) ? "online" : "warning",
         battery: 100,
         signal: -50,
         lastSeen: `${pipelineStatus?.stats.whatsapp_messages_sent || 0} msgs sent`,
         firmware: "Cloud API",
      },
   ];

   const onlineCount = devices.filter(d => d.status === "online").length;
   const warningCount = devices.filter(d => d.status === "warning").length;
   const offlineCount = devices.filter(d => d.status === "offline").length;

   const getBatteryIcon = (level: number) => {
      if (level > 80) return <BatteryFull className="w-5 h-5 text-green-500" />;
      if (level > 30) return <BatteryMedium className="w-5 h-5 text-green-500" />;
      if (level > 10) return <BatteryWarning className="w-5 h-5 text-yellow-500" />;
      return <Battery className="w-5 h-5 text-red-500" />;
   };

   const getSignalBars = (dbm: number) => {
      const bars = dbm >= -50 ? 4 : dbm >= -75 ? 3 : dbm >= -90 ? 2 : dbm >= -100 ? 1 : 0;
      return (
         <div className="flex items-end gap-[2px] h-5" title={`${dbm} dBm`}>
            {[1, 2, 3, 4].map((bar) => (
               <div
                  key={bar}
                  className={`w-1.5 rounded-t-sm ${bar <= bars ? (bars > 2 ? 'bg-green-500' : bars === 2 ? 'bg-yellow-500' : 'bg-orange-500') : 'bg-gray-200'}`}
                  style={{ height: `${bar * 25}%` }}
               />
            ))}
         </div>
      );
   };

   const getStatusBadge = (status: DeviceStatus) => {
      if (status === "online") return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"><Wifi className="w-3 h-3 ltr:mr-1 rtl:ml-1" /> {t('onlineDevices')}</Badge>;
      if (status === "warning") return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"><AlertTriangle className="w-3 h-3 ltr:mr-1 rtl:ml-1" /> {t('warnings')}</Badge>;
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"><WifiOff className="w-3 h-3 ltr:mr-1 rtl:ml-1" /> {t('offlineDevices')}</Badge>;
   };

   return (
      <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
         <div className="max-w-5xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div className="flex flex-col items-start gap-2">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 flex items-center gap-3">
                     <Router className="w-10 h-10 text-slate-600" />
                     System Health
                  </h1>
                  <p className="text-xl text-green-700/90 font-medium">Check the connection status of your farm&apos;s smart equipment.</p>
               </div>
               <Button size="lg" variant="outline" className="border-green-300 text-green-800 bg-white hover:bg-green-50 shadow-sm rounded-xl text-base font-bold px-6 py-6" onClick={fetchAll} disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 ltr:mr-2 rtl:ml-2 animate-spin" /> : <RefreshCw className="w-5 h-5 ltr:mr-2 rtl:ml-2" />}
                  {t('pingAll')}
               </Button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Card className="rounded-3xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                     <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Router className="w-8 h-8 text-slate-600" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Parts</p>
                        <p className="text-4xl font-extrabold text-slate-800">{devices.length}</p>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-3xl border-2 border-green-200 shadow-sm hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                     <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                        <Activity className="w-8 h-8 text-green-600" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-green-600 uppercase tracking-wide">Working Perfect</p>
                        <p className="text-4xl font-extrabold text-green-700">{onlineCount}</p>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-3xl border-2 border-yellow-200 shadow-sm hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                     <div className="w-14 h-14 rounded-2xl bg-yellow-100 flex items-center justify-center shrink-0">
                        <BatteryWarning className="w-8 h-8 text-yellow-600" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-yellow-600 uppercase tracking-wide">Needs Attention</p>
                        <p className="text-4xl font-extrabold text-yellow-700">{warningCount}</p>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-3xl border-2 border-red-200 shadow-sm hover:shadow-md transition-all bg-white">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                     <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                        <WifiOff className="w-8 h-8 text-red-600" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-red-600 uppercase tracking-wide">Offline / Broken</p>
                        <p className="text-4xl font-extrabold text-red-700">{offlineCount}</p>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* Devices List Desktop */}
            <Card className="rounded-3xl border-2 border-green-200 shadow-sm bg-white overflow-hidden hidden md:block">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="text-sm text-green-800 bg-green-50/80 border-b border-green-100 uppercase tracking-wider font-bold">
                        <tr>
                           <th className="px-8 py-6 rounded-tl-lg">Part Name</th>
                           <th className="px-8 py-6">Status</th>
                           <th className="px-8 py-6">Connection Strength</th>
                           <th className="px-8 py-6 rounded-tr-lg">Current Activity</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-green-50 text-base">
                        {devices.map((device) => {
                           // Make names friendlier
                           let friendlyName = device.name;
                           if (device.id === "SUPA-DB") friendlyName = "Farm Data Storage";
                           if (device.id === "SRV-MAIN") friendlyName = "Main Farm Brain (Server)";
                           if (device.id === "SIM-IOT-1") friendlyName = "Field Sensors Hub";
                           if (device.id === "WS-PIPE") friendlyName = "Live Connection System";
                           if (device.id === "RF-MODEL") friendlyName = "AI Smart Predictor";
                           if (device.id === "WA-SVC") friendlyName = "WhatsApp Alert System";

                           return (
                              <tr key={device.id} className="hover:bg-green-50/50 transition-colors">
                                 <td className="px-8 py-5">
                                    <div className="font-bold text-green-950 text-lg">{friendlyName}</div>
                                    <div className="text-sm text-green-600/80 mt-1 flex items-center gap-2">
                                       {device.type === 'Gateway' && <Router className="w-4 h-4 text-purple-500" />}
                                       {device.type === 'Flow Meter' && <Activity className="w-4 h-4 text-blue-500" />}
                                       {device.type === 'Pressure Sensor' && <Radio className="w-4 h-4 text-amber-500" />}
                                       {device.type === 'Soil Node' && <Radio className="w-4 h-4 text-emerald-500" />}
                                       {device.type}
                                    </div>
                                 </td>
                                 <td className="px-8 py-5">
                                    <div className="scale-110 origin-left inline-block">
                                       {getStatusBadge(device.status)}
                                    </div>
                                 </td>
                                 <td className="px-8 py-5">{getSignalBars(device.signal)}</td>
                                 <td className="px-8 py-5 text-slate-700 font-medium">{device.lastSeen}</td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </Card>

            {/* Mobile view of devices */}
            <div className="md:hidden space-y-4">
               {devices.map((device) => {
                  let friendlyName = device.name;
                  if (device.id === "SUPA-DB") friendlyName = "Farm Data Storage";
                  if (device.id === "SRV-MAIN") friendlyName = "Main Farm Brain (Server)";
                  if (device.id === "SIM-IOT-1") friendlyName = "Field Sensors Hub";
                  if (device.id === "WS-PIPE") friendlyName = "Live Connection System";
                  if (device.id === "RF-MODEL") friendlyName = "AI Smart Predictor";
                  if (device.id === "WA-SVC") friendlyName = "WhatsApp Alert System";

                  return (
                     <Card key={device.id} className="rounded-2xl border-2 border-green-100 bg-white p-4">
                        <div className="flex justify-between items-start mb-3">
                           <div className="font-bold text-green-950 text-xl">{friendlyName}</div>
                           <div className="scale-110 origin-right inline-block">
                              {getStatusBadge(device.status)}
                           </div>
                        </div>
                        <div className="flex flex-col gap-3 text-base text-slate-700">
                           <div className="flex justify-between border-b pb-2">
                              <span className="text-slate-500">Connection</span>
                              {getSignalBars(device.signal)}
                           </div>
                           <div className="flex justify-between border-b pb-2">
                              <span className="text-slate-500">Current Activity</span>
                              <span className="font-medium text-right">{device.lastSeen}</span>
                           </div>
                        </div>
                     </Card>
                  )
               })}
            </div>

         </div>
      </div>
   );
}
