import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DeviceWithStatus } from "@shared/schema";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/ui/status-badge";
import { AddDeviceDialog } from "@/components/devices/add-device-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  MoreVertical,
  Plus,
  Router,
  Wifi,
  Server,
  Printer,
  Cctv,
  Smartphone,
  RefreshCw,
  Edit,
  Trash2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export default function DevicesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null);
  const pageSize = 10;
  
  const { toast } = useToast();

  const { data: devices, isLoading, error } = useQuery<DeviceWithStatus[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device deleted",
        description: "The device has been removed successfully",
      });
      setDeviceToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check device mutation
  const checkDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/devices/${id}/check`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
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

  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Filter is applied below
  }

  // Filter devices based on search query and type filter
  const filteredDevices = devices ? devices.filter(device => {
    const matchesSearch = searchQuery === "" || 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = deviceFilter === "all" || device.type === deviceFilter;
    
    return matchesSearch && matchesType;
  }) : [];

  // Paginate filtered devices
  const totalPages = Math.ceil(filteredDevices.length / pageSize);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Get device icon based on type
  const getDeviceIcon = (type: string) => {
    const iconProps = { className: "h-5 w-5 text-primary" };
    
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
            <h1 className="text-2xl font-bold mb-4 md:mb-0">Device Management</h1>
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="relative flex-grow">
                <Input
                  type="text"
                  placeholder="Search devices..."
                  className="w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
              <div className="flex gap-2">
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="w-[180px]">
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
                <Button onClick={() => setIsAddDeviceOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Device List</CardTitle>
              <CardDescription>
                {filteredDevices.length} devices found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="p-4 text-destructive bg-destructive/10 rounded-md">
                  Error loading devices: {error.message}
                </div>
              ) : paginatedDevices.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery || deviceFilter !== "all" 
                    ? "No devices match your current filters." 
                    : "No devices found. Add a device to get started."}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Device</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Latency</TableHead>
                          <TableHead>Uptime</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDevices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="py-3">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                  {getDeviceIcon(device.type)}
                                </div>
                                <div>
                                  <div className="font-medium">{device.name}</div>
                                  <div className="text-xs text-muted-foreground">{device.location || device.type}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{device.ipAddress}</TableCell>
                            <TableCell>
                              <StatusBadge status={device.status} />
                            </TableCell>
                            <TableCell>{device.latency ? `${device.latency}ms` : "--"}</TableCell>
                            <TableCell>{device.uptime || "--"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  title="Check status"
                                  onClick={() => checkDeviceMutation.mutate(device.id)}
                                  disabled={checkDeviceMutation.isPending}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Link href={`/devices/${device.id}`}>
                                  <Button variant="outline" size="icon" title="View details">
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.5 11C4.80285 11 2.52952 9.62184 1.09622 7.50001C2.52952 5.37816 4.80285 4 7.5 4C10.1971 4 12.4705 5.37816 13.9038 7.50001C12.4705 9.62183 10.1971 11 7.5 11ZM7.5 3C4.30786 3 1.65639 4.70638 0.0760002 7.23501C-0.0253338 7.39715 -0.0253334 7.60288 0.0760006 7.76501C1.65639 10.2936 4.30786 12 7.5 12C10.6921 12 13.3436 10.2936 14.924 7.76501C15.0253 7.60288 15.0253 7.39715 14.924 7.23501C13.3436 4.70638 10.6921 3 7.5 3ZM7.5 9.5C8.60457 9.5 9.5 8.60457 9.5 7.5C9.5 6.39543 8.60457 5.5 7.5 5.5C6.39543 5.5 5.5 6.39543 5.5 7.5C5.5 8.60457 6.39543 9.5 7.5 9.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                    </svg>
                                  </Button>
                                </Link>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <Link href={`/devices/${device.id}`}>
                                      <DropdownMenuItem>
                                        <svg
                                          className="mr-2 h-4 w-4"
                                          width="15"
                                          height="15"
                                          viewBox="0 0 15 15"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M7.5 11C4.80285 11 2.52952 9.62184 1.09622 7.50001C2.52952 5.37816 4.80285 4 7.5 4C10.1971 4 12.4705 5.37816 13.9038 7.50001C12.4705 9.62183 10.1971 11 7.5 11ZM7.5 3C4.30786 3 1.65639 4.70638 0.0760002 7.23501C-0.0253338 7.39715 -0.0253334 7.60288 0.0760006 7.76501C1.65639 10.2936 4.30786 12 7.5 12C10.6921 12 13.3436 10.2936 14.924 7.76501C15.0253 7.60288 15.0253 7.39715 14.924 7.23501C13.3436 4.70638 10.6921 3 7.5 3ZM7.5 9.5C8.60457 9.5 9.5 8.60457 9.5 7.5C9.5 6.39543 8.60457 5.5 7.5 5.5C6.39543 5.5 5.5 6.39543 5.5 7.5C5.5 8.60457 6.39543 9.5 7.5 9.5Z"
                                            fill="currentColor"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                          ></path>
                                        </svg>
                                        View Details
                                      </DropdownMenuItem>
                                    </Link>
                                    <Link href={`/devices/${device.id}?edit=true`}>
                                      <DropdownMenuItem>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Device
                                      </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => setDeviceToDelete(device.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Device
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-end mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(p => Math.max(p - 1, 1));
                              }}
                              aria-disabled={currentPage === 1}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                            const page = i + 1;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink 
                                  href="#" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  isActive={currentPage === page}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(p => Math.min(p + 1, totalPages));
                              }}
                              aria-disabled={currentPage === totalPages}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Add Device Dialog */}
      <AddDeviceDialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deviceToDelete !== null} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this device? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deviceToDelete !== null) {
                  deleteDeviceMutation.mutate(deviceToDelete);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteDeviceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
