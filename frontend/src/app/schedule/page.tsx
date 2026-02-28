"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, CloudRain, Sun, Cloud, ThermometerSun, AlertCircle, Sparkles } from "lucide-react";

export default function SchedulePage() {
    const scheduleData = [
        {
            day: "Monday", date: "Oct 12",
            weather: { type: "Sunny", temp: "28°C", rainChance: "0%", icon: Sun, color: "text-amber-500" },
            events: [
                { time: "06:00 AM", zone: "North Field", status: "completed", action: "Watered (45 min)" },
                { time: "18:00 PM", zone: "East Orchard", status: "completed", action: "Watered (30 min)" },
            ]
        },
        {
            day: "Tuesday", date: "Oct 13",
            weather: { type: "Heavy Rain", temp: "22°C", rainChance: "85%", icon: CloudRain, color: "text-blue-500" },
            events: [
                { time: "06:00 AM", zone: "South Greenhouse", status: "skipped", action: "Scheduled: Watered (45 min)", reason: "Auto-Skipped: 85% chance of rain detected" },
                { time: "16:00 PM", zone: "West Pasture", status: "skipped", action: "Scheduled: Watered (60 min)", reason: "Auto-Skipped: Soil moisture optimal from morning rain" },
            ]
        },
        {
            day: "Wednesday", date: "Oct 14",
            weather: { type: "Cloudy", temp: "24°C", rainChance: "20%", icon: Cloud, color: "text-gray-500" },
            events: [
                { time: "06:00 AM", zone: "North Field", status: "scheduled", action: "Scheduled (45 min)" },
                { time: "18:00 PM", zone: "East Orchard", status: "pending_ai", action: "AI Evaluating...", reason: "Waiting for evening moisture readings" },
            ]
        },
        {
            day: "Thursday", date: "Oct 15",
            weather: { type: "Partly Cloudy", temp: "26°C", rainChance: "10%", icon: ThermometerSun, color: "text-orange-400" },
            events: [
                { time: "08:00 AM", zone: "All Zones", status: "scheduled", action: "Deep Watering cycle (120 min)" },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                            <CalendarRange className="w-8 h-8 text-green-600" />
                            Smart Scheduling Engine
                        </h1>
                        <p className="text-green-700/80 mt-1">AI-driven predictive irrigation based on local weather models</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                        <CloudRain className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-900">Weather Sync Active</span>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10 w-full md:w-2/3">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            AI Intervention Summary
                        </h2>
                        <p className="text-emerald-50 leading-relaxed text-sm">
                            This week, the predictive AI engine has proactively skipped <strong>2 watering cycles</strong> due to incoming rainfall,
                            saving an estimated <strong>12,500 Liters</strong> of water and preventing crop root rot.
                        </p>
                    </div>
                    <CloudRain className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-500/30 rotate-12" />
                </div>

                <div className="space-y-4">
                    {scheduleData.map((day, idx) => (
                        <Card key={idx} className="border-green-200 shadow-sm overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                {/* Weather Sidebar */}
                                <div className="bg-emerald-50 md:w-48 p-4 border-b md:border-b-0 md:border-r border-green-100 flex md:flex-col items-center justify-between md:justify-center text-center gap-2">
                                    <div>
                                        <p className="font-bold text-green-900">{day.day}</p>
                                        <p className="text-xs text-green-700/70">{day.date}</p>
                                    </div>
                                    <day.weather.icon className={`w-8 h-8 \${day.weather.color}`} />
                                    <div>
                                        <p className="text-xl font-bold text-green-950">{day.weather.temp}</p>
                                        <p className="text-xs font-semibold text-blue-600 flex items-center justify-center gap-1">
                                            <CloudRain className="w-3 h-3" /> {day.weather.rainChance}
                                        </p>
                                    </div>
                                </div>

                                {/* Schedule Events */}
                                <div className="flex-1 p-0">
                                    {day.events.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-green-600/50 text-sm p-4">
                                            No actions scheduled for this day
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-green-50">
                                            {day.events.map((ev, evIdx) => (
                                                <div key={evIdx} className={`p-4 flex flex-col md:flex-row gap-4 items-start md:items-center \${ev.status === 'skipped' ? 'bg-red-50/30' : ''}`}>
                                                    <div className="w-24 shrink-0 font-medium text-green-900 text-sm">{ev.time}</div>
                                                    <div className="w-32 shrink-0">
                                                        <Badge variant="outline" className="text-green-800 border-green-200 bg-white">
                                                            {ev.zone}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex-1">
                                                        {ev.status === "completed" && (
                                                            <span className="text-green-700 text-sm flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                {ev.action}
                                                            </span>
                                                        )}
                                                        {ev.status === "scheduled" && (
                                                            <span className="text-green-600/80 text-sm flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                                                                {ev.action}
                                                            </span>
                                                        )}
                                                        {ev.status === "pending_ai" && (
                                                            <div className="text-orange-600 text-sm">
                                                                <span className="flex items-center gap-2 font-medium">
                                                                    <Sparkles className="w-3 h-3" /> {ev.action}
                                                                </span>
                                                                <p className="text-xs mt-1 text-orange-600/70">{ev.reason}</p>
                                                            </div>
                                                        )}
                                                        {ev.status === "skipped" && (
                                                            <div>
                                                                <span className="text-gray-400 line-through text-sm">{ev.action}</span>
                                                                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100/50 w-max px-2 py-1 rounded-md border border-red-100">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    {ev.reason}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
