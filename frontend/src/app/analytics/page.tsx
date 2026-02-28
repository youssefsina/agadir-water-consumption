"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Droplet, CircleDollarSign, TrendingDown, Target, Zap, AlertCircle } from "lucide-react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

export default function AnalyticsPage() {
    // Mock data for Isolation Forest Visualization
    // Normal cluster around low anomaly score, tight flow/pressure relationship
    // Outliers (Leaks) with high flow, low pressure, high anomaly score
    // Outliers (Clogs) with low flow, high pressure, high anomaly score

    const generateData = () => {
        const normal = Array.from({ length: 50 }, () => ({
            x: 100 + (Math.random() - 0.5) * 20, // Flow (L/min)
            y: 2.5 + (Math.random() - 0.5) * 0.4, // Pressure (Bar)
            z: 5 + Math.random() * 15,          // Anomaly Score
        }));

        const leaks = Array.from({ length: 15 }, () => ({
            x: 180 + Math.random() * 50,         // High Flow
            y: 1.0 + Math.random() * 0.8,         // Low Pressure
            z: 80 + Math.random() * 20,          // High Anomaly
        }));

        const clogs = Array.from({ length: 10 }, () => ({
            x: 20 + Math.random() * 30,          // Low Flow
            y: 3.5 + Math.random() * 0.5,         // High Pressure
            z: 75 + Math.random() * 20,          // High Anomaly
        }));

        return { normal, leaks, clogs };
    };

    const { normal, leaks, clogs } = generateData();

    return (
        <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
                            <BrainCircuit className="w-8 h-8 text-indigo-600" />
                            AI Performance Analytics
                        </h1>
                        <p className="text-green-700/80 mt-1">Isolation Forest anomaly detection model visualization and ROI tracking</p>
                    </div>
                </div>

                {/* Wow Factor Hero Counters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                                        <Droplet className="w-4 h-4" /> Total Water Saved (YTD)
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        1.2M <span className="text-2xl font-semibold opacity-80">Liters</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-blue-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <TrendingDown className="w-4 h-4" /> 34% reduction vs last year
                            </div>
                            <Droplet className="absolute -right-6 -bottom-6 w-40 h-40 text-blue-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2">
                                        <CircleDollarSign className="w-4 h-4" /> Est. Money Saved (YTD)
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        $8,450
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-emerald-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <Zap className="w-4 h-4" /> Pumping energy + water costs
                            </div>
                            <CircleDollarSign className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg overflow-hidden relative group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-indigo-100 font-medium mb-1 flex items-center gap-2">
                                        <Target className="w-4 h-4" /> AI Interventions
                                    </p>
                                    <h2 className="text-5xl font-black tracking-tight">
                                        142 <span className="text-xl font-semibold opacity-80">actions</span>
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-indigo-100 bg-black/10 w-max px-3 py-1 rounded-full text-sm font-medium relative z-10">
                                <BrainCircuit className="w-4 h-4" /> 12 leaks mitigated proactively
                            </div>
                            <BrainCircuit className="absolute -right-6 -bottom-6 w-40 h-40 text-indigo-400 opacity-20 transform group-hover:scale-110 transition-transform duration-700" />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Scatter Plot */}
                    <Card className="lg:col-span-2 border-indigo-100 shadow-md">
                        <CardHeader className="bg-white pb-2 border-b border-indigo-50">
                            <div>
                                <CardTitle className="text-indigo-900 flex items-center gap-2">
                                    Isolation Forest Clustering Model
                                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 uppercase tracking-wider">Live Visualization</span>
                                </CardTitle>
                                <CardDescription>
                                    High-dimensional data projection mapping Flow against Pressure.
                                    Outliers detected by AI are isolated from the main operational cluster.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" dataKey="x" name="Flow" unit=" L/min" stroke="#64748b"
                                            label={{ value: 'Irrigation Flow Rate (L/min)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }} />
                                        <YAxis type="number" dataKey="y" name="Pressure" unit=" Bar" stroke="#64748b"
                                            label={{ value: 'Pipeline Pressure (Bar)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                                        <ZAxis type="number" dataKey="z" range={[40, 400]} name="Anomaly Score" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Scatter name="Normal Operations (Inliers)" data={normal} fill="#10b981" fillOpacity={0.6} />
                                        <Scatter name="Leak Anomalies (Outliers)" data={leaks} fill="#ef4444" fillOpacity={0.8} />
                                        <Scatter name="Clog/Valve Anomalies (Outliers)" data={clogs} fill="#f59e0b" fillOpacity={0.8} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Model Insights Sidebar */}
                    <div className="flex flex-col gap-4">
                        <Card className="border-indigo-100 shadow-sm flex-1 bg-gradient-to-b from-white to-indigo-50/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-indigo-900 text-lg">How The Model Works</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-indigo-950/80 leading-relaxed">
                                <p>
                                    Instead of building a profile of "normal" behavior, the <strong>Isolation Forest</strong> algorithm explicitly isolates anomalies.
                                </p>
                                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                    <h4 className="font-semibold text-emerald-700 mb-1 flex items-center gap-1.5"><Target className="w-4 h-4" /> Inliers (Normal Data)</h4>
                                    <p className="text-xs">Normal operations form a dense cluster. It takes many random partitions to isolate these points, resulting in a low anomaly score.</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                    <h4 className="font-semibold text-red-700 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Outliers (Anomalies)</h4>
                                    <p className="text-xs">Leaks or clogs result in rare value combinations (e.g., high flow with low pressure). They are susceptible to isolation and are detected quickly near the root of the tree.</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-indigo-100">
                                    <div className="text-xs font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Current Model Status</div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium">Contamination Parameter</span>
                                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Auto (0.05)</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">Training Data Horizon</span>
                                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Rolling 30-Day</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}


