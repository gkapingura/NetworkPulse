import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { NetworkPlan, NetworkTopology, insertNetworkPlanSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { PlusCircle, Network, Trash2, Edit, Eye } from "lucide-react";

// Extended schema for form validation
const createPlanSchema = insertNetworkPlanSchema.extend({
  name: z.string().min(1, "Name is required"),
});

export default function NetworkPlanningPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["/api/network-plans"],
    queryFn: async () => {
      const res = await fetch("/api/network-plans");
      if (!res.ok) throw new Error("Failed to fetch network plans");
      return res.json() as Promise<NetworkPlan[]>;
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createPlanSchema>) => {
      // Initialize empty topology
      const emptyTopology: NetworkTopology = {
        nodes: [],
        links: []
      };

      const createData = {
        ...data,
        topology: emptyTopology,
        status: 'draft'
      };
      
      const res = await apiRequest("POST", "/api/network-plans", createData);
      const result = await res.json();
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Network plan created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/network-plans"] });
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/network-plans/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Network plan deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/network-plans"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof createPlanSchema>>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  function onSubmit(values: z.infer<typeof createPlanSchema>) {
    createPlanMutation.mutate(values);
  }

  function toggleSidebar() {
    setMobileMenuOpen(!mobileMenuOpen);
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className={isMobile ? (mobileMenuOpen ? "block w-64" : "hidden") : "w-64"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuToggle={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Network Planning</h1>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : plans.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Network className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-center">No network plans yet</p>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first network plan to start designing your network topology
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>Created {formatDate(plan.createdAt)}</CardDescription>
                      </div>
                      <Badge variant={plan.status === 'draft' ? "outline" : "default"}>
                        {plan.status || 'Draft'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3rem]">
                      {plan.description || "No description provided"}
                    </p>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {plan.topology && 'nodes' in plan.topology ? (
                        <div className="flex gap-x-4">
                          <div>
                            <span className="font-medium">{plan.topology.nodes.length}</span> Devices
                          </div>
                          <div>
                            <span className="font-medium">{plan.topology.links.length}</span> Connections
                          </div>
                        </div>
                      ) : (
                        <div>Empty topology</div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-3 border-t">
                    <Link href={`/network-planning/${plan.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Link href={`/network-planning/${plan.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                        disabled={deletePlanMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Network Plan</DialogTitle>
            <DialogDescription>
              Create a new plan to design your network topology
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Office Network" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Network plan for the new office location" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={createPlanMutation.isPending || form.formState.isSubmitting}
                >
                  {createPlanMutation.isPending ? 
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div> : 
                    "Create Plan"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}