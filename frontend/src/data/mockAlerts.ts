import { AlertTriangle, Eye, EyeOff as EyeClosed, Clock, TrendingUp, Users, Activity } from "lucide-react";

export type AlertSeverity = "critical" | "warning" | "info";

export interface DrowsinessAlert {
  id: string;
  driverName: string;
  date: string;
  time: string;
  severity: AlertSeverity;
  symptoms: string[];
  duration: string;
  vehicleId: string;
}

export const mockAlerts: DrowsinessAlert[] = [
  {
    id: "ALT-001",
    driverName: "Rajesh Kumar",
    date: "2026-02-28",
    time: "02:34 AM",
    severity: "critical",
    symptoms: ["Prolonged eye closure", "Head nodding", "Yawning frequency high"],
    duration: "12s",
    vehicleId: "TN-07-AB-1234",
  },
  {
    id: "ALT-002",
    driverName: "Amit Sharma",
    date: "2026-02-28",
    time: "01:15 AM",
    severity: "warning",
    symptoms: ["Frequent yawning", "Slow blink rate"],
    duration: "6s",
    vehicleId: "KA-01-MN-5678",
  },
  {
    id: "ALT-003",
    driverName: "Priya Patel",
    date: "2026-02-27",
    time: "11:48 PM",
    severity: "critical",
    symptoms: ["Eyes closed > 3s", "Lane departure detected", "No steering input"],
    duration: "18s",
    vehicleId: "MH-12-CD-9012",
  },
  {
    id: "ALT-004",
    driverName: "Suresh Reddy",
    date: "2026-02-27",
    time: "10:22 PM",
    severity: "info",
    symptoms: ["Occasional yawning"],
    duration: "3s",
    vehicleId: "AP-09-EF-3456",
  },
  {
    id: "ALT-005",
    driverName: "Deepak Singh",
    date: "2026-02-27",
    time: "03:05 AM",
    severity: "critical",
    symptoms: ["Micro-sleep detected", "Head drop", "Erratic steering"],
    duration: "22s",
    vehicleId: "DL-04-GH-7890",
  },
  {
    id: "ALT-006",
    driverName: "Vikram Joshi",
    date: "2026-02-26",
    time: "12:30 AM",
    severity: "warning",
    symptoms: ["Reduced blink frequency", "Yawning"],
    duration: "8s",
    vehicleId: "GJ-06-IJ-2345",
  },
  {
    id: "ALT-007",
    driverName: "Rahul Nair",
    date: "2026-02-26",
    time: "04:12 AM",
    severity: "warning",
    symptoms: ["Droopy eyelids", "Slow reaction time"],
    duration: "9s",
    vehicleId: "KL-11-KL-6789",
  },
  {
    id: "ALT-008",
    driverName: "Arjun Mehta",
    date: "2026-02-25",
    time: "01:55 AM",
    severity: "info",
    symptoms: ["Mild yawning"],
    duration: "2s",
    vehicleId: "RJ-14-MN-0123",
  },
];

export const dashboardStats = {
  totalAlerts: 847,
  criticalToday: 12,
  activeDrivers: 156,
  avgResponseTime: "2.3s",
};
