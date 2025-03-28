import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert as AlertType } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

export default function AlertsPanel() {
  const { data: alerts, isLoading, error } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const resolveAllMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would call an API to resolve all alerts
      // For now, we'll resolve them one by one
      if (alerts) {
        for (const alert of alerts) {
          if (!alert.resolved) {
            await apiRequest("POST", `/api/alerts/${alert.id}/resolve`);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("POST", `/api/alerts/${alertId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  // Alert icon mapping
  const severityIcons = {
    error: <AlertCircle className="text-destructive h-5 w-5" />,
    warning: <AlertTriangle className="text-warning h-5 w-5" />,
    info: <Info className="text-primary h-5 w-5" />
  };

  // Alert border/bg styles
  const severityStyles = {
    error: "border-destructive border-opacity-50 bg-destructive bg-opacity-5",
    warning: "border-warning border-opacity-50 bg-warning bg-opacity-5",
    info: "border-primary border-opacity-50 bg-primary bg-opacity-5"
  };

  // Format the timestamp
  const formatTimestamp = (timestamp: Date) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  return (
    <Card className="bg-white h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Recent Alerts</h2>
          <Button 
            variant="link" 
            className="text-primary text-sm font-medium p-0"
          >
            View All
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-3 border border-destructive border-opacity-50 bg-destructive bg-opacity-5 rounded-md">
            <p className="text-sm text-destructive">Error loading alerts: {error.message}</p>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id} 
                className={`flex p-3 border rounded-md ${severityStyles[alert.severity as keyof typeof severityStyles]}`}
              >
                <div className="mr-3">
                  {severityIcons[alert.severity as keyof typeof severityIcons]}
                </div>
                <div className="flex-grow">
                  <h3 className="text-sm font-medium text-foreground">{alert.message}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(alert.timestamp)}
                  </p>
                </div>
                {!alert.resolved && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => resolveAlertMutation.mutate(alert.id)}
                    disabled={resolveAlertMutation.isPending}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            ))}

            <Button
              className="w-full py-2 text-sm font-medium bg-primary bg-opacity-5 hover:bg-opacity-10"
              variant="ghost"
              onClick={() => resolveAllMutation.mutate()}
              disabled={resolveAllMutation.isPending || (alerts && alerts.every(a => a.resolved))}
            >
              {resolveAllMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resolving...
                </div>
              ) : (
                "Resolve All Alerts"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <CheckCircle className="h-8 w-8 mb-2 text-success" />
            <p>No active alerts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Importing this at the component level to avoid circular dependency
import { CheckCircle } from "lucide-react";
