"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Droplets,
  AlertTriangle,
  CloudRain,
  Thermometer,
  Gauge,
  Power,
  PowerOff,
  PauseCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { usePipeline } from "@/hooks/use-pipeline";
import {
  setAnomalyType,
  getHealth,
  type HealthStatus,
} from "@/lib/api";

type Scenario = "NORMAL" | "LEAK_NIGHT" | "BURST" | "OVER_IRR" | "UNDER_IRR" | "RAIN";
type DecisionState = "ON" | "PAUSE" | "STOP";

interface AlertItem {
  id: string;
  time: string;
  message: string;
  type: "warning" | "destructive" | "info";
}

interface ChartPoint {
  time: string;
  flow: number;
  pressure: number;
  moisture: number;
  temperature: number;
  anomalyScore: number;
}

export default function Dashboard() {
  const [scenario, setScenario] = useState<Scenario>("NORMAL");
  const [decision, setDecision] = useState<DecisionState>("ON");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [chartHistory, setChartHistory] = useState<ChartPoint[]>([]);
  const [currentData, setCurrentData] = useState<ChartPoint>({
    time: "--:--",
    flow: 0,
    pressure: 0,
    moisture: 0,
    temperature: 0,
    anomalyScore: 0,
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Real-time pipeline connection
  const { current, history, stats, connected } = usePipeline(30);

  // Fetch health periodically
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setHealth(await getHealth());
      } catch (err) {
        console.error("Failed to fetch health", err);
      }
    };
    fetchHealth();
    const timer = setInterval(fetchHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  const addAlert = useCallback((message: string, type: "warning" | "destructive" | "info") => {
    setAlerts((prev) => {
      if (prev.length > 0 && prev[0].message === message) return prev;
      return [
        { id: Math.random().toString(36).substr(2, 9), time: new Date().toLocaleTimeString(), message, type },
        ...prev.slice(0, 19),
      ];
    });
  }, []);

  // Parse pipeline data to chart points
  useEffect(() => {
    if (history.length > 0) {
      const points: ChartPoint[] = history.map((entry) => ({
        time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        flow: entry.sensor_data.flow_lpm,
        pressure: entry.sensor_data.pressure_bar,
        moisture: entry.sensor_data.soil_moisture_pct,
        temperature: entry.sensor_data.temperature_c,
        anomalyScore: entry.prediction.is_anomaly
          ? entry.prediction.confidence * 100
          : Math.max(5, entry.prediction.confidence * 20),
      }));
      setChartHistory(points);
      if (points.length > 0) setCurrentData(points[points.length - 1]);
    }
  }, [history]);

  // React to new real-time ticks
  useEffect(() => {
    if (!current) return;
    const sd = current.sensor_data;
    const pred = current.prediction;

    if (sd.is_irrigating) setDecision("ON");
    else if (sd.rain_probability > 0.6) setDecision("PAUSE");
    else setDecision("STOP");

    if (pred.is_anomaly) {
      addAlert(`${pred.anomaly_type || "Anomaly"} detected! Confidence: ${(pred.confidence * 100).toFixed(0)}%`, "destructive");
    }
  }, [current, addAlert]);

  const handleSetScenario = async (scen: Scenario, anomalyId: number) => {
    setScenario(scen);
    try {
      await setAnomalyType(anomalyId);
    } catch (e) {
      console.error("Failed to set scenario", e);
    }
  };

  const getAnomalyColor = (score: number) => {
    if (score < 30) return "bg-green-500";
    if (score < 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-green-50/50 p-4 md:p-8 font-sans text-green-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
              <Droplets className="w-8 h-8 text-green-600" />
              AgriFlow AI Monitoring
            </h1>
            <p className="text-green-700/80 mt-1">Smart irrigation & leak detection system</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-green-100 shadow-sm">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${connected
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
              }`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? "Live" : "Offline"}
            </div>
            <span className="text-sm font-medium text-green-800">System Status:</span>
            {decision === "ON" && (
              <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1 text-sm"><Power className="w-4 h-4 mr-1" /> ON</Badge>
            )}
            {decision === "PAUSE" && (
              <Badge className="bg-blue-500 hover:bg-blue-600 px-3 py-1 text-sm"><PauseCircle className="w-4 h-4 mr-1" /> PAUSE</Badge>
            )}
            {decision === "STOP" && (
              <Badge variant="destructive" className="px-3 py-1 text-sm"><PowerOff className="w-4 h-4 mr-1" /> STOP</Badge>
            )}
          </div>
        </div>

        {/* Backend Status */}
        {health && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-green-100 shadow-sm text-xs">
              <Zap className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-700 font-medium">Backend: {health.status}</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-green-100 shadow-sm text-xs">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-green-700 font-medium">Uptime: {Math.floor((health.uptime_seconds || 0) / 60)}m</span>
            </div>
            {stats && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-green-100 shadow-sm text-xs">
                <AlertTriangle className={`w-3.5 h-3.5 ${stats.anomaly_rate > 20 ? "text-red-500" : "text-yellow-500"}`} />
                <span className="text-green-700 font-medium">Anomaly Rate: {stats.anomaly_rate}%</span>
              </div>
            )}
          </div>
        )}

        {/* Debug Controls */}
        <Card className="border-green-200 bg-white/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Scenario Simulator (Debug)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant={scenario === "NORMAL" ? "default" : "outline"} onClick={() => handleSetScenario("NORMAL", 0)} className={scenario === "NORMAL" ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-200 text-green-700 hover:bg-green-50"}>Normal Operation</Button>
              <Button variant={scenario === "LEAK_NIGHT" ? "destructive" : "outline"} onClick={() => handleSetScenario("LEAK_NIGHT", 1)} className={scenario !== "LEAK_NIGHT" ? "border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}>Leak at Night</Button>
              <Button variant={scenario === "BURST" ? "destructive" : "outline"} onClick={() => handleSetScenario("BURST", 2)} className={scenario !== "BURST" ? "border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}>Pipe Burst</Button>
              <Button variant={scenario === "OVER_IRR" ? "default" : "outline"} onClick={() => handleSetScenario("OVER_IRR", 3)} className={scenario === "OVER_IRR" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-green-200 text-green-700 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"}>Over-Irrigation</Button>
              <Button variant={scenario === "UNDER_IRR" ? "destructive" : "outline"} onClick={() => handleSetScenario("UNDER_IRR", 4)} className={scenario !== "UNDER_IRR" ? "border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}>Under-Irrigation</Button>
              <Button variant={scenario === "RAIN" ? "secondary" : "outline"} onClick={() => handleSetScenario("RAIN", 5)} className={scenario === "RAIN" ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-green-200 text-green-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"}>Rain Forecast</Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Water Flow</CardTitle>
              <Activity className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{currentData.flow.toFixed(1)} <span className="text-sm font-normal text-green-600">L/min</span></div>
              <p className="text-xs text-green-600/80 mt-1 flex items-center">
                {currentData.flow > 100 ? <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" /> : <ArrowDownRight className="w-3 h-3 text-green-500 mr-1" />}
                From normal baseline
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Pipeline Pressure</CardTitle>
              <Gauge className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{currentData.pressure.toFixed(2)} <span className="text-sm font-normal text-green-600">Bar</span></div>
              <p className="text-xs text-green-600/80 mt-1 flex items-center">
                {currentData.pressure < 1.5 && <span className="text-red-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> Critical Drop</span>}
                {currentData.pressure >= 1.5 && "Stable pressure"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Soil Moisture</CardTitle>
              <Droplets className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{currentData.moisture.toFixed(1)} <span className="text-sm font-normal text-green-600">%</span></div>
              <Progress value={currentData.moisture} className="h-1 mt-2" indicatorClassName={currentData.moisture > 60 ? "bg-blue-500" : (currentData.moisture < 30 ? "bg-red-500" : "bg-emerald-500")} />
            </CardContent>
          </Card>

          <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Ambient Temp</CardTitle>
              <Thermometer className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{currentData.temperature.toFixed(1)} <span className="text-sm font-normal text-green-600">°C</span></div>
              <p className="text-xs text-green-600/80 mt-1">
                {currentData.temperature < 20 ? "Cooling down" : "Expected daily curve"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart & Anomaly Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-green-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-green-800">Flow & Pressure History</CardTitle>
              <CardDescription>{connected ? "🔴 Live data from IoT pipeline" : "⏳ Waiting..."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartHistory} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFlow2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPressure2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#166534' }} />
                    <Area yAxisId="left" type="monotone" dataKey="flow" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorFlow2)" name="Flow (L/min)" />
                    <Area yAxisId="right" type="monotone" dataKey="pressure" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPressure2)" name="Pressure (Bar)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-green-200 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${getAnomalyColor(currentData.anomalyScore)}`}></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800 flex items-center justify-between">
                  <span>AI Anomaly Score</span>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md text-xs font-semibold text-green-700 border border-green-100">
                    Random Forest
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2 text-3xl font-bold flex items-baseline gap-2 text-green-950">
                  {currentData.anomalyScore.toFixed(1)}
                  <span className="text-sm font-medium text-green-600/80">/ 100</span>
                </div>
                <Progress value={currentData.anomalyScore} className="h-2 mt-4 bg-green-100" indicatorClassName={getAnomalyColor(currentData.anomalyScore)} />
                <p className="text-xs text-green-600/80 mt-3 flex items-center gap-1">
                  {currentData.anomalyScore > 70 ? (
                    <><AlertTriangle className="w-3 h-3 text-red-500" /> High probability of failure or leak</>
                  ) : currentData.anomalyScore > 30 ? (
                    <><AlertTriangle className="w-3 h-3 text-yellow-500" /> Unusual pattern detected</>
                  ) : (
                    <><Activity className="w-3 h-3 text-green-500" /> System operating normally</>
                  )}
                </p>
                {current?.prediction && (
                  <div className="mt-3 pt-3 border-t border-green-100 text-xs text-green-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-green-600">Type:</span>
                      <span className="font-semibold">{current.prediction.anomaly_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Truth:</span>
                      <span className="font-semibold">{current.ground_truth?.anomaly_type || "–"}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex-1 border-green-200 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-green-100 bg-white/50">
                <CardTitle className="text-green-800 text-base">Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[200px] w-full">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-green-600/60 h-full p-6 text-center text-sm">
                      <Clock className="w-8 h-8 mb-2 opacity-50" />
                      No recent alerts. System is stable.
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="p-4 border-b border-green-50 flex gap-3 items-start hover:bg-green-50/50 transition-colors">
                          <div className={`mt-0.5 rounded-full p-1.5 ${alert.type === 'destructive' ? 'bg-red-100 text-red-600' :
                            alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {alert.type === 'destructive' ? <AlertTriangle className="w-3 h-3" /> :
                              alert.type === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <CloudRain className="w-3 h-3" />}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${alert.type === 'destructive' ? 'text-red-900' :
                              alert.type === 'warning' ? 'text-yellow-900' : 'text-blue-900'
                              }`}>{alert.message}</p>
                            <p className="text-xs text-green-600/70 mt-1">{alert.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Rules */}
        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-800 text-lg">Active Decision Engine Rules</CardTitle>
            <CardDescription>Overrides based on agricultural logic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><CloudRain className="w-4 h-4 text-blue-500" /><h3 className="font-semibold text-sm text-green-900">Weather Rule</h3></div>
                <p className="text-xs text-green-700">If rain &gt; 60% → <span className="font-semibold text-blue-600">PAUSE</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Droplets className="w-4 h-4 text-emerald-500" /><h3 className="font-semibold text-sm text-green-900">Soil Rule</h3></div>
                <p className="text-xs text-green-700">If moisture &gt; 60% → <span className="font-semibold text-red-600">STOP</span></p>
                <p className="text-xs text-green-700 mt-1">If moisture &lt; 25% → <span className="font-semibold text-green-600">ON</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-orange-500" /><h3 className="font-semibold text-sm text-green-900">Over-Irrigation</h3></div>
                <p className="text-xs text-green-700">If duration exceeds baseline → <span className="font-semibold text-yellow-600">ALERT</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-500" /><h3 className="font-semibold text-sm text-green-900">Under-Irrigation</h3></div>
                <p className="text-xs text-green-700">If ON but flow ≈ 0 → <span className="font-semibold text-red-600">ALERT</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
