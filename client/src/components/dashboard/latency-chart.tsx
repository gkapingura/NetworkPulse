import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeviceWithStatus, PingResult } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type TimeRange = "1H" | "24H" | "7D" | "30D";

export default function LatencyChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("1H");

  // Query to get devices with latest status
  const { data: devices, isLoading: isLoadingDevices } = useQuery<DeviceWithStatus[]>({
    queryKey: ["/api/devices"],
  });

  // Query to get ping results for the selected time range
  const { data: pingData, isLoading: isLoadingPing } = useQuery<PingResult[]>({
    queryKey: ["/api/devices/ping", timeRange],
    // This would normally fetch from an API that returns ping data for the selected time range
    // For now, generate mock data based on devices
    enabled: !!devices && devices.length > 0,
  });

  const isLoading = isLoadingDevices || isLoadingPing;

  // Format data for the chart
  const chartData = pingData ? formatChartData(pingData) : [];

  function formatChartData(data: PingResult[]) {
    // In a real implementation, this would process the actual API response
    // For now, let's create some sample data
    return generateSampleChartData(timeRange);
  }

  function generateSampleChartData(timeRange: TimeRange) {
    const now = new Date();
    const data = [];
    let pointCount = 0;
    let intervalMinutes = 0;

    // Configure based on time range
    switch (timeRange) {
      case "1H":
        pointCount = 12;
        intervalMinutes = 5;
        break;
      case "24H":
        pointCount = 24;
        intervalMinutes = 60;
        break;
      case "7D":
        pointCount = 7;
        intervalMinutes = 24 * 60;
        break;
      case "30D":
        pointCount = 30;
        intervalMinutes = 24 * 60;
        break;
    }

    for (let i = 0; i < pointCount; i++) {
      const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
      const formattedTime = formatTime(time, timeRange);
      
      data.unshift({
        time: formattedTime,
        latency: 15 + Math.random() * 30, // Random latency between 15-45ms
        peak: 50 + Math.random() * 50, // Random peak between 50-100ms
      });
    }

    return data;
  }

  function formatTime(date: Date, timeRange: TimeRange) {
    if (timeRange === "1H" || timeRange === "24H") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Network Latency</h2>
          <div className="flex space-x-2">
            {["1H", "24H", "7D", "30D"].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                className="px-3 py-1 text-xs"
                onClick={() => setTimeRange(range as TimeRange)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-[200px] w-full bg-white border border-border rounded-md">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  tickMargin={5}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickMargin={5}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  unit="ms"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: "0.375rem", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px 0 rgba(0,0,0,0.06)" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#0052CC"
                  strokeWidth={2}
                  dot={false}
                  name="Average"
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="peak"
                  stroke="#FFAB00"
                  strokeWidth={2}
                  dot={false}
                  name="Peak"
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No latency data available
            </div>
          )}
        </div>

        <div className="flex mt-4">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-primary mr-1"></div>
            <span className="text-xs text-muted-foreground">Average: 24ms</span>
          </div>
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-warning mr-1"></div>
            <span className="text-xs text-muted-foreground">Peak: 68ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
