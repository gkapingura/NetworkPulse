import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { networkMonitor } from "./network-monitor";
import { 
  insertDeviceSchema, insertReportSchema, 
  insertNetworkPlanSchema, insertNetworkConnectionSchema 
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Middleware to ensure user is authenticated
const ensureAuth = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please login" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes
  setupAuth(app);

  // Device routes
  app.get("/api/devices", ensureAuth, async (req, res) => {
    try {
      const devicesWithStatus = await storage.getDevicesWithStatus();
      res.json(devicesWithStatus);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve devices" });
    }
  });

  app.get("/api/devices/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Check the device status
      const deviceStatus = await networkMonitor.checkDevice(id);
      res.json(deviceStatus);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve device" });
    }
  });

  app.post("/api/devices", ensureAuth, async (req, res) => {
    try {
      const validationResult = insertDeviceSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const newDevice = await storage.createDevice(validationResult.data);
      res.status(201).json(newDevice);
    } catch (err) {
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  app.put("/api/devices/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const validationSchema = insertDeviceSchema.partial();
      const validationResult = validationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedDevice = await storage.updateDevice(id, validationResult.data);
      if (!updatedDevice) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(updatedDevice);
    } catch (err) {
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const deleted = await storage.deleteDevice(id);
      if (!deleted) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Alert routes
  app.get("/api/alerts", ensureAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const includeResolved = req.query.includeResolved === 'true';
      
      const alerts = await storage.getAlerts(limit, includeResolved);
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve alerts" });
    }
  });

  app.post("/api/alerts/:id/resolve", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }
      
      const resolvedAlert = await storage.resolveAlert(id);
      if (!resolvedAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(resolvedAlert);
    } catch (err) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Report routes
  app.get("/api/reports", ensureAuth, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const reports = await storage.getReports(req.user.id);
      res.json(reports);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve reports" });
    }
  });

  app.post("/api/reports", ensureAuth, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validationResult = insertReportSchema.safeParse({
        ...req.body,
        createdBy: req.user.id
      });
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const newReport = await storage.createReport(validationResult.data);
      res.status(201).json(newReport);
    } catch (err) {
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Ping test endpoint for on-demand device checking
  app.post("/api/devices/:id/check", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const statusResult = await networkMonitor.checkDevice(id);
      res.json(statusResult);
    } catch (err) {
      res.status(500).json({ message: "Failed to check device status" });
    }
  });

  // Network summary endpoint
  app.get("/api/network/summary", ensureAuth, async (req, res) => {
    try {
      const devices = await storage.getDevicesWithStatus();
      const activeAlerts = await storage.getAlerts(undefined, false);
      
      const onlineCount = devices.filter(d => d.status === 'online').length;
      const offlineCount = devices.filter(d => d.status === 'offline').length;
      const warningCount = devices.filter(d => d.status === 'warning').length;
      
      res.json({
        totalDevices: devices.length,
        onlineDevices: onlineCount,
        offlineDevices: offlineCount,
        warningDevices: warningCount,
        onlinePercentage: devices.length > 0 ? (onlineCount / devices.length) * 100 : 0,
        activeAlerts: activeAlerts.length
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve network summary" });
    }
  });

  // Network Planning routes
  app.get("/api/network-plans", ensureAuth, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const plans = await storage.getNetworkPlans(req.user.id);
      res.json(plans);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve network plans" });
    }
  });
  
  app.get("/api/network-plans/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }
      
      const plan = await storage.getNetworkPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Network plan not found" });
      }
      
      // Check if the user is authorized to access this plan
      if (plan.createdBy !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden - This plan belongs to another user" });
      }
      
      res.json(plan);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve network plan" });
    }
  });
  
  app.post("/api/network-plans", ensureAuth, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validationResult = insertNetworkPlanSchema.safeParse({
        ...req.body,
        createdBy: req.user.id
      });
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const newPlan = await storage.createNetworkPlan(validationResult.data);
      res.status(201).json(newPlan);
    } catch (err) {
      res.status(500).json({ message: "Failed to create network plan" });
    }
  });
  
  app.put("/api/network-plans/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }
      
      // First check if the plan exists and belongs to the user
      const plan = await storage.getNetworkPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Network plan not found" });
      }
      
      if (plan.createdBy !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden - This plan belongs to another user" });
      }
      
      const validationSchema = insertNetworkPlanSchema.partial();
      const validationResult = validationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedPlan = await storage.updateNetworkPlan(id, validationResult.data);
      res.json(updatedPlan);
    } catch (err) {
      res.status(500).json({ message: "Failed to update network plan" });
    }
  });
  
  app.delete("/api/network-plans/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }
      
      // First check if the plan exists and belongs to the user
      const plan = await storage.getNetworkPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Network plan not found" });
      }
      
      if (plan.createdBy !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden - This plan belongs to another user" });
      }
      
      const deleted = await storage.deleteNetworkPlan(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete network plan" });
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete network plan" });
    }
  });
  
  // Network Connection routes
  app.get("/api/network-plans/:planId/connections", ensureAuth, async (req, res) => {
    try {
      const planId = parseInt(req.params.planId, 10);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }
      
      // First check if the plan exists and belongs to the user
      const plan = await storage.getNetworkPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Network plan not found" });
      }
      
      if (plan.createdBy !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden - This plan belongs to another user" });
      }
      
      const connections = await storage.getNetworkConnections(planId);
      res.json(connections);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve network connections" });
    }
  });
  
  app.post("/api/network-plans/:planId/connections", ensureAuth, async (req, res) => {
    try {
      const planId = parseInt(req.params.planId, 10);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }
      
      // First check if the plan exists and belongs to the user
      const plan = await storage.getNetworkPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Network plan not found" });
      }
      
      if (plan.createdBy !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden - This plan belongs to another user" });
      }
      
      const validationResult = insertNetworkConnectionSchema.safeParse({
        ...req.body,
        planId
      });
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const newConnection = await storage.createNetworkConnection(validationResult.data);
      res.status(201).json(newConnection);
    } catch (err) {
      res.status(500).json({ message: "Failed to create network connection" });
    }
  });
  
  app.put("/api/network-connections/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid connection ID" });
      }
      
      const validationSchema = insertNetworkConnectionSchema.partial();
      const validationResult = validationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedConnection = await storage.updateNetworkConnection(id, validationResult.data);
      if (!updatedConnection) {
        return res.status(404).json({ message: "Network connection not found" });
      }
      
      res.json(updatedConnection);
    } catch (err) {
      res.status(500).json({ message: "Failed to update network connection" });
    }
  });
  
  app.delete("/api/network-connections/:id", ensureAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid connection ID" });
      }
      
      const deleted = await storage.deleteNetworkConnection(id);
      if (!deleted) {
        return res.status(404).json({ message: "Network connection not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete network connection" });
    }
  });

  // Start the network monitor
  networkMonitor.start();
  
  const httpServer = createServer(app);
  
  return httpServer;
}
