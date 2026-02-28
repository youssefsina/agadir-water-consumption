"use client";

import { useEffect, useState, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import {
  getHealth,
  getDataBatch,
  getWsSensorsUrl,
  getWsAlertsUrl,
  backendRowToSensorData,
  type BackendSensorRow,
} from "@/lib/api";

type Scenario = "NORMAL" | "LEAK_NIGHT" | "BURST" | "OVER_IRR" | "UNDER_IRR" | "RAIN";
type DecisionState = "ON" | "PAUSE" | "STOP";

interface AlertItem {
  id: string;
  time: string;
  message: string;
  type: "warning" | "destructive" | "info";
}

interface SensorData {
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
  const [currentData, setCurrentData] = useState<SensorData>({
    time: "10:00",
    flow: 120,
    pressure: 2.5,
    moisture: 45,
    temperature: 24,
    anomalyScore: 5,
  });
  const [history, setHistory] = useState<SensorData[]>([]);
  const [useLiveApi, setUseLiveApi] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const wsSensorsRef = useRef<WebSocket | null>(null);
  const wsAlertsRef = useRef<WebSocket | null>(null);

  // Live API: WebSocket streams for sensors + alerts
  useEffect(() => {
    if (!useLiveApi) {
      setApiConnected(null);
      return;
    }
    let cancelled = false;
    setApiConnected(null);

    getHealth()
      .then(() => {
        if (cancelled) return;
        setApiConnected(true);
        // Seed history from REST
        getDataBatch({ start: 0, size: 30, dataset: "raw" })
          .then((res) => {
            if (cancelled) return;
            const mapped = (res.data || []).map((r: BackendSensorRow) => backendRowToSensorData(r));
            if (mapped.length) {
              setHistory(mapped);
              setCurrentData(mapped[mapped.length - 1]!);
            }
          })
          .catch(() => {});

        const sensorsUrl = getWsSensorsUrl({ speed: 800, batch: 1 });
        const wsSensors = new WebSocket(sensorsUrl);
        wsSensorsRef.current = wsSensors;
        wsSensors.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string);
            if (msg.type === "sensor_data" && Array.isArray(msg.data) && msg.data.length > 0) {
              const next = msg.data.map((r: BackendSensorRow) => backendRowToSensorData(r));
              setCurrentData(next[next.length - 1]!);
              setHistory((prev) => [...prev.slice(-50), ...next].slice(-50));
            }
          } catch (_) {}
        };
        wsSensors.onerror = () => setApiConnected(false);
        wsSensors.onclose = () => { wsSensorsRef.current = null; };

        const alertsUrl = getWsAlertsUrl({ speed: 300 });
        const wsAlerts = new WebSocket(alertsUrl);
        wsAlertsRef.current = wsAlerts;
        wsAlerts.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string);
            if (msg.type === "anomaly_alert" && msg.alert) {
              const row = msg.alert as BackendSensorRow;
              const label = row.anomaly_type || "Anomaly";
              setAlerts((prev) => [
                { id: Math.random().toString(36).slice(2, 9), time: new Date().toLocaleTimeString(), message: `${label}: flow ${row.flow_lpm?.toFixed(1)} L/min, pressure ${row.pressure_bar?.toFixed(2)} bar`, type: "destructive" as const },
                ...prev.slice(0, 9),
              ]);
            }
          } catch (_) {}
        };
        wsAlerts.onerror = () => {};
        wsAlerts.onclose = () => { wsAlertsRef.current = null; };
      })
      .catch(() => {
        if (!cancelled) setApiConnected(false);
      });

    return () => {
      cancelled = true;
      if (wsSensorsRef.current) {
        wsSensorsRef.current.close();
        wsSensorsRef.current = null;
      }
      if (wsAlertsRef.current) {
        wsAlertsRef.current.close();
        wsAlertsRef.current = null;
      }
    };
  }, [useLiveApi]);

  // Simulation loop (only when not using live API)
  useEffect(() => {
    if (useLiveApi) return;
    // Generate initial history
    if (history.length === 0) {
      const initialHistory = [];
      const now = new Date();
      for (let i = 20; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 60000);
        initialHistory.push({
          time: `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`,
          flow: 115 + Math.random() * 10,
          pressure: 2.4 + Math.random() * 0.2,
          moisture: 40 + Math.random() * 5,
          temperature: 22 + Math.random() * 2,
          anomalyScore: Math.random() * 10,
        });
      }
      setHistory(initialHistory);
    }

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      let newFlow = 115 + Math.random() * 10;
      let newPressure = 2.4 + Math.random() * 0.2;
      let newMoisture = currentData.moisture + (decision === "ON" ? 0.5 : -0.2);
      let newTemperature = 24 + Math.sin(now.getTime() / 10000) * 5;
      let newAnomalyScore = Math.random() * 15;
      let newDecision: DecisionState = "ON";

      if (newMoisture > 100) newMoisture = 100;
      if (newMoisture < 0) newMoisture = 0;

      // Apply Scenario rules
      if (scenario === "LEAK_NIGHT") {
        newFlow = 30 + Math.random() * 10; // Flow when shouldn't be
        newPressure = 2.0 + Math.random() * 0.1;
        newAnomalyScore = 80 + Math.random() * 15;
        newDecision = "STOP";
        addAlert("Leak detected at night (Irrigation OFF but flow > 0)", "destructive");
      } else if (scenario === "BURST") {
        newFlow = 300 + Math.random() * 50; // Flow spike
        newPressure = 0.5 + Math.random() * 0.3; // Pressure drop
        newAnomalyScore = 95 + Math.random() * 5;
        newDecision = "STOP";
        addAlert("Pipe burst detected! Pressure dropped, flow spiked.", "destructive");
      } else if (scenario === "OVER_IRR") {
        newFlow = 120 + Math.random() * 10;
        newMoisture = currentData.moisture + 2; // Rapidly climbing past 60%
        if (newMoisture > 65) {
          newDecision = "STOP";
          newAnomalyScore = 60 + Math.random() * 20;
          addAlert("Over-irrigation threshold reached. Moisture > 60%", "warning");
        }
      } else if (scenario === "UNDER_IRR") {
        newFlow = 5 + Math.random() * 2; // Scheduled ON but no flow
        newPressure = 2.5 + Math.random() * 0.1;
        newAnomalyScore = 75 + Math.random() * 15;
        newDecision = "ON"; // trying to pump but failing
        addAlert("Under-irrigation! Pump issue or valve closed.", "destructive");
      } else if (scenario === "RAIN") {
        newDecision = "PAUSE";
        newFlow = 0;
        newPressure = 0;
        newAnomalyScore = 5 + Math.random() * 5;
        addAlert("High rain probability (>60%). Irrigation PAUSED.", "info");
      } else {
        // NORMAL
        if (newMoisture > 60) {
          newDecision = "STOP";
        } else if (newMoisture < 25) {
          newDecision = "ON";
        } else {
          newDecision = decision; // Keep current
        }

        if (newDecision === "STOP" || newDecision === "PAUSE") {
          newFlow = 0;
          newPressure = 0;
        }
      }

      setDecision(newDecision);

      const newData = {
        time: timeStr,
        flow: Math.max(0, newFlow),
        pressure: Math.max(0, newPressure),
        moisture: newMoisture,
        temperature: newTemperature,
        anomalyScore: newAnomalyScore,
      };

      setCurrentData(newData);
      setHistory((prev) => [...prev.slice(-20), newData]); // keep last 20 points
    }, 2000); // update every 2 seconds

    return () => clearInterval(interval);
  }, [useLiveApi, scenario, currentData.moisture, decision, history.length]);

  const addAlert = (message: string, type: "warning" | "destructive" | "info") => {
    setAlerts((prev) => {
      // prevent spamming the exact same message every 2 seconds
      if (prev.length > 0 && prev[0].message === message) return prev;
      return [
        {
          id: Math.random().toString(36).substr(2, 9),
          time: new Date().toLocaleTimeString(),
          message,
          type,
        },
        ...prev.slice(0, 9), // keep last 10
      ];
    });
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

        {/* Debug Controls */}
        <Card className="border-green-200 bg-white/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Scenario Simulator (Debug)
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap mt-2 text-sm text-green-700">
              <span className="flex items-center gap-2">
                <Switch
                  id="live-api"
                  checked={useLiveApi}
                  onCheckedChange={setUseLiveApi}
                />
                <label htmlFor="live-api" className="font-medium cursor-pointer">
                  Live from API
                </label>
              </span>
              {useLiveApi && (
                apiConnected === true ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Wifi className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : apiConnected === false ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                    <WifiOff className="w-3 h-3 mr-1" /> Backend unreachable
                  </Badge>
                ) : (
                  <Badge variant="outline">Connecting…</Badge>
                )
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={scenario === "NORMAL" ? "default" : "outline"}
                onClick={() => setScenario("NORMAL")}
                className={scenario === "NORMAL" ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-200 text-green-700 hover:bg-green-50"}
              >
                Normal Operation
              </Button>
              <Button
                variant={scenario === "LEAK_NIGHT" ? "destructive" : "outline"}
                onClick={() => setScenario("LEAK_NIGHT")}
                className={scenario !== "LEAK_NIGHT" ? "border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}
              >
                Leak at Night
              </Button>
              <Button
                variant={scenario === "BURST" ? "destructive" : "outline"}
                onClick={() => setScenario("BURST")}
                className={scenario !== "BURST" ? "border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}
              >
                Pipe Burst
              </Button>
              <Button
                variant={scenario === "OVER_IRR" ? "default" : "outline"}
                onClick={() => setScenario("OVER_IRR")}
                className={scenario === "OVER_IRR" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-green-200 text-green-700 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"}
              >
                Over-Irrigation
              </Button>
              <Button
                variant={scenario === "UNDER_IRR" ? "destructive" : "outline"}
                onClick={() => setScenario("UNDER_IRR")}
                className={scenario !== "UNDER_IRR" ? "border-green-200 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}
              >
                Under-Irrigation
              </Button>
              <Button
                variant={scenario === "RAIN" ? "secondary" : "outline"}
                onClick={() => setScenario("RAIN")}
                className={scenario === "RAIN" ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-green-200 text-green-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"}
              >
                Rain Forecast
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Water Flow</CardTitle>
              <Activity className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{currentData.flow.toFixed(1)} <span className="text-sm font-normal text-green-600">L/min</span></div>
              <p className="text-xs text-green-600/80 mt-1 flex items-center">
                {currentData.flow > 100 && scenario !== "BURST" ? <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" /> : (scenario === "BURST" ? <ArrowUpRight className="w-3 h-3 text-red-500 mr-1" /> : <ArrowDownRight className="w-3 h-3 text-green-500 mr-1" />)}
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
                {scenario === "BURST" && <span className="text-red-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> Critical Drop</span>}
                {scenario !== "BURST" && "Stable pressure"}
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
                {scenario === "RAIN" ? "Cooling down" : "Expected daily curve"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Section: Chart & Anomaly */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-green-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-green-800">Flow & Pressure History</CardTitle>
              <CardDescription>{useLiveApi && apiConnected ? "Live data from backend API" : "Real-time sensor data visualization"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#166534' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="flow" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorFlow)" name="Flow (L/min)" />
                    <Area yAxisId="right" type="monotone" dataKey="pressure" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPressure)" name="Pressure (Bar)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Anomaly & Alerts */}
          <div className="flex flex-col gap-6">
            <Card className="border-green-200 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${getAnomalyColor(currentData.anomalyScore)}`}></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800 flex items-center justify-between">
                  <span>AI Anomaly Score</span>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md text-xs font-semibold text-green-700 border border-green-100">
                    Isolation Forest
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2 text-3xl font-bold flex items-baseline gap-2 text-green-950">
                  {currentData.anomalyScore.toFixed(1)}
                  <span className="text-sm font-medium text-green-600/80">/ 100</span>
                </div>
                <Progress
                  value={currentData.anomalyScore}
                  className="h-2 mt-4 bg-green-100"
                  indicatorClassName={getAnomalyColor(currentData.anomalyScore)}
                />
                <p className="text-xs text-green-600/80 mt-3 flex items-center gap-1">
                  {currentData.anomalyScore > 70 ? (
                    <><AlertTriangle className="w-3 h-3 text-red-500" /> High probability of failure or leak</>
                  ) : currentData.anomalyScore > 30 ? (
                    <><AlertTriangle className="w-3 h-3 text-yellow-500" /> Unusual pattern detected</>
                  ) : (
                    <><Activity className="w-3 h-3 text-green-500" /> System operating normally</>
                  )}
                </p>
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

        {/* System Rules Layer */}
        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-800 text-lg">Active Decision Engine Rules</CardTitle>
            <CardDescription>Overrides based on agricultural logic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CloudRain className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-sm text-green-900">Weather Rule</h3>
                </div>
                <p className="text-xs text-green-700">If rain &gt; 60% → <span className="font-semibold text-blue-600">PAUSE</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-sm text-green-900">Soil Rule</h3>
                </div>
                <p className="text-xs text-green-700">If moisture &gt; 60% → <span className="font-semibold text-red-600">STOP</span></p>
                <p className="text-xs text-green-700 mt-1">If moisture &lt; 25% → <span className="font-semibold text-green-600">ON</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-sm text-green-900">Over-Irrigation</h3>
                </div>
                <p className="text-xs text-green-700">If duration exceeds baseline → <span className="font-semibold text-yellow-600">ALERT</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold text-sm text-green-900">Under-Irrigation</h3>
                </div>
                <p className="text-xs text-green-700">If ON but flow ≈ 0 → <span className="font-semibold text-red-600">ALERT</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
