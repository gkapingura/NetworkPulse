import { useQuery } from "@tanstack/react-query";
import { Loader2, Router, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface NetworkSummaryData {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  onlinePercentage: number;
  activeAlerts: number;
}

export default function NetworkSummary() {
  const { data, isLoading, error } = useQuery<NetworkSummaryData>({
    queryKey: ["/api/network/summary"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardContent className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md">
        Error loading network summary: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card className="bg-white">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary rounded-md p-3">
              <Router className="h-5 w-5 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">Total Devices</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">{data.totalDevices}</div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-success rounded-md p-3">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">Online Devices</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">{data.onlineDevices}</div>
                  <p className="ml-2 flex items-baseline text-sm font-semibold text-success">
                    <span className="sr-only">Percentage</span>
                    {data.onlinePercentage.toFixed(1)}%
                  </p>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-destructive rounded-md p-3">
              <XCircle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">Offline Devices</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">{data.offlineDevices}</div>
                  {data.totalDevices > 0 && (
                    <p className="ml-2 flex items-baseline text-sm font-semibold text-destructive">
                      <span className="sr-only">Percentage</span>
                      {((data.offlineDevices / data.totalDevices) * 100).toFixed(1)}%
                    </p>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-warning rounded-md p-3">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">Active Alerts</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">{data.activeAlerts}</div>
                </dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
