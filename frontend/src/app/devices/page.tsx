"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Router, Radio, Activity, Battery, BatteryMedium, BatteryFull, BatteryWarning, Wifi, WifiOff, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
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
   const [health, setHealth] = useState<HealthStatus | null>(null);
   const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
   const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
   const [whatsappLog, setWhatsappLog] = useState<WhatsAppLogEntry[]>([]);
   const [streamStatus, setStreamStatus] = useState<{ active_connections: number; status: string } | null>(null);
   const [loading, setLoading] = useState(true);
   const [lastRefresh, setLastRefresh] = useState<string>("");

   const fetchAll = async () => {
      try {
         setLoading(true);
         const [h, ps, we, wa, ss] = await Promise.all([
            getHealth(),
            getPipelineStatus(),
            getWebhookEvents({ limit: 20 }),
            getWhatsAppLog(),
            getStreamStatus(),
         ]);
         setHealth(h);
         setPipelineStatus(ps);
         setWebhookEvents(we.events);
         setWhatsappLog(wa.log);
         setStreamStatus(ss);
         setLastRefresh(new Date().toLocaleTimeString());
      } catch (err) {
         console.error("Devices fetch error", err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchAll();
      const timer = setInterval(fetchAll, 15000); // refresh every 15s
      return () => clearInterval(timer);
   }, []);

   // Build device list from backend state
   const devices: Device[] = [
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
            ? `${pipelineStatus.stats.total_readings} ticks, ${pipelineStatus.connected_clients} clients`
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
         lastSeen: `${pipelineStatus?.connected_clients || 0} client(s) connected`,
         firmware: "ws://localhost:8000",
      },
      {
         id: "WS-STREAM",
         name: "Sensor Data Stream",
         type: "Gateway",
         status: streamStatus?.active_connections ? "online" : "warning",
         battery: 100,
         signal: streamStatus?.active_connections ? -50 : -90,
         lastSeen: `${streamStatus?.active_connections || 0} active streams`,
         firmware: "ws://localhost:8000",
      },
      {
         id: "RF-MODEL",
         name: "Random Forest AI Model",
         type: "Pressure Sensor",
         status: (health?.models_loaded?.length || 0) > 0 ? "online" : "offline",
         battery: 100,
         signal: (health?.models_loaded?.length || 0) > 0 ? -20 : -110,
         lastSeen: health?.models_loaded?.join(", ") || "No models loaded",
         firmware: "model.pkl",
      },
      {
         id: "WA-SVC",
         name: "WhatsApp Notification Service",
         type: "Soil Node",
         status: (whatsappLog.length > 0 || pipelineStatus?.stats.whatsapp_messages_sent) ? "online" : "warning",
         battery: 100,
         signal: -50,
         lastSeen: `${pipelineStatus?.stats.whatsapp_messages_sent || 0} messages sent`,
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
      if (status === "online") return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"><Wifi className="w-3 h-3 mr-1" /> Online</Badge>;
      if (status === "warning") return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>;
   };

   return (
      <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
         <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                     <Router className="w-8 h-8 text-slate-600" />
                     IoT Device Fleet
                  </h1>
                  <p className="text-green-700/80 mt-1">Live backend service monitoring — Last refresh: {lastRefresh || "..."}</p>
               </div>
               <Button variant="outline" className="border-green-200 text-green-700 shadow-sm" onClick={fetchAll} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh Status
               </Button>
            </div>

            {/* Fleet Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Card className="border-green-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Router className="w-5 h-5 text-slate-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-slate-600">Total Services</p>
                        <p className="text-2xl font-bold">{devices.length}</p>
                     </div>
                  </CardContent>
               </Card>
               <Card className="border-green-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-green-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-green-700">Online</p>
                        <p className="text-2xl font-bold text-green-700">{onlineCount}</p>
                     </div>
                  </CardContent>
               </Card>
               <Card className="border-green-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                        <BatteryWarning className="w-5 h-5 text-yellow-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-yellow-700">Warning</p>
                        <p className="text-2xl font-bold text-yellow-700">{warningCount}</p>
                     </div>
                  </CardContent>
               </Card>
               <Card className="border-green-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <WifiOff className="w-5 h-5 text-red-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-red-700">Offline</p>
                        <p className="text-2xl font-bold text-red-700">{offlineCount}</p>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* Device Table */}
            <Card className="border-green-200 shadow-sm bg-white overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs text-green-800 uppercase bg-green-50/80 border-b border-green-100">
                        <tr>
                           <th className="px-6 py-4 rounded-tl-lg">Service & ID</th>
                           <th className="px-6 py-4">Type</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4">Signal</th>
                           <th className="px-6 py-4">Info</th>
                           <th className="px-6 py-4 rounded-tr-lg">Version</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-green-50">
                        {devices.map((device) => (
                           <tr key={device.id} className="hover:bg-green-50/30 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="font-semibold text-green-900">{device.name}</div>
                                 <div className="text-xs text-green-600/70 font-mono mt-0.5">{device.id}</div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2 text-slate-700">
                                    {device.type === 'Gateway' && <Router className="w-4 h-4 text-purple-500" />}
                                    {device.type === 'Flow Meter' && <Activity className="w-4 h-4 text-blue-500" />}
                                    {device.type === 'Pressure Sensor' && <Radio className="w-4 h-4 text-amber-500" />}
                                    {device.type === 'Soil Node' && <Radio className="w-4 h-4 text-emerald-500" />}
                                    {device.type}
                                 </div>
                              </td>
                              <td className="px-6 py-4">{getStatusBadge(device.status)}</td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    {getSignalBars(device.signal)}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">{device.lastSeen}</td>
                              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{device.firmware}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </Card>

            {/* Recent Webhook Events */}
            {webhookEvents.length > 0 && (
               <Card className="border-green-200 shadow-sm">
                  <CardHeader>
                     <CardTitle className="text-green-800 text-lg">Recent Webhook Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {webhookEvents.slice(-10).reverse().map((ev) => (
                           <div key={ev.event_id} className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg border border-green-100 text-xs">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex gap-2 items-center flex-wrap">
                                    <span className="font-semibold text-green-900">{ev.event_type || ev.event_id?.slice(0, 8)}</span>
                                    {ev.device_id && <Badge variant="outline" className="text-xs">{ev.device_id}</Badge>}
                                 </div>
                                 <p className="text-green-600/70 mt-0.5">{ev.received_at}</p>
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
