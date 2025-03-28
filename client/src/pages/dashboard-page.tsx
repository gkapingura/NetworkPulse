import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import NetworkSummary from "@/components/dashboard/network-summary";
import LatencyChart from "@/components/dashboard/latency-chart";
import AlertsPanel from "@/components/dashboard/alerts-panel";
import DevicesList from "@/components/dashboard/devices-list";
import BandwidthUsage from "@/components/dashboard/bandwidth-usage";
import TopDevices from "@/components/dashboard/top-devices";

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
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
          {/* Network Summary */}
          <NetworkSummary />

          {/* Latency Chart & Alerts Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="md:col-span-2">
              <LatencyChart />
            </div>
            <div>
              <AlertsPanel />
            </div>
          </div>

          {/* Device Status Table */}
          <DevicesList />

          {/* Bandwidth Usage & Top Devices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <BandwidthUsage />
            <TopDevices />
          </div>
        </main>
      </div>
    </div>
  );
}
