import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Router, 
  RouterIspConnection,
  RouterPingResult,
  RouterReport
} from "@shared/schema";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, Server, Activity, Download, RefreshCw, 
  Wifi, Clock, SendHorizonal, Settings, Calendar,
  CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define report generation form
const reportFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  days: z.number().min(1).max(90),
  message: z.string().optional(),
  emailRecipients: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

export default function RouterDetailsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const routerId = parseInt(id, 10);
  const [activeTab, setActiveTab] = useState("overview");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      days: 7,
      message: "",
      emailRecipients: "",
    },
  });
  
  const { 
    data: router, 
    isLoading: isLoadingRouter,
    error: routerError
  } = useQuery<Router>({
    queryKey: [`/api/routers/${routerId}`],
    queryFn: async () => {
      if (isNaN(routerId)) {
        throw new Error("Invalid router ID");
      }
      const res = await apiRequest("GET", `/api/routers/${routerId}`);
      if (!res.ok) {
        throw new Error("Router not found");
      }
      return res.json();
    },
  });
  
  const { 
    data: connections, 
    isLoading: isLoadingConnections 
  } = useQuery<RouterIspConnection[]>({
    queryKey: [`/api/routers/${routerId}/isp-connections`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/routers/${routerId}/isp-connections`);
      return res.json();
    },
    enabled: !!router,
  });
  
  const { 
    data: pingResults, 
    isLoading: isLoadingPingResults 
  } = useQuery<RouterPingResult[]>({
    queryKey: [`/api/routers/${routerId}/ping-results`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/routers/${routerId}/ping-results`);
      return res.json();
    },
    enabled: !!router,
  });
  
  const { 
    data: reports, 
    isLoading: isLoadingReports 
  } = useQuery<RouterReport[]>({
    queryKey: [`/api/routers/${routerId}/reports`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/routers/${routerId}/reports`);
      return res.json();
    },
    enabled: !!router,
  });
  
  // Ping mutation
  const pingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/routers/${routerId}/ping`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ping successful",
        description: "Router ping completed successfully",
      });
      // Refresh ping results
      queryClient.invalidateQueries({ queryKey: [`/api/routers/${routerId}/ping-results`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ping failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: ReportFormValues) => {
      // Calculate start and end dates
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - data.days);
      
      const payload = {
        title: data.title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        message: data.message || "",
        emailRecipients: data.emailRecipients ? data.emailRecipients.split(",").map(e => e.trim()) : []
      };
      
      const res = await apiRequest("POST", `/api/routers/${routerId}/reports`, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report generated",
        description: "Router performance report was generated successfully",
      });
      setIsGeneratingReport(false);
      // Refresh reports
      queryClient.invalidateQueries({ queryKey: [`/api/routers/${routerId}/reports`] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Report generation failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGeneratingReport(false);
    },
  });
  
  // Handle form submission for report generation
  function onSubmitReportForm(values: ReportFormValues) {
    generateReportMutation.mutate(values);
  }
  
  // Set report form title when router is loaded
  useEffect(() => {
    if (router) {
      form.setValue("title", `Performance Report for ${router.name}`);
    }
  }, [router, form]);
  
  if (isLoadingRouter) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-4" onClick={() => navigate("/routers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-60" />
        </div>
        
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  
  if (routerError || !router) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-4" onClick={() => navigate("/routers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Router Not Found</h1>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-2">Router Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The router you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => navigate("/routers")}>
                Back to Routers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Group ping results by IP address
  const pingResultsByIp = pingResults?.reduce((acc, result) => {
    if (!acc[result.ipAddress]) {
      acc[result.ipAddress] = [];
    }
    acc[result.ipAddress].push(result);
    return acc;
  }, {} as Record<string, RouterPingResult[]>) || {};
  
  // For each IP, get only the most recent ping result
  const latestPingResults = Object.values(pingResultsByIp).map(results => {
    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  });
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-4" onClick={() => navigate("/routers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{router.name}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => pingMutation.mutate()} 
            disabled={pingMutation.isPending}
          >
            {pingMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Pinging...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Ping Now
              </>
            )}
          </Button>
          
          <Button onClick={() => setIsGeneratingReport(true)}>
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Router Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/routers/${routerId}/edit`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Router
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/routers/${routerId}/schedule`}>
                  <Clock className="h-4 w-4 mr-2" />
                  Edit Schedule
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/routers/${routerId}/connections`}>
                  <Wifi className="h-4 w-4 mr-2" />
                  Manage ISP Connections
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Router Details Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">IP Address</div>
              <div className="font-mono">{router.ipAddress}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Location</div>
              <div>{router.location || 'No location'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Model</div>
              <div>{router.model || 'Unknown'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div>
                {router.monitoringEnabled ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <Activity className="h-3 w-3 mr-1" />
                    Monitoring Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Activity className="h-3 w-3 mr-1" />
                    Monitoring Disabled
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Schedule info if available */}
          {router.scheduleConfig && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-medium mb-2">Monitoring Schedule</h3>
              <div className="bg-muted p-3 rounded-md">
                {router.scheduleConfig.type === 'daily' && router.scheduleConfig.times && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Daily at {router.scheduleConfig.times.join(', ')}</span>
                  </div>
                )}
                
                {router.scheduleConfig.type === 'interval' && router.scheduleConfig.interval && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Every {router.scheduleConfig.interval}</span>
                  </div>
                )}
                
                {router.scheduleConfig.type === 'cron' && router.scheduleConfig.cronExpression && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Custom schedule: {router.scheduleConfig.cronExpression}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ping-results">Ping Results</TabsTrigger>
          <TabsTrigger value="isp-connections">ISP Connections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Latest Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Latest Status</CardTitle>
                <CardDescription>
                  Current status of the router and its connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPingResults ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : latestPingResults.length > 0 ? (
                  <div className="space-y-4">
                    {latestPingResults.map(result => {
                      const connection = connections?.find(c => c.ipAddress === result.ipAddress);
                      const connectionName = connection?.name || (result.ipAddress === router.ipAddress ? "Main Router" : result.isp || "Unknown");
                      
                      return (
                        <div 
                          key={result.id} 
                          className={`p-4 rounded-lg border ${
                            result.successful ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{connectionName}</div>
                            {result.successful ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Offline
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {result.ipAddress}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">Latency</div>
                              <div>{result.latency !== null ? `${result.latency.toFixed(2)} ms` : 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Packet Loss</div>
                              <div>{result.packetLoss !== null ? `${result.packetLoss.toFixed(1)}%` : 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Last Check</div>
                              <div>{new Date(result.timestamp).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-6 border rounded-lg">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No ping results available</p>
                    <Button 
                      variant="outline" 
                      onClick={() => pingMutation.mutate()} 
                      disabled={pingMutation.isPending}
                    >
                      {pingMutation.isPending ? "Pinging..." : "Ping Now"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* ISP Connections Card */}
            <Card>
              <CardHeader>
                <CardTitle>ISP Connections</CardTitle>
                <CardDescription>
                  Configured ISP connections for this router
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConnections ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : connections && connections.length > 0 ? (
                  <div className="space-y-4">
                    {connections.map(connection => (
                      <div 
                        key={connection.id} 
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{connection.name}</div>
                          <Badge variant={connection.isActive ? "outline" : "secondary"}>
                            {connection.isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {connection.ipAddress}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Provider</div>
                            <div>{connection.provider || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Bandwidth</div>
                            <div>{connection.bandwidth || 'Not specified'}</div>
                          </div>
                        </div>
                        
                        {connection.notes && (
                          <div className="mt-2 text-sm">
                            <div className="text-muted-foreground">Notes</div>
                            <div>{connection.notes}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border rounded-lg">
                    <Wifi className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No ISP connections configured</p>
                    <Link href={`/routers/${routerId}/connections`}>
                      <Button variant="outline">
                        Add ISP Connection
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Recent Reports Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Recently generated performance reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReports ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : reports && reports.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Time Range</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.slice(0, 5).map(report => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.title}</TableCell>
                          <TableCell>{report.timeRange}</TableCell>
                          <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            {report.emailSent ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                <SendHorizonal className="h-3 w-3 mr-1" />
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Not Sent
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/routers/${routerId}/reports/${report.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center p-6 border rounded-lg">
                    <Download className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No reports generated yet</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsGeneratingReport(true)}
                    >
                      Generate Report
                    </Button>
                  </div>
                )}
                
                {reports && reports.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                      <Link href="#reports" onClick={() => setActiveTab("reports")}>
                        View All Reports
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Ping Results Tab */}
        <TabsContent value="ping-results">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Ping Results</CardTitle>
                  <CardDescription>
                    Historical ping results for this router
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => pingMutation.mutate()} 
                  disabled={pingMutation.isPending}
                >
                  {pingMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Pinging...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      Ping Now
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPingResults ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : pingResults && pingResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Connection</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Packet Loss</TableHead>
                      <TableHead>Jitter</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Group by connection and sort by time */}
                    {pingResults
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(result => {
                        const connection = connections?.find(c => c.ipAddress === result.ipAddress);
                        const connectionName = connection?.name || (result.ipAddress === router.ipAddress ? "Main Router" : result.isp || "Unknown");
                        
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">{connectionName}</TableCell>
                            <TableCell className="font-mono text-xs">{result.ipAddress}</TableCell>
                            <TableCell>
                              {result.successful ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {result.latency !== null ? `${result.latency.toFixed(2)} ms` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {result.packetLoss !== null ? `${result.packetLoss.toFixed(1)}%` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {result.jitter !== null ? `${result.jitter.toFixed(2)} ms` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {new Date(result.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-12 border rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">No Ping Results</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no ping results for this router yet.
                  </p>
                  <Button 
                    onClick={() => pingMutation.mutate()}
                    disabled={pingMutation.isPending}
                  >
                    {pingMutation.isPending ? "Pinging..." : "Ping Now"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ISP Connections Tab */}
        <TabsContent value="isp-connections">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>ISP Connections</CardTitle>
                  <CardDescription>
                    Manage ISP connections for this router
                  </CardDescription>
                </div>
                <Link href={`/routers/${routerId}/connections/add`}>
                  <Button>
                    <Wifi className="h-4 w-4 mr-2" />
                    Add Connection
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingConnections ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : connections && connections.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {connections.map(connection => (
                    <Card key={connection.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle>{connection.name}</CardTitle>
                          <Badge variant={connection.isActive ? "outline" : "secondary"}>
                            {connection.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription>{connection.provider || 'Unknown Provider'}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-x-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">IP Address</div>
                              <div className="font-mono">{connection.ipAddress}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Bandwidth</div>
                              <div>{connection.bandwidth || 'Not specified'}</div>
                            </div>
                          </div>
                          
                          {connection.notes && (
                            <div>
                              <div className="text-muted-foreground text-sm">Notes</div>
                              <div className="text-sm">{connection.notes}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Link href={`/routers/${routerId}/connections/${connection.id}/edit`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 border rounded-lg">
                  <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">No ISP Connections</h3>
                  <p className="text-muted-foreground mb-4">
                    This router doesn't have any ISP connections configured yet.
                  </p>
                  <Link href={`/routers/${routerId}/connections/add`}>
                    <Button>
                      Add Your First Connection
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Router Reports</CardTitle>
                  <CardDescription>
                    Generated performance reports for this router
                  </CardDescription>
                </div>
                <Button onClick={() => setIsGeneratingReport(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : reports && reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Time Range</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Email Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.title}</TableCell>
                        <TableCell>{report.timeRange}</TableCell>
                        <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {report.emailSent ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <SendHorizonal className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Not Sent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/routers/${routerId}/reports/${report.id}`}>
                                View
                              </Link>
                            </Button>
                            
                            {!report.emailSent && report.emailRecipients && (
                              <Button variant="outline" size="sm">
                                <SendHorizonal className="h-3 w-3 mr-1" />
                                Send Email
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-12 border rounded-lg">
                  <Download className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">No Reports</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't generated any performance reports for this router yet.
                  </p>
                  <Button onClick={() => setIsGeneratingReport(true)}>
                    Generate Your First Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Generate Report Dialog */}
      <Dialog open={isGeneratingReport} onOpenChange={setIsGeneratingReport}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Router Report</DialogTitle>
            <DialogDescription>
              Create a performance report for this router
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReportForm)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Performance Report" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Period (Days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={90} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of days to include in the report (1-90)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes for this report..." 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emailRecipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Recipients (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="email1@example.com, email2@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of email addresses
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsGeneratingReport(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={generateReportMutation.isPending}>
                  {generateReportMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}