import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DeviceWithStatus, PingResult, Alert } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/ui/status-badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Router,
  Wifi,
  Server,
  Printer,
  Cctv,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
  DownloadCloud,
  UploadCloud,
  Save,
} from "lucide-react";

// Form schema with validation
const deviceSchema = z.object({
  name: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
  type: z.string({
    required_error: "Please select a device type.",
  }),
  ipAddress: z
    .string()
    .refine(
      (val) => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(val),
      {
        message: "Please enter a valid IP address.",
      }
    ),
  location: z.string().optional(),
  description: z.string().optional(),
  monitoringEnabled: z.boolean().default(true),
});

export default function DeviceDetailsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [location, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const deviceId = parseInt(params.id, 10);
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const isEditMode = searchParams.get("edit") === "true";
  const [editMode, setEditMode] = useState(isEditMode);
  
  const { toast } = useToast();

  // Query to get device details
  const { 
    data: device, 
    isLoading: isLoadingDevice, 
    error: deviceError,
    refetch: refetchDevice
  } = useQuery<DeviceWithStatus>({
    queryKey: [`/api/devices/${deviceId}`],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query to get device alerts
  const { 
    data: alerts, 
    isLoading: isLoadingAlerts 
  } = useQuery<Alert[]>({
    queryKey: [`/api/alerts`, deviceId],
    queryFn: async () => {
      const res = await fetch(`/api/devices/${deviceId}/alerts`);
      if (!res.ok) {
        throw new Error("Failed to fetch device alerts");
      }
      return res.json();
    },
    enabled: !!deviceId && activeTab === "alerts",
  });

  // Query to get ping history
  const { 
    data: pingHistory, 
    isLoading: isLoadingPingHistory 
  } = useQuery<PingResult[]>({
    queryKey: [`/api/devices/${deviceId}/pings`],
    queryFn: async () => {
      const res = await fetch(`/api/devices/${deviceId}/pings`);
      if (!res.ok) {
        throw new Error("Failed to fetch ping history");
      }
      return res.json();
    },
    enabled: !!deviceId && activeTab === "performance",
  });

  // Check device mutation
  const checkDeviceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/devices/${deviceId}/check`);
      return await res.json();
    },
    onSuccess: () => {
      refetchDevice();
      toast({
        title: "Device checked",
        description: "The device status has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to check device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof deviceSchema>) => {
      const res = await apiRequest("PUT", `/api/devices/${deviceId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device updated",
        description: "The device has been updated successfully",
      });
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Setup form with validation
  const form = useForm<z.infer<typeof deviceSchema>>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      type: "",
      ipAddress: "",
      location: "",
      description: "",
      monitoringEnabled: true,
    },
  });

  // Update form values when device data is loaded
  useEffect(() => {
    if (device) {
      form.reset({
        name: device.name,
        type: device.type,
        ipAddress: device.ipAddress,
        location: device.location || "",
        description: device.description || "",
        monitoringEnabled: device.monitoringEnabled,
      });
    }
  }, [device, form]);

  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
  }

  // Handle form submission
  function onSubmit(values: z.infer<typeof deviceSchema>) {
    updateDeviceMutation.mutate(values);
  }

  // Get device icon based on type
  const getDeviceIcon = (type: string | undefined) => {
    if (!type) return <Smartphone className="h-10 w-10 text-primary" />;
    
    const iconProps = { className: "h-10 w-10 text-primary" };
    
    if (type.toLowerCase().includes("router")) {
      return <Router {...iconProps} />;
    } else if (type.toLowerCase().includes("access") || type.toLowerCase().includes("wifi")) {
      return <Wifi {...iconProps} />;
    } else if (type.toLowerCase().includes("server")) {
      return <Server {...iconProps} />;
    } else if (type.toLowerCase().includes("printer")) {
      return <Printer {...iconProps} />;
    } else if (type.toLowerCase().includes("camera")) {
      return <Cctv {...iconProps} />;
    } else {
      return <Smartphone {...iconProps} />;
    }
  };

  // Generate sample performance data
  const generatePerformanceData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      data.unshift({
        time: formattedTime,
        latency: Math.floor(Math.random() * 30) + 15,
        packetLoss: Math.floor(Math.random() * 5),
      });
    }
    
    return data;
  };

  // Generate sample bandwidth data
  const generateBandwidthData = () => {
    const data = [];
    
    for (let i = 0; i < 12; i++) {
      data.push({
        time: `${i * 2}:00`,
        download: Math.floor(Math.random() * 100) + 50,
        upload: Math.floor(Math.random() * 50) + 10,
      });
    }
    
    return data;
  };

  // Format alert timestamps
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const performanceData = generatePerformanceData();
  const bandwidthData = generateBandwidthData();

  const isLoading = isLoadingDevice || (activeTab === "alerts" && isLoadingAlerts) || (activeTab === "performance" && isLoadingPingHistory);

  if (isLoadingDevice && !device) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (deviceError || !deviceId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <XCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Device Not Found</h1>
        <p className="text-muted-foreground mb-4">
          {deviceError ? deviceError.message : "Invalid device ID"}
        </p>
        <Button asChild>
          <Link href="/devices">Back to Devices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block md:flex-shrink-0 fixed md:relative z-20 w-64 h-full md:h-auto`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMobileMenuToggle={toggleSidebar} />

        {/* Black overlay when sidebar is open on mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden" 
            onClick={toggleSidebar}
          ></div>
        )}

        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="flex items-center mb-6">
            <Button 
              variant="outline" 
              size="icon" 
              className="mr-4"
              asChild
            >
              <Link href="/devices">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Device Details</h1>
          </div>

          {device && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Device Info Card */}
                <Card className="md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-3 rounded-lg mr-4">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div>
                        <CardTitle>{device.name}</CardTitle>
                        <CardDescription>
                          {device.type} {device.location && `• ${device.location}`}
                        </CardDescription>
                      </div>
                    </div>
                    {!editMode && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setEditMode(true)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => checkDeviceMutation.mutate()}
                          disabled={checkDeviceMutation.isPending}
                        >
                          {checkDeviceMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Check Now
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    {editMode ? (
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Device Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Device Type</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select device type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="router">Router</SelectItem>
                                      <SelectItem value="access-point">Access Point</SelectItem>
                                      <SelectItem value="switch">Switch</SelectItem>
                                      <SelectItem value="server">Server</SelectItem>
                                      <SelectItem value="desktop">Desktop</SelectItem>
                                      <SelectItem value="laptop">Laptop</SelectItem>
                                      <SelectItem value="printer">Printer</SelectItem>
                                      <SelectItem value="camera">IP Camera</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                            
                          <FormField
                            control={form.control}
                            name="ipAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IP Address</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Location</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Where the device is located
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="monitoringEnabled"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-7">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Enable Monitoring</FormLabel>
                                    <FormDescription>
                                      Automatically check device status
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    className="resize-none" 
                                    rows={3}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setEditMode(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={updateDeviceMutation.isPending}
                            >
                              {updateDeviceMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">IP Address</div>
                          <div className="text-base">{device.ipAddress}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                          <div className="flex items-center">
                            <StatusBadge status={device.status} />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Latency</div>
                          <div className="text-base">{device.latency ? `${device.latency}ms` : "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Uptime</div>
                          <div className="text-base">{device.uptime || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Monitoring</div>
                          <div className="text-base">{device.monitoringEnabled ? "Enabled" : "Disabled"}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Added On</div>
                          <div className="text-base">{new Date(device.createdAt).toLocaleDateString()}</div>
                        </div>
                        {device.description && (
                          <div className="md:col-span-2">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                            <div className="text-base">{device.description}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center pt-6">
                    {device.status === "online" ? (
                      <CheckCircle className="h-24 w-24 text-success" />
                    ) : device.status === "warning" ? (
                      <AlertCircle className="h-24 w-24 text-warning" />
                    ) : (
                      <XCircle className="h-24 w-24 text-destructive" />
                    )}
                    <h3 className="text-lg font-semibold mt-4">
                      {device.status === "online" ? "Online" : device.status === "warning" ? "Warning" : "Offline"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      {device.status === "online" 
                        ? "Device is responding normally" 
                        : device.status === "warning" 
                          ? "Device is responding but with high latency" 
                          : "Device is not responding"}
                    </p>
                    
                    <div className="w-full mt-6 pt-6 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="flex justify-center mb-2">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="text-sm font-medium">Latency</div>
                          <div className="text-lg">{device.latency ? `${device.latency}ms` : "N/A"}</div>
                        </div>
                        <div>
                          <div className="flex justify-center mb-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="text-sm font-medium">Last Check</div>
                          <div className="text-sm">Just now</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs Section */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                </TabsList>
                
                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Latency Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Latency (Last 24 Hours)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 12 }}
                                tickMargin={8}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickMargin={8}
                                unit="ms"
                              />
                              <Tooltip 
                                formatter={(value) => [`${value}ms`, "Latency"]}
                                labelFormatter={(label) => `Time: ${label}`}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="latency" 
                                stroke="#0052CC" 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bandwidth Usage */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Bandwidth Usage (Last 24 Hours)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bandwidthData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 12 }}
                                tickMargin={8}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickMargin={8}
                                unit="MB"
                              />
                              <Tooltip 
                                formatter={(value) => [`${value} MB`, ""]}
                                labelFormatter={(label) => `Time: ${label}`}
                              />
                              <Legend verticalAlign="top" height={36} />
                              <Bar 
                                dataKey="download" 
                                name="Download" 
                                fill="#0052CC" 
                                radius={[2, 2, 0, 0]}
                              />
                              <Bar 
                                dataKey="upload" 
                                name="Upload" 
                                fill="#00B8D9" 
                                radius={[2, 2, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t pt-6 flex gap-6">
                        <div className="flex items-center">
                          <DownloadCloud className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <div className="text-sm font-medium">Download</div>
                            <div className="text-lg">1.2 TB</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <UploadCloud className="h-5 w-5 mr-2 text-secondary" />
                          <div>
                            <div className="text-sm font-medium">Upload</div>
                            <div className="text-lg">342 GB</div>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Performance Tab */}
                <TabsContent value="performance">
                  <div className="grid grid-cols-1 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                        <CardDescription>
                          Detailed performance data over time
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-medium mb-4">Latency Over Time</h3>
                              <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                      dataKey="time" 
                                      tick={{ fontSize: 12 }}
                                      tickMargin={8}
                                    />
                                    <YAxis 
                                      tick={{ fontSize: 12 }}
                                      tickMargin={8}
                                      unit="ms"
                                    />
                                    <Tooltip 
                                      formatter={(value) => [`${value}ms`, "Latency"]}
                                      labelFormatter={(label) => `Time: ${label}`}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="latency" 
                                      name="Latency"
                                      stroke="#0052CC" 
                                      strokeWidth={2}
                                      dot={false}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-lg font-medium mb-4">Packet Loss Percentage</h3>
                              <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                      dataKey="time" 
                                      tick={{ fontSize: 12 }}
                                      tickMargin={8}
                                    />
                                    <YAxis 
                                      tick={{ fontSize: 12 }}
                                      tickMargin={8}
                                      unit="%"
                                    />
                                    <Tooltip 
                                      formatter={(value) => [`${value}%`, "Packet Loss"]}
                                      labelFormatter={(label) => `Time: ${label}`}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="packetLoss" 
                                      name="Packet Loss"
                                      stroke="#FF5630" 
                                      strokeWidth={2}
                                      dot={false}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="pt-6 border-t">
                              <h3 className="text-lg font-medium mb-4">Performance Summary</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                  <CardContent className="p-6">
                                    <div className="text-sm font-medium text-muted-foreground">Average Latency</div>
                                    <div className="text-2xl font-bold mt-1">24 ms</div>
                                    <div className="text-xs text-muted-foreground mt-1">Last 24 hours</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-6">
                                    <div className="text-sm font-medium text-muted-foreground">Peak Latency</div>
                                    <div className="text-2xl font-bold mt-1">68 ms</div>
                                    <div className="text-xs text-muted-foreground mt-1">Last 24 hours</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-6">
                                    <div className="text-sm font-medium text-muted-foreground">Avg Packet Loss</div>
                                    <div className="text-2xl font-bold mt-1">0.8%</div>
                                    <div className="text-xs text-muted-foreground mt-1">Last 24 hours</div>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Alerts Tab */}
                <TabsContent value="alerts">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Alerts</CardTitle>
                      <CardDescription>
                        Recent alerts and notifications for this device
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : !alerts || alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <CheckCircle className="h-12 w-12 text-success mb-4" />
                          <h3 className="text-lg font-medium">No Alerts</h3>
                          <p className="text-muted-foreground mt-2 max-w-md">
                            This device has no active alerts. Everything seems to be working properly.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {alerts.map((alert) => (
                            <div 
                              key={alert.id} 
                              className={`p-4 border rounded-md ${
                                alert.severity === 'error' 
                                  ? 'border-destructive/50 bg-destructive/5' 
                                  : alert.severity === 'warning'
                                    ? 'border-warning/50 bg-warning/5'
                                    : 'border-primary/50 bg-primary/5'
                              }`}
                            >
                              <div className="flex items-start">
                                <div className="mr-3 mt-0.5">
                                  {alert.severity === 'error' ? (
                                    <XCircle className="h-5 w-5 text-destructive" />
                                  ) : alert.severity === 'warning' ? (
                                    <AlertCircle className="h-5 w-5 text-warning" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-medium">{alert.message}</h4>
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimestamp(alert.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {alert.resolved ? 'Resolved' : 'Active'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
