import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

// Pages
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import DevicesPage from "@/pages/devices-page";
import DeviceDetailsPage from "@/pages/device-details-page";
import ReportsPage from "@/pages/reports-page";
import NetworkPlanningPage from "@/pages/network-planning-page";
import NetworkPlanningDetailPage from "@/pages/network-planning-detail-page";
import RoutersPage from "@/pages/routers-page";
import RouterDetailsPage from "@/pages/router-details-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/devices" component={DevicesPage} />
      <ProtectedRoute path="/devices/:id" component={DeviceDetailsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/network-planning" component={NetworkPlanningPage} />
      <ProtectedRoute path="/network-planning/:id" component={NetworkPlanningDetailPage} />
      <ProtectedRoute path="/network-planning/:id/edit" component={NetworkPlanningDetailPage} />
      <ProtectedRoute path="/routers" component={RoutersPage} />
      <ProtectedRoute path="/routers/:id" component={RouterDetailsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
