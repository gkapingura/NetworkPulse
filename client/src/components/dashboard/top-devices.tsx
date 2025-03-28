import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DeviceWithStatus } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Server, Laptop, Smartphone, Wifi, Printer, Cctv } from "lucide-react";
import { Link } from "wouter";

type TimeRange = "today" | "week" | "month";

export default function TopDevices() {
  const [timeRange, setTimeRange] = useState<TimeRange>("today");

  // Query to get devices with status
  const { data: devices } = useQuery<DeviceWithStatus[]>({
    queryKey: ["/api/devices"],
  });

  // Function to determine which icon to use based on device type
  const getDeviceIcon = (type: string) => {
    const iconProps = { className: "text-primary text-sm", size: 16 };
    
    if (type.toLowerCase().includes("server")) {
      return <Server {...iconProps} />;
    } else if (type.toLowerCase().includes("desktop") || type.toLowerCase().includes("pc")) {
      return <Monitor {...iconProps} />;
    } else if (type.toLowerCase().includes("laptop")) {
      return <Laptop {...iconProps} />;
    } else if (type.toLowerCase().includes("phone") || type.toLowerCase().includes("mobile")) {
      return <Smartphone {...iconProps} />;
    } else if (type.toLowerCase().includes("access") || type.toLowerCase().includes("wifi")) {
      return <Wifi {...iconProps} />;
    } else if (type.toLowerCase().includes("printer")) {
      return <Printer {...iconProps} />;
    } else if (type.toLowerCase().includes("camera") || type.toLowerCase().includes("cam")) {
      return <Cctv {...iconProps} />;
    } else {
      return <Monitor {...iconProps} />;
    }
  };

  // Generate sample usage data for devices
  const generateUsageData = () => {
    if (!devices || devices.length === 0) return [];
    
    const result = [...devices]
      .map(device => ({
        ...device,
        usage: Math.floor(Math.random() * 900) + 100, // Random usage between 100-1000 GB
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);
    
    // Calculate max usage for percentage calculation
    const maxUsage = Math.max(...result.map(d => d.usage));
    
    return result.map(device => ({
      ...device,
      usagePercentage: (device.usage / maxUsage) * 100
    }));
  };

  const topDevices = generateUsageData();

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Top Devices by Traffic</h2>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Today" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {topDevices.map((device) => (
            <div key={device.id} className="flex items-center">
              <div className="w-8 h-8 flex-shrink-0 mr-3 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                {getDeviceIcon(device.type)}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{device.name}</span>
                  <span className="text-sm text-muted-foreground">{device.usage} GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${device.usagePercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}

          <Link href="/reports">
            <Button className="w-full mt-4 py-2 text-sm font-medium border border-primary text-primary bg-transparent hover:bg-primary hover:bg-opacity-5">
              View Full Report
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
