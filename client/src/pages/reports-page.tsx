import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Report } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileBarChart,
  Download,
  Loader2,
  ChevronRight,
  Calendar,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Report form schema
const reportFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  timeRange: z.string().min(1, "Time range is required"),
  deviceTypes: z.array(z.string()).optional(),
  includeOfflineDevices: z.boolean().default(true),
  format: z.string().default("pdf"),
});

export default function ReportsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Setup form with validation
  const form = useForm<z.infer<typeof reportFormSchema>>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      timeRange: "24h",
      deviceTypes: [],
      includeOfflineDevices: true,
      format: "pdf",
    },
  });

  // Query to get reports
  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    enabled: !!user,
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reportFormSchema>) => {
      const res = await apiRequest("POST", "/api/reports", {
        title: data.title,
        timeRange: data.timeRange,
        filters: {
          deviceTypes: data.deviceTypes,
          includeOfflineDevices: data.includeOfflineDevices,
        },
        createdBy: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Report created",
        description: "Your report has been generated successfully",
      });
      setIsNewReportOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export report mutation
  const exportReportMutation = useMutation({
    mutationFn: async (data: { reportId: number; format: string }) => {
      const res = await apiRequest("POST", `/api/reports/${data.reportId}/export`, {
        format: data.format,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report exported",
        description: "Your report has been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to export report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
  }

  function onSubmitReport(values: z.infer<typeof reportFormSchema>) {
    createReportMutation.mutate(values);
  }

  // Create mock report data for visualization
  const deviceStatusData = [
    { name: "Online", value: 12, color: "#36B37E" },
    { name: "Warning", value: 3, color: "#FFAB00" },
    { name: "Offline", value: 2, color: "#FF5630" },
  ];

  const latencyTrendData = [
    { date: "Jan 1", latency: 25 },
    { date: "Jan 2", latency: 22 },
    { date: "Jan 3", latency: 35 },
    { date: "Jan 4", latency: 30 },
    { date: "Jan 5", latency: 28 },
    { date: "Jan 6", latency: 32 },
    { date: "Jan 7", latency: 27 },
  ];

  const bandwidthUsageData = [
    { date: "Jan 1", download: 120, upload: 35 },
    { date: "Jan 2", download: 160, upload: 40 },
    { date: "Jan 3", download: 180, upload: 45 },
    { date: "Jan 4", download: 150, upload: 38 },
    { date: "Jan 5", download: 170, upload: 42 },
    { date: "Jan 6", download: 190, upload: 48 },
    { date: "Jan 7", download: 140, upload: 36 },
  ];

  const deviceTypeData = [
    { name: "Routers", value: 4, color: "#0052CC" },
    { name: "Access Points", value: 5, color: "#00B8D9" },
    { name: "Servers", value: 3, color: "#6554C0" },
    { name: "Cameras", value: 3, color: "#FF8B00" },
    { name: "Printers", value: 2, color: "#008672" },
  ];

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl font-bold mb-4 md:mb-0">Reports & Analytics</h1>
            <Button onClick={() => setIsNewReportOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Network Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Network Status Summary</CardTitle>
                <CardDescription>Current status of all monitored devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {deviceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} devices`, ""]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Latency Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Latency Trends</CardTitle>
                <CardDescription>Average latency over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis unit="ms" />
                      <Tooltip 
                        formatter={(value) => [`${value}ms`, "Latency"]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="latency" 
                        stroke="#0052CC" 
                        strokeWidth={2}
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bandwidth Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Bandwidth Usage</CardTitle>
                <CardDescription>Network traffic over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bandwidthUsageData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis unit="GB" />
                      <Tooltip 
                        formatter={(value) => [`${value} GB`, ""]}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="download" 
                        stroke="#0052CC" 
                        fill="#0052CC" 
                        fillOpacity={0.2} 
                        name="Download" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="upload" 
                        stroke="#00B8D9" 
                        fill="#00B8D9" 
                        fillOpacity={0.2} 
                        name="Upload" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Device Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>Breakdown of device types on the network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        formatter={(value) => [`${value} devices`, ""]}
                      />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Devices" 
                        radius={[0, 4, 4, 0]}
                      >
                        {deviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generated Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                View and export your previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !reports || reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Reports</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    You haven't generated any reports yet. Create your first report to get started.
                  </p>
                  <Button 
                    className="mt-6"
                    onClick={() => setIsNewReportOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Time Range</TableHead>
                        <TableHead>Created On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.title}</TableCell>
                          <TableCell>
                            {report.timeRange === "24h" 
                              ? "Last 24 Hours" 
                              : report.timeRange === "7d" 
                                ? "Last 7 Days" 
                                : "Last 30 Days"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(report.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedReport(report)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => 
                                  exportReportMutation.mutate({
                                    reportId: report.id,
                                    format: "pdf"
                                  })
                                }
                                disabled={exportReportMutation.isPending}
                              >
                                {exportReportMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* New Report Dialog */}
      <Dialog open={isNewReportOpen} onOpenChange={setIsNewReportOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate New Report</DialogTitle>
            <DialogDescription>
              Configure and generate a network performance report
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReport)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Monthly Network Status" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="24h">Last 24 Hours</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deviceTypes"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Device Types (Optional)</FormLabel>
                      <FormDescription>
                        Select which device types to include in the report
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {["Routers", "Access Points", "Switches", "Servers", "Printers", "IP Cameras"].map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="deviceTypes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={type}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(type)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, type]);
                                      } else {
                                        field.onChange(
                                          currentValue.filter((value) => value !== type)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {type}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeOfflineDevices"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Include Offline Devices</FormLabel>
                      <FormDescription>
                        Include data for devices that are currently offline
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Export Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewReportOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createReportMutation.isPending}
                >
                  {createReportMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Report"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Report View Dialog */}
      <Dialog open={selectedReport !== null} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReport.title}</DialogTitle>
                <DialogDescription>
                  Generated on {format(new Date(selectedReport.createdAt), "MMMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Report Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Time Range:</span>{" "}
                      {selectedReport.timeRange === "24h" 
                        ? "Last 24 Hours" 
                        : selectedReport.timeRange === "7d" 
                          ? "Last 7 Days" 
                          : "Last 30 Days"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created By:</span> You
                    </div>
                    <div>
                      <span className="text-muted-foreground">Filters:</span>{" "}
                      {selectedReport.filters && Object.keys(selectedReport.filters).length > 0
                        ? "Custom"
                        : "None"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Format:</span> PDF
                    </div>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted px-4 py-2 border-b">
                    <h3 className="text-sm font-medium">Report Preview</h3>
                  </div>
                  <div className="p-4">
                    <div className="aspect-video bg-background rounded-md border flex items-center justify-center">
                      <div className="text-center p-4">
                        <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Report preview available in PDF format
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => 
                    exportReportMutation.mutate({
                      reportId: selectedReport.id,
                      format: "pdf"
                    })
                  }
                  disabled={exportReportMutation.isPending}
                >
                  {exportReportMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
