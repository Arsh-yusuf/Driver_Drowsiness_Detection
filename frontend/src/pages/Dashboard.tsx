import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, AlertTriangle, Activity, Users, Clock, Search, Info, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrowsinessAlert, dashboardStats } from "@/data/mockAlerts";
import { getEvents, getAISuggestions } from "@/lib/api";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";

const Dashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [alerts, setAlerts] = useState<DrowsinessAlert[]>([]);
  const [stats, setStats] = useState(dashboardStats);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  
  const previousAlertCount = useRef(-1);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await getAISuggestions(token);
      if (data && data.suggestions) {
         setAiSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Failed to fetch AI suggestions", err);
      setAiSuggestions(["Unable to reach AI safety service. Please manually review your alerts. Drive carefully.", "Ensure your cabin is well-ventilated.", "Take adequate breaks."]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    // Initial fetch for AI suggestions
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        const data = await getEvents(token);

        const mappedAlerts: DrowsinessAlert[] = data.map((event: any) => {
          const dt = new Date(event.created_at);
          let severity: "critical" | "warning" | "info" = "info";
          if (["DROWSINESS", "EYES_CLOSED"].includes(event.event_type)) severity = "critical";
          if (["DISTRACTION", "YAWN", "HEAD_DOWN", "HEAD_UP", "HEAD_TURN_LEFT", "HEAD_TURN_RIGHT"].includes(event.event_type)) severity = "warning";

          return {
            id: event.id.substring(0, 8),
            driverName: "Driver " + event.user_id.substring(0, 4),
            date: dt.toLocaleDateString(),
            time: dt.toLocaleTimeString(),
            severity,
            symptoms: event.event_subtype ? [event.event_subtype] : [event.event_type],
            duration: event.duration_ms ? `${(event.duration_ms / 1000).toFixed(1)}s` : "-",
            vehicleId: "Unknown"
          };
        });

        setAlerts(mappedAlerts);
        setStats({
          totalAlerts: mappedAlerts.length,
          criticalToday: mappedAlerts.filter(a => a.severity === "critical" && a.date === new Date().toLocaleDateString()).length,
          activeDrivers: new Set(mappedAlerts.map(a => a.driverName)).size,
          avgResponseTime: "Dynamic",
        });

        // If new events were fetched, trigger a new AI suggestion generation
        if (previousAlertCount.current !== -1 && mappedAlerts.length > previousAlertCount.current) {
          fetchSuggestions();
        }
        previousAlertCount.current = mappedAlerts.length;

      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const filteredAlerts = alerts.filter((alert) => {
    const matchSearch =
      alert.driverName.toLowerCase().includes(search.toLowerCase()) ||
      alert.vehicleId.toLowerCase().includes(search.toLowerCase()) ||
      alert.symptoms.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">DrowsiGuard</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monitoring Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-success/10 border border-success/20 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
              <span className="text-xs font-medium text-success">System Active</span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/monitor")}
              className="bg-primary hover:bg-primary/90 hidden sm:flex items-center gap-1"
            >
              <Camera className="h-4 w-4" />
              Start Monitoring
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Events"
            value={stats.totalAlerts}
            icon={AlertTriangle}
            trend="All Time"
            variant="warning"
          />
          <StatCard
            title="Driver Mistakes Today"
            value={stats.criticalToday + alerts.filter(a => a.severity === "warning" && a.date === new Date().toLocaleDateString()).length}
            icon={Activity}
            trend="Drowsy/Distracted Events"
            variant="danger"
          />
          <StatCard
            title="Active Drivers"
            value={stats.activeDrivers}
            icon={Users}
            trend="Unique drivers"
            variant="default"
          />
          <StatCard
            title="Avg Response"
            value={stats.avgResponseTime}
            icon={Clock}
            trend="..."
            variant="success"
          />
        </div>

        {/* Safety Suggestions */}
        <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 p-5 border-b border-border/50 bg-primary/5">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Safety Suggestions & Actions</h2>
          </div>
          <div className="p-5">
            {loadingSuggestions ? (
               <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
                 <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                 <span>AI is analyzing your metrics to generate personalized safety instructions...</span>
               </div>
            ) : (
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {aiSuggestions.map((suggestion, idx) => (
                  <li key={idx} className={suggestion.includes("URGENT") ? "text-destructive font-bold" : ""}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-border/50">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Drowsiness Alerts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time detection log from all connected vehicles</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search driver, vehicle, symptom..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-secondary/50 border-border/50 text-sm h-9 w-full sm:w-64"
                />
              </div>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="h-9 rounded-md border border-border/50 bg-secondary/50 px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Alert ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Symptoms Detected</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Duration</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Vehicle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredAlerts.map((alert, i) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-accent/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{alert.id}</td>
                    <td className="px-5 py-3.5 font-medium text-foreground">{alert.driverName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{alert.date}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">{alert.time}</td>
                    <td className="px-5 py-3.5">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {alert.symptoms.map((symptom, idx) => (
                          <span
                            key={idx}
                            className="inline-block rounded bg-accent/60 border border-border/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">{alert.duration}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{alert.vehicleId}</td>
                  </tr>
                ))}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      No alerts matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
