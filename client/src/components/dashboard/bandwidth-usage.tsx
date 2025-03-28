import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// Time range options
type TimeRange = "24h" | "7d" | "30d";

export default function BandwidthUsage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // Sample data for chart
  const data = generateSampleData(timeRange);

  function generateSampleData(range: TimeRange) {
    let data = [];
    
    if (range === "24h") {
      // Generate hourly data for 24 hours
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, "0");
        data.push({
          name: `${hour}:00`,
          download: Math.floor(Math.random() * 100),
          upload: Math.floor(Math.random() * 50),
        });
      }
    } else if (range === "7d") {
      // Generate daily data for a week
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < 7; i++) {
        data.push({
          name: days[i],
          download: Math.floor(Math.random() * 500),
          upload: Math.floor(Math.random() * 200),
        });
      }
    } else {
      // Generate data for 30 days (grouped into weeks for simplicity)
      for (let i = 1; i <= 30; i++) {
        if (i % 5 === 1) { // Show only some days to avoid clutter
          data.push({
            name: `Day ${i}`,
            download: Math.floor(Math.random() * 1000),
            upload: Math.floor(Math.random() * 500),
          });
        }
      }
    }
    
    return data;
  }

  // Format the tooltip values
  const formatBandwidth = (value: number) => {
    if (timeRange === "24h") {
      return `${value} GB`;
    } else if (timeRange === "7d") {
      return `${value} GB`;
    } else {
      return `${value} GB`;
    }
  };

  // Calculate totals for the legend
  const totalDownload = data.reduce((sum, item) => sum + item.download, 0);
  const totalUpload = data.reduce((sum, item) => sum + item.upload, 0);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange);
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Bandwidth Usage</h2>
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Last 24 Hours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-[200px] w-full bg-white border border-border rounded-md">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
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
                unit="GB"
              />
              <Tooltip 
                formatter={formatBandwidth}
                contentStyle={{ borderRadius: "0.375rem", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px 0 rgba(0,0,0,0.06)" }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar 
                dataKey="download" 
                name="Download" 
                fill="#0052CC" 
                opacity={0.7} 
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="upload" 
                name="Upload" 
                fill="#00B8D9" 
                opacity={0.7} 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex mt-4">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-primary opacity-70 mr-1"></div>
            <span className="text-xs text-muted-foreground">
              Download: {timeRange === "24h" ? totalDownload : totalDownload * 10} GB
            </span>
          </div>
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-secondary opacity-70 mr-1"></div>
            <span className="text-xs text-muted-foreground">
              Upload: {timeRange === "24h" ? totalUpload : totalUpload * 10} GB
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
