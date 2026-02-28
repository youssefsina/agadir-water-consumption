"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Router, Radio, Activity, Battery, BatteryMedium, BatteryFull, BatteryWarning, Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

type DeviceStatus = "online" | "offline" | "warning";
type DeviceType = "Gateway" | "Flow Meter" | "Pressure Sensor" | "Soil Node";

interface Device {
   id: string;
   name: string;
   type: DeviceType;
   status: DeviceStatus;
   battery: number; // percentage
   signal: -20 | -50 | -75 | -90 | -110; // dBm roughly mapping to bars
   lastSeen: string;
   firmware: string;
}

export default function DevicesPage() {
   const t = useTranslations('devices');
   const devices: Device[] = [
      { id: "GW-MSTR-01", name: "Main LoRaWAN Gateway", type: "Gateway", status: "online", battery: 100, signal: -20, lastSeen: "2 mins ago", firmware: "v2.1.0" },
      { id: "FM-NTH-12", name: "North Field Flow", type: "Flow Meter", status: "online", battery: 85, signal: -50, lastSeen: "5 mins ago", firmware: "v1.4.2" },
      { id: "PS-NTH-13", name: "North Field Pressure", type: "Pressure Sensor", status: "online", battery: 92, signal: -50, lastSeen: "5 mins ago", firmware: "v1.4.2" },
      { id: "SN-NTH-01", name: "North Soil Node 1", type: "Soil Node", status: "online", battery: 45, signal: -75, lastSeen: "12 mins ago", firmware: "v1.2.0" },
      { id: "SN-NTH-02", name: "North Soil Node 2", type: "Soil Node", status: "warning", battery: 15, signal: -90, lastSeen: "14 mins ago", firmware: "v1.2.0" },

      { id: "FM-ORC-05", name: "Orchard Flow", type: "Flow Meter", status: "offline", battery: 0, signal: -110, lastSeen: "14 hrs ago", firmware: "v1.4.1" },
      { id: "PS-ORC-06", name: "Orchard Pressure", type: "Pressure Sensor", status: "online", battery: 78, signal: -75, lastSeen: "10 mins ago", firmware: "v1.4.2" },
      { id: "SN-ORC-01", name: "Orchard Soil Node", type: "Soil Node", status: "online", battery: 60, signal: -90, lastSeen: "25 mins ago", firmware: "v1.2.0" },
   ];

   const getBatteryIcon = (level: number) => {
      if (level > 80) return <BatteryFull className="w-5 h-5 text-green-500" />;
      if (level > 30) return <BatteryMedium className="w-5 h-5 text-green-500" />;
      if (level > 10) return <BatteryWarning className="w-5 h-5 text-yellow-500" />;
      return <Battery className="w-5 h-5 text-red-500" />;
   };

   const getSignalBars = (dbm: number) => {
      // -20 (perfect, wired/close), -50 (good), -75 (fair), -90 (poor), -110 (offline)
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
      if (status === "online") return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"><Wifi className="w-3 h-3 mr-1" /> {t('onlineDevices')}</Badge>;
      if (status === "warning") return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" /> {t('warnings')}</Badge>;
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"><WifiOff className="w-3 h-3 mr-1" /> {t('offlineDevices')}</Badge>;
   };

   return (
      <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
         <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                     <Router className="w-8 h-8 text-slate-600" />
                     {t('title')}
                  </h1>
                  <p className="text-green-700/80 mt-1">{t('subtitle')}</p>
               </div>

               <Button variant="outline" className="border-green-200 text-green-700 shadow-sm">
                  <RefreshCw className="w-4 h-4 mr-2" /> {t('pingAll')}
               </Button>
            </div>

            {/* Fleet Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Card className="border-green-200 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Router className="w-5 h-5 text-slate-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-slate-600">{t('totalDevices')}</p>
                        <p className="text-2xl font-bold">{devices.length}</p>
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-green-200 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-green-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-green-700">{t('onlineDevices')}</p>
                        <p className="text-2xl font-bold text-green-700">{devices.filter(d => d.status === 'online').length}</p>
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-green-200 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                        <BatteryWarning className="w-5 h-5 text-yellow-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-yellow-700">{t('warnings')}</p>
                        <p className="text-2xl font-bold text-yellow-700">{devices.filter(d => d.battery <= 20 && d.battery > 0).length}</p>
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-green-200 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <WifiOff className="w-5 h-5 text-red-600" />
                     </div>
                     <div>
                        <p className="text-sm font-medium text-red-700">{t('offlineDevices')}</p>
                        <p className="text-2xl font-bold text-red-700">{devices.filter(d => d.status === 'offline').length}</p>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* Device List */}
            <Card className="border-green-200 shadow-sm bg-white overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="text-xs text-green-800 uppercase bg-green-50/80 border-b border-green-100">
                        <tr>
                           <th className="px-6 py-4 rounded-tl-lg">{t('deviceName')}</th>
                           <th className="px-6 py-4">{t('type')}</th>
                           <th className="px-6 py-4">{t('status')}</th>
                           <th className="px-6 py-4">{t('signal')}</th>
                           <th className="px-6 py-4">{t('battery')}</th>
                           <th className="px-6 py-4">{t('lastSeen')}</th>
                           <th className="px-6 py-4 rounded-tr-lg">{t('action')}</th>
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
                                    {device.type === 'Gateway' ? t('gateway') : device.type === 'Flow Meter' ? t('flowMeter') : device.type === 'Pressure Sensor' ? t('pressureSensor') : t('soilNode')}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 {getStatusBadge(device.status)}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    {getSignalBars(device.signal)}
                                    <span className="text-xs text-slate-500 hidden sm:inline-block">{device.signal} dBm</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    {getBatteryIcon(device.battery)}
                                    <span className={`font-medium ${device.battery <= 20 ? 'text-red-600' : 'text-slate-700'}`}>
                                       {device.type === 'Gateway' ? <span className="text-xs text-slate-500 px-1 bg-slate-100 rounded">AC/DC</span> : `${device.battery}%`}
                                    </span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                 {device.lastSeen}
                              </td>
                              <td className="px-6 py-4">
                                 <Button variant="ghost" size="sm" className="text-green-700 hover:bg-green-100 hover:text-green-900">
                                    Connect
                                 </Button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </Card>
         </div >
      </div >
   );
}
