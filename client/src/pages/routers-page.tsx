import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Router, 
  RouterIspConnection,
  RouterPingResult
} from "@shared/schema";
import { useEffect, useState } from "react";
import { 
  Wifi as NetworkOff, 
  Globe, 
  Activity, 
  Database, 
  Wifi, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  CheckCircle, 
  XCircle,
  BarChart4,
  Download,
  CalendarDays,
  Clock,
  Pin,
  Layers,
  Network,
  Cog,
  Cpu
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

type RouterWithConnections = Router & {
  connections: RouterIspConnection[];
  pingResults?: RouterPingResult[];
};

export default function RoutersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [groupBy, setGroupBy] = useState("location");
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  
  const { data: routers, isLoading } = useQuery<Router[]>({
    queryKey: ["/api/routers"],
    queryFn: getQueryFn(),
  });
  
  const { data: connections, isLoading: isLoadingConnections } = useQuery<RouterIspConnection[]>({
    queryKey: ["/api/router-connections"],
    queryFn: async () => {
      let allConnections: RouterIspConnection[] = [];
      
      // Fetch connections for each router
      if (routers) {
        for (const router of routers) {
          const res = await apiRequest("GET", `/api/routers/${router.id}/isp-connections`);
          const routerConnections = await res.json();
          allConnections = [...allConnections, ...routerConnections];
        }
      }
      
      return allConnections;
    },
    enabled: !!routers && routers.length > 0,
  });
  
  // Merge routers with their connections
  const routersWithConnections: RouterWithConnections[] = routers ? routers.map(router => ({
    ...router,
    connections: connections?.filter(conn => conn.routerId === router.id) || []
  })) : [];
  
  // Groups routers by the selected criteria
  const groupedRouters = groupRouters(routersWithConnections, groupBy);
  
  // Function to ping a router
  const pingMutation = useMutation({
    mutationFn: async (routerId: number) => {
      const res = await apiRequest("POST", `/api/routers/${routerId}/ping`);
      return await res.json();
    },
    onSuccess: (data, routerId) => {
      toast({
        title: "Ping successful",
        description: "Router ping completed successfully.",
      });
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
  
  // Fetch ping results for selected router
  const { data: pingResults, isLoading: isLoadingPingResults } = useQuery<RouterPingResult[]>({
    queryKey: [`/api/routers/${selectedRouterId}/ping-results`],
    queryFn: async () => {
      if (!selectedRouterId) return [];
      const res = await apiRequest("GET", `/api/routers/${selectedRouterId}/ping-results`);
      return await res.json();
    },
    enabled: selectedRouterId !== null,
  });
  
  // Handle router selection for viewing ping results
  const handleViewPingResults = (routerId: number) => {
    setSelectedRouterId(routerId);
  };
  
  // Handle pinging a router
  const handlePingRouter = (routerId: number) => {
    pingMutation.mutate(routerId);
    setSelectedRouterId(routerId);
  };
  
  // Schedule frequency state
  const [scheduleFrequency, setScheduleFrequency] = useState("1h");
  const [cronSchedule, setCronSchedule] = useState("");
  const [reportFrequency, setReportFrequency] = useState("none");
  const [emailRecipients, setEmailRecipients] = useState("");
  
  // Handle scheduling for a router
  const scheduleMutation = useMutation({
    mutationFn: async (params: { routerId: number; frequency: string; cronSchedule?: string }) => {
      const res = await apiRequest("POST", `/api/routers/${params.routerId}/schedule`, {
        frequency: params.frequency,
        cronSchedule: params.cronSchedule
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule updated",
        description: "Router ping schedule has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/routers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle report configuration for a router
  const reportMutation = useMutation({
    mutationFn: async (params: { routerId: number; frequency: string; emailRecipients: string }) => {
      const res = await apiRequest("POST", `/api/routers/${params.routerId}/report-config`, {
        frequency: params.frequency,
        emailRecipients: params.emailRecipients.split(",").map(email => email.trim())
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report settings updated",
        description: "Automated report settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update report settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Save ping schedule
  const handleSaveSchedule = () => {
    if (selectedRouterId) {
      scheduleMutation.mutate({
        routerId: selectedRouterId,
        frequency: scheduleFrequency,
        cronSchedule: scheduleFrequency === 'custom' ? cronSchedule : undefined
      });
    }
  };
  
  // Save report settings
  const handleSaveReportSettings = () => {
    if (selectedRouterId) {
      reportMutation.mutate({
        routerId: selectedRouterId,
        frequency: reportFrequency,
        emailRecipients: emailRecipients
      });
    }
  };
  
  function getQueryFn() {
    return async () => {
      const res = await apiRequest("GET", "/api/routers");
      if (!res.ok) {
        throw new Error("Failed to fetch routers");
      }
      return res.json();
    };
  }
  
  // Group routers by the selected criteria
  function groupRouters(routers: RouterWithConnections[], groupBy: string) {
    const grouped: Record<string, RouterWithConnections[]> = {};
    
    routers.forEach(router => {
      let key = "Other";
      
      if (groupBy === "location") {
        key = router.location || "Unknown Location";
      } 
      else if (groupBy === "isp") {
        // Group by ISPs used (can be in multiple groups)
        router.connections.forEach(conn => {
          const ispProvider = conn.provider || "Unknown Provider";
          if (!grouped[ispProvider]) {
            grouped[ispProvider] = [];
          }
          if (!grouped[ispProvider].find(r => r.id === router.id)) {
            grouped[ispProvider].push(router);
          }
        });
        
        // Also add to a group for routers without ISP connections
        if (router.connections.length === 0) {
          if (!grouped["No ISP"]) {
            grouped["No ISP"] = [];
          }
          grouped["No ISP"].push(router);
        }
        
        return grouped; // Return early as we've already grouped
      }
      else if (groupBy === "model") {
        key = router.model || "Unknown Model";
      }
      else if (groupBy === "status") {
        key = router.monitoringEnabled ? "Monitoring Enabled" : "Monitoring Disabled";
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(router);
    });
    
    return grouped;
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Router Monitoring</h1>
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {[1, 2].map(j => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  // Import Mutation
  const importRoutersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/import-routers`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Import successful",
        description: "Routers imported successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/routers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/router-connections"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Router Monitoring</h1>
        
        <div className="flex items-center gap-4">
          <Select
            value={groupBy}
            onValueChange={value => setGroupBy(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="location">Group by Location</SelectItem>
              <SelectItem value="isp">Group by ISP</SelectItem>
              <SelectItem value="model">Group by Model</SelectItem>
              <SelectItem value="status">Group by Status</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline"
            onClick={() => importRoutersMutation.mutate()}
            disabled={importRoutersMutation.isPending}
          >
            {importRoutersMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Server className="mr-2 h-4 w-4" />
                Import Sample Routers
              </>
            )}
          </Button>
          
          <Link href="/routers/add">
            <Button>
              <Server className="mr-2 h-4 w-4" />
              Add Router
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Router groups */}
      <div className="grid gap-6">
        {Object.entries(groupedRouters).map(([groupName, groupRouters]) => (
          <Card key={groupName} className="w-full">
            <CardHeader>
              <CardTitle>{groupName}</CardTitle>
              <CardDescription>{groupRouters.length} routers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupRouters.map(router => (
                  <RouterCard 
                    key={router.id} 
                    router={router} 
                    onViewPingResults={() => handleViewPingResults(router.id)}
                    onPing={() => handlePingRouter(router.id)}
                    isPinging={pingMutation.isPending && selectedRouterId === router.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {Object.keys(groupedRouters).length === 0 && (
          <div className="text-center p-12 border rounded-lg">
            <NetworkOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">No Routers Found</h3>
            <p className="text-muted-foreground mb-4">
              You haven't added any routers to monitor yet.
            </p>
            <Link href="/routers/add">
              <Button>
                <Server className="mr-2 h-4 w-4" />
                Add Your First Router
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* Ping Results Dialog */}
      {selectedRouterId && (
        <Dialog open={selectedRouterId !== null} onOpenChange={(open) => !open && setSelectedRouterId(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Router Ping Results
                {routersWithConnections.find(r => r.id === selectedRouterId)?.name && (
                  <span> - {routersWithConnections.find(r => r.id === selectedRouterId)?.name}</span>
                )}
              </DialogTitle>
              <DialogDescription>
                View ping statistics for this router and its ISP connections
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Latest Ping Results</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePingRouter(selectedRouterId)}
                  disabled={pingMutation.isPending}
                >
                  {pingMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Pinging...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Ping Now
                    </>
                  )}
                </Button>
              </div>
              
              {isLoadingPingResults ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
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
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pingResults.map(result => {
                      // Group results by IP and show only the most recent for each IP
                      const connectionName = result.isp || "Main Router";
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{connectionName}</TableCell>
                          <TableCell>{result.ipAddress}</TableCell>
                          <TableCell>
                            {result.successful ? (
                              <Badge className="bg-green-100 text-green-800">
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
                            {result.latency !== null ? 
                              (typeof result.latency === 'number' 
                                ? `${result.latency.toFixed(2)} ms` 
                                : `${result.latency} ms`) 
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {result.packetLoss !== null ? 
                              (typeof result.packetLoss === 'number' 
                                ? `${result.packetLoss.toFixed(1)}%` 
                                : `${result.packetLoss}%`) 
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No ping results available</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => handlePingRouter(selectedRouterId)}
                    disabled={pingMutation.isPending}
                  >
                    {pingMutation.isPending ? "Pinging..." : "Ping Now"}
                  </Button>
                </div>
              )}
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Router Information</h3>
                {routersWithConnections.find(r => r.id === selectedRouterId) && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Details</h4>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm text-muted-foreground">Name</dt>
                          <dd>{routersWithConnections.find(r => r.id === selectedRouterId)?.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Location</dt>
                          <dd>{routersWithConnections.find(r => r.id === selectedRouterId)?.location || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Primary IP</dt>
                          <dd>{routersWithConnections.find(r => r.id === selectedRouterId)?.ipAddress}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Model</dt>
                          <dd>{routersWithConnections.find(r => r.id === selectedRouterId)?.model || 'Unknown'}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">ISP Connections</h4>
                      {routersWithConnections.find(r => r.id === selectedRouterId)?.connections.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No ISP connections configured</p>
                      ) : (
                        <ul className="space-y-2">
                          {routersWithConnections.find(r => r.id === selectedRouterId)?.connections.map(conn => (
                            <li key={conn.id} className="flex justify-between text-sm">
                              <span>{conn.name}</span>
                              <span className="text-muted-foreground">{conn.ipAddress}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Ping Schedule</h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium flex items-center mb-3">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Schedule Configuration
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Frequency</label>
                      <select 
                        className="w-full border rounded p-2"
                        value={scheduleFrequency}
                        onChange={(e) => setScheduleFrequency(e.target.value)}
                      >
                        <option value="15m">Every 15 minutes</option>
                        <option value="30m">Every 30 minutes</option>
                        <option value="1h">Every hour</option>
                        <option value="6h">Every 6 hours</option>
                        <option value="12h">Every 12 hours</option>
                        <option value="24h">Once a day</option>
                        <option value="custom">Custom schedule</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Custom Cron Schedule (optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 0 */4 * * *" 
                        className="w-full border rounded p-2"
                        value={cronSchedule}
                        onChange={(e) => setCronSchedule(e.target.value)}
                        disabled={scheduleFrequency !== 'custom'}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Format: minute hour day month weekday</p>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        size="sm"
                        onClick={handleSaveSchedule}
                        disabled={scheduleMutation.isPending}
                      >
                        {scheduleMutation.isPending ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Cog className="h-3 w-3 mr-1" />
                            Save Schedule
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium flex items-center mb-3">
                    <BarChart4 className="h-4 w-4 mr-2" />
                    Automated Reports
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Report Frequency</label>
                      <select 
                        className="w-full border rounded p-2"
                        value={reportFrequency}
                        onChange={(e) => setReportFrequency(e.target.value)}
                      >
                        <option value="none">No automatic reports</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Email Recipients</label>
                      <input 
                        type="text" 
                        placeholder="email@example.com, another@example.com" 
                        className="w-full border rounded p-2"
                        value={emailRecipients}
                        onChange={(e) => setEmailRecipients(e.target.value)}
                        disabled={reportFrequency === 'none'}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Separate multiple email addresses with commas</p>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        size="sm"
                        onClick={handleSaveReportSettings}
                        disabled={reportMutation.isPending}
                      >
                        {reportMutation.isPending ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1" />
                            Save Report Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Link href={`/routers/${selectedRouterId}/reports`}>
                <Button variant="outline">View Reports</Button>
              </Link>
              <Link href={`/routers/${selectedRouterId}/edit`}>
                <Button variant="outline">Edit Router</Button>
              </Link>
              <Button onClick={() => setSelectedRouterId(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Router Card Component
function RouterCard({ 
  router, 
  onViewPingResults, 
  onPing,
  isPinging
}: { 
  router: RouterWithConnections;
  onViewPingResults: () => void; 
  onPing: () => void;
  isPinging: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{router.name}</span>
          {router.monitoringEnabled ? (
            <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
              <Activity className="h-3 w-3 mr-1" />
              Monitoring On
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2">
              <Activity className="h-3 w-3 mr-1" />
              Monitoring Off
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          <div className="flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            {router.location || 'No location'}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">IP Address:</span>
            <span className="font-mono">{router.ipAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model:</span>
            <span>{router.model || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ISP Connections:</span>
            <span>{router.connections.length}</span>
          </div>
        </div>
        
        {/* ISP Connections */}
        {router.connections.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">ISP Connections</div>
            <div className="space-y-2">
              {router.connections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <Wifi className="h-3 w-3 mr-1" />
                    <span>{conn.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {conn.provider || 'Unknown ISP'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pb-4 pt-2 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={onViewPingResults}
        >
          <Database className="h-3 w-3 mr-1" />
          View Status
        </Button>
        <Button 
          size="sm" 
          className="w-full" 
          onClick={onPing}
          disabled={isPinging}
        >
          {isPinging ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Pinging...
            </>
          ) : (
            <>
              <Activity className="h-3 w-3 mr-1" />
              Ping
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}