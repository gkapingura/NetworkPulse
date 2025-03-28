import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DeviceWithStatus } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddDeviceDialog } from "@/components/devices/add-device-dialog";
import { 
  Loader2, 
  Router, 
  Wifi, 
  Printer, 
  Cctv, 
  Server, 
  Smartphone,
  Plus
} from "lucide-react";

// Icons for different device types
const deviceTypeIcons: Record<string, React.ReactNode> = {
  router: <Router className="text-primary h-5 w-5" />,
  "access-point": <Wifi className="text-primary h-5 w-5" />,
  printer: <Printer className="text-primary h-5 w-5" />,
  camera: <Cctv className="text-primary h-5 w-5" />,
  server: <Server className="text-primary h-5 w-5" />,
  other: <Smartphone className="text-primary h-5 w-5" />
};

export default function DevicesList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [deviceType, setDeviceType] = useState("all");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const pageSize = 5;

  const { data: devices, isLoading, error } = useQuery<DeviceWithStatus[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Filter devices by type if needed
  const filteredDevices = devices ? 
    (deviceType === "all" 
      ? devices 
      : devices.filter(device => device.type === deviceType)
    ) : [];

  // Pagination
  const totalPages = Math.ceil((filteredDevices?.length ?? 0) / pageSize);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Get device icon
  const getDeviceIcon = (type: string) => {
    const iconKey = Object.keys(deviceTypeIcons).find(key => 
      type.toLowerCase().includes(key)
    ) || 'other';
    
    return deviceTypeIcons[iconKey];
  };

  return (
    <Card className="bg-white shadow mb-6">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-medium text-foreground">Device Status</h2>
        <div className="flex items-center space-x-2">
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Devices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="router">Routers</SelectItem>
              <SelectItem value="access-point">Access Points</SelectItem>
              <SelectItem value="switch">Switches</SelectItem>
              <SelectItem value="server">Servers</SelectItem>
              <SelectItem value="printer">Printers</SelectItem>
              <SelectItem value="camera">IP Cameras</SelectItem>
            </SelectContent>
          </Select>
          <Button className="flex items-center" onClick={() => setIsAddDeviceOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Device
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="p-6 text-destructive">
          Error loading devices: {error.message}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">IP Address</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Latency</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Uptime</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {paginatedDevices.length > 0 ? (
                  paginatedDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getDeviceIcon(device.type)}
                          <div className="ml-2">
                            <div className="text-sm font-medium text-foreground">{device.name}</div>
                            <div className="text-xs text-muted-foreground">{device.location || device.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{device.ipAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={device.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {device.latency ? `${device.latency}ms` : "--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {device.uptime || "--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/devices/${device.id}`}>
                          <Button variant="link" className="text-primary">Details</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No devices found. Add some devices to start monitoring.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredDevices.length > 0 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredDevices.length)} of {filteredDevices.length} devices
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={currentPage === 1 ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {[...Array(Math.min(totalPages, 3))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant={currentPage === totalPages ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddDeviceDialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen} />
    </Card>
  );
}
