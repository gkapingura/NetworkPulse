import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRoute, useLocation } from "wouter";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  NetworkPlan,
  NetworkTopology,
  NetworkTopologyNode,
  NetworkTopologyLink,
  NodeType,
  insertNetworkPlanSchema,
  insertNetworkConnectionSchema
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Home, Network, PlusCircle, X, Save, Server, Laptop, Router, Wifi, Printer, Plus, ArrowLeftRight } from "lucide-react";

// Form schema for node
const nodeSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  label: z.string().min(1, "Label is required"),
  ipAddress: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

// Form schema for connection/link
const connectionSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.string(),
  bandwidth: z.string().optional(),
});

export default function NetworkPlanningDetailPage() {
  const [, params] = useRoute('/network-planning/:id');
  const [, params2] = useRoute('/network-planning/:id/edit');
  const [, setLocation] = useLocation();
  const planId = params?.id || params2?.id;
  const isEditMode = !!params2?.id;
  
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("nodes");
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [addConnectionDialogOpen, setAddConnectionDialogOpen] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkTopologyNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  
  const { data: plan, isLoading } = useQuery({
    queryKey: ["/api/network-plans", planId],
    queryFn: async () => {
      if (!planId) return null;
      const res = await fetch(`/api/network-plans/${planId}`);
      if (!res.ok) throw new Error("Failed to fetch network plan");
      return res.json() as Promise<NetworkPlan>;
    },
  });
  
  const updatePlanMutation = useMutation({
    mutationFn: async (data: Partial<NetworkPlan>) => {
      if (!planId) throw new Error("Plan ID is required");
      const res = await apiRequest("PUT", `/api/network-plans/${planId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Network plan updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/network-plans", planId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nodeForm = useForm<z.infer<typeof nodeSchema>>({
    resolver: zodResolver(nodeSchema),
    defaultValues: {
      type: 'router',
      label: '',
      ipAddress: '',
    },
  });
  
  const connectionForm = useForm<z.infer<typeof connectionSchema>>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      source: '',
      target: '',
      type: 'ethernet',
      bandwidth: '1Gbps',
    },
  });
  
  function toggleSidebar() {
    setMobileMenuOpen(!mobileMenuOpen);
  }
  
  function getNodeIcon(type: NodeType) {
    switch (type) {
      case 'router':
        return <Router className="h-4 w-4" />;
      case 'switch':
        return <Network className="h-4 w-4" />;
      case 'access-point':
        return <Wifi className="h-4 w-4" />;
      case 'server':
        return <Server className="h-4 w-4" />;
      case 'client':
        return <Laptop className="h-4 w-4" />;
      case 'printer':
        return <Printer className="h-4 w-4" />;
      default:
        return <Network className="h-4 w-4" />;
    }
  }
  
  function getNodeTypeLabel(type: NodeType) {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
  }

  function handleSavePlan() {
    if (!plan) return;
    
    updatePlanMutation.mutate({
      topology: plan.topology
    });
  }
  
  function onNodeSubmit(values: z.infer<typeof nodeSchema>) {
    if (!plan || !plan.topology) return;
    
    const uniqueId = values.id || `node-${Date.now()}`;
    const newNode: NetworkTopologyNode = {
      id: uniqueId,
      type: values.type as NodeType,
      label: values.label,
      ipAddress: values.ipAddress,
      x: Math.floor(Math.random() * 600) + 50, // Random position
      y: Math.floor(Math.random() * 300) + 50,
    };
    
    const updatedTopology: NetworkTopology = {
      ...plan.topology,
      nodes: [...plan.topology.nodes, newNode]
    };
    
    updatePlanMutation.mutate({
      topology: updatedTopology
    });
    
    setAddNodeDialogOpen(false);
    nodeForm.reset();
  }
  
  function onConnectionSubmit(values: z.infer<typeof connectionSchema>) {
    if (!plan || !plan.topology) return;
    
    const newLink: NetworkTopologyLink = {
      source: values.source,
      target: values.target,
      type: values.type,
      bandwidth: values.bandwidth
    };
    
    const updatedTopology: NetworkTopology = {
      ...plan.topology,
      links: [...plan.topology.links, newLink]
    };
    
    updatePlanMutation.mutate({
      topology: updatedTopology
    });
    
    setAddConnectionDialogOpen(false);
    connectionForm.reset();
  }
  
  function removeNode(nodeId: string) {
    if (!plan || !plan.topology) return;
    
    // Remove the node
    const updatedNodes = plan.topology.nodes.filter(node => node.id !== nodeId);
    
    // Also remove any connections associated with this node
    const updatedLinks = plan.topology.links.filter(
      link => link.source !== nodeId && link.target !== nodeId
    );
    
    const updatedTopology: NetworkTopology = {
      nodes: updatedNodes,
      links: updatedLinks
    };
    
    updatePlanMutation.mutate({
      topology: updatedTopology
    });
    
    setSelectedNode(null);
  }
  
  function removeConnection(source: string, target: string) {
    if (!plan || !plan.topology) return;
    
    const updatedLinks = plan.topology.links.filter(
      link => !(link.source === source && link.target === target)
    );
    
    const updatedTopology: NetworkTopology = {
      ...plan.topology,
      links: updatedLinks
    };
    
    updatePlanMutation.mutate({
      topology: updatedTopology
    });
  }
  
  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!isEditMode) return;
    if (!canvasRef.current || !plan || !plan.topology) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if the click is on a node
    const clickedNode = plan.topology.nodes.find(node => {
      const nodeX = node.x || 0;
      const nodeY = node.y || 0;
      return Math.sqrt(Math.pow(x - nodeX, 2) + Math.pow(y - nodeY, 2)) < 25; // radius
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
      setIsDragging(true);
      setDragNodeId(clickedNode.id);
    } else {
      setSelectedNode(null);
    }
  }
  
  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isEditMode || !isDragging || !dragNodeId || !canvasRef.current || !plan || !plan.topology) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const updatedNodes = plan.topology.nodes.map(node => {
      if (node.id === dragNodeId) {
        return { ...node, x, y };
      }
      return node;
    });
    
    const updatedTopology: NetworkTopology = {
      ...plan.topology,
      nodes: updatedNodes
    };
    
    // Instead of triggering a mutation for every mouse move, just update the local state
    // We'll save the final position when mouse up
    plan.topology = updatedTopology;
    setSelectedNode(updatedNodes.find(n => n.id === dragNodeId) || null);
  }
  
  function handleCanvasMouseUp() {
    if (isDragging && plan && plan.topology && dragNodeId) {
      // Now save the final position
      updatePlanMutation.mutate({
        topology: plan.topology
      });
    }
    
    setIsDragging(false);
    setDragNodeId(null);
  }
  
  // Component for the network topology visualization
  function TopologyVisualization() {
    if (!plan || !plan.topology) return null;
    
    return (
      <div 
        ref={canvasRef}
        className={`relative w-full h-[500px] border rounded-md bg-zinc-50 dark:bg-zinc-900 overflow-hidden ${isEditMode ? 'cursor-move' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Render connections */}
        {plan.topology.links.map((link, idx) => {
          const sourceNode = plan.topology.nodes.find(n => n.id === link.source);
          const targetNode = plan.topology.nodes.find(n => n.id === link.target);
          
          if (!sourceNode || !targetNode) return null;
          
          const sourceX = sourceNode.x || 0;
          const sourceY = sourceNode.y || 0;
          const targetX = targetNode.x || 0;
          const targetY = targetNode.y || 0;
          
          return (
            <svg key={`link-${idx}`} className="absolute top-0 left-0 w-full h-full">
              <line
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke={link.type === 'wifi' ? '#3498db' : '#2ecc71'}
                strokeWidth={2}
                strokeDasharray={link.type === 'wifi' ? '5,5' : ''}
              />
              {isEditMode && (
                <g>
                  {/* Click area for removing the connection */}
                  <line
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke="transparent"
                    strokeWidth={10}
                    onClick={() => removeConnection(link.source, link.target)}
                    className="cursor-pointer"
                  />
                  {/* Midpoint X icon */}
                  <g
                    transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}
                    onClick={() => removeConnection(link.source, link.target)}
                    className="cursor-pointer opacity-0 hover:opacity-100"
                  >
                    <circle r="10" fill="white" />
                    <path
                      d="M-5,-5 L5,5 M-5,5 L5,-5"
                      stroke="red"
                      strokeWidth="2"
                    />
                  </g>
                </g>
              )}
              {/* Connection label */}
              <text
                x={(sourceX + targetX) / 2}
                y={(sourceY + targetY) / 2 - 10}
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
                className="pointer-events-none"
              >
                {link.bandwidth || link.type}
              </text>
            </svg>
          );
        })}
        
        {/* Render nodes */}
        {plan.topology.nodes.map(node => {
          const x = node.x || 0;
          const y = node.y || 0;
          const isSelected = selectedNode?.id === node.id;
          
          return (
            <div
              key={node.id}
              className={`absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 ${
                isSelected ? 'z-10' : 'z-0'
              }`}
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              <div className={`
                rounded-full p-3 flex items-center justify-center
                ${isSelected ? 'ring-2 ring-primary' : ''}
                ${node.type === 'router' ? 'bg-rose-200 dark:bg-rose-900' : ''}
                ${node.type === 'switch' ? 'bg-blue-200 dark:bg-blue-900' : ''}
                ${node.type === 'access-point' ? 'bg-green-200 dark:bg-green-900' : ''}
                ${node.type === 'server' ? 'bg-indigo-200 dark:bg-indigo-900' : ''}
                ${node.type === 'client' ? 'bg-gray-200 dark:bg-gray-800' : ''}
                ${node.type === 'printer' ? 'bg-amber-200 dark:bg-amber-900' : ''}
                ${node.type === 'other' ? 'bg-purple-200 dark:bg-purple-900' : ''}
              `}>
                {getNodeIcon(node.type as NodeType)}
              </div>
              <div className="mt-1 px-2 py-0.5 bg-white dark:bg-zinc-800 rounded text-xs text-center">
                {node.label}
              </div>
              {isEditMode && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="absolute -right-10 -top-2 h-6 w-6"
                  onClick={() => removeNode(node.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {node.ipAddress && (
                <div className="text-xs text-center text-muted-foreground mt-1">
                  {node.ipAddress}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar className={isMobile ? (mobileMenuOpen ? "block w-64" : "hidden") : "w-64"} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMobileMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar className={isMobile ? (mobileMenuOpen ? "block w-64" : "hidden") : "w-64"} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMobileMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Plan Not Found</CardTitle>
                <CardDescription>The network plan you're looking for could not be found.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setLocation("/network-planning")}>
                  Back to Network Plans
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar className={isMobile ? (mobileMenuOpen ? "block w-64" : "hidden") : "w-64"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuToggle={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">
                    <Home className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/network-planning">Network Planning</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink>{plan.name}</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                {plan.name}
                {plan.status && (
                  <Badge variant={plan.status === 'draft' ? "outline" : "default"} className="ml-2">
                    {plan.status}
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">{plan.description || "No description provided"}</p>
            </div>
            
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button onClick={handleSavePlan} disabled={updatePlanMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setLocation(`/network-planning/${planId}`)}>
                    Exit Edit Mode
                  </Button>
                </>
              ) : (
                <Button onClick={() => setLocation(`/network-planning/${planId}/edit`)}>
                  Edit Plan
                </Button>
              )}
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Network Topology</CardTitle>
              <CardDescription>
                {isEditMode ? 
                  "Drag nodes to position them and use the controls below to add devices and connections" :
                  "Visual representation of your network plan"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plan.topology && 'nodes' in plan.topology ? (
                <TopologyVisualization />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No topology data available
                </div>
              )}
              
              {isEditMode && (
                <div className="flex gap-2 mt-4 justify-center">
                  <Button variant="outline" onClick={() => setAddNodeDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Device
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setAddConnectionDialogOpen(true)}
                    disabled={!plan.topology || plan.topology.nodes.length < 2}
                  >
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Add Connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Network Devices</CardTitle>
                <CardDescription>Devices in this network plan</CardDescription>
              </CardHeader>
              <CardContent>
                {plan.topology && plan.topology.nodes.length > 0 ? (
                  <div className="space-y-2">
                    {plan.topology.nodes.map(node => (
                      <div 
                        key={node.id} 
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div className="flex items-center">
                          <div className={`
                            rounded-full p-2 mr-3 flex items-center justify-center
                            ${node.type === 'router' ? 'bg-rose-100 dark:bg-rose-900' : ''}
                            ${node.type === 'switch' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                            ${node.type === 'access-point' ? 'bg-green-100 dark:bg-green-900' : ''}
                            ${node.type === 'server' ? 'bg-indigo-100 dark:bg-indigo-900' : ''}
                            ${node.type === 'client' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                            ${node.type === 'printer' ? 'bg-amber-100 dark:bg-amber-900' : ''}
                            ${node.type === 'other' ? 'bg-purple-100 dark:bg-purple-900' : ''}
                          `}>
                            {getNodeIcon(node.type as NodeType)}
                          </div>
                          <div>
                            <div className="font-medium">{node.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {getNodeTypeLabel(node.type as NodeType)}
                              {node.ipAddress && ` • ${node.ipAddress}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No devices added yet
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Network Connections</CardTitle>
                <CardDescription>Connections between devices</CardDescription>
              </CardHeader>
              <CardContent>
                {plan.topology && plan.topology.links.length > 0 ? (
                  <div className="space-y-2">
                    {plan.topology.links.map((link, idx) => {
                      const sourceNode = plan.topology.nodes.find(n => n.id === link.source);
                      const targetNode = plan.topology.nodes.find(n => n.id === link.target);
                      
                      if (!sourceNode || !targetNode) return null;
                      
                      return (
                        <div 
                          key={`conn-${idx}`} 
                          className="flex items-center justify-between p-2 rounded-md border"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="flex flex-col">
                              <div className="text-sm">{sourceNode.label} → {targetNode.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {link.type}
                                {link.bandwidth && ` • ${link.bandwidth}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No connections added yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Add Device Dialog */}
      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Network Device</DialogTitle>
            <DialogDescription>
              Add a new device to your network topology
            </DialogDescription>
          </DialogHeader>
          
          <Form {...nodeForm}>
            <form onSubmit={nodeForm.handleSubmit(onNodeSubmit)} className="space-y-4">
              <FormField
                control={nodeForm.control}
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
                        <SelectItem value="switch">Switch</SelectItem>
                        <SelectItem value="access-point">Access Point</SelectItem>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="printer">Printer</SelectItem>
                        <SelectItem value="camera">Camera</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={nodeForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Router" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={nodeForm.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={nodeForm.formState.isSubmitting}
                >
                  Add Device
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Add Connection Dialog */}
      <Dialog open={addConnectionDialogOpen} onOpenChange={setAddConnectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Network Connection</DialogTitle>
            <DialogDescription>
              Connect two devices in your network
            </DialogDescription>
          </DialogHeader>
          
          <Form {...connectionForm}>
            <form onSubmit={connectionForm.handleSubmit(onConnectionSubmit)} className="space-y-4">
              <FormField
                control={connectionForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Device</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source device" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plan.topology?.nodes.map(node => (
                          <SelectItem key={`source-${node.id}`} value={node.id}>
                            {node.label} ({getNodeTypeLabel(node.type as NodeType)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={connectionForm.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Device</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target device" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plan.topology?.nodes.map(node => (
                          <SelectItem key={`target-${node.id}`} value={node.id}>
                            {node.label} ({getNodeTypeLabel(node.type as NodeType)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={connectionForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connection Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select connection type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ethernet">Ethernet</SelectItem>
                        <SelectItem value="fiber">Fiber</SelectItem>
                        <SelectItem value="wifi">WiFi</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={connectionForm.control}
                name="bandwidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandwidth (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bandwidth" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="100Mbps">100 Mbps</SelectItem>
                        <SelectItem value="1Gbps">1 Gbps</SelectItem>
                        <SelectItem value="10Gbps">10 Gbps</SelectItem>
                        <SelectItem value="40Gbps">40 Gbps</SelectItem>
                        <SelectItem value="100Gbps">100 Gbps</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={connectionForm.formState.isSubmitting}
                >
                  Add Connection
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}