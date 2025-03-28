import { pgTable, text, serial, integer, boolean, json, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  role: text("role").default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

// Device schema
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  ipAddress: text("ip_address").notNull(),
  location: text("location"),
  description: text("description"),
  monitoringEnabled: boolean("monitoring_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

// Ping results schema
export const pingResults = pgTable("ping_results", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  successful: boolean("successful").notNull(),
  latency: integer("latency"), // in milliseconds
});

export const insertPingResultSchema = createInsertSchema(pingResults).omit({
  id: true,
  timestamp: true,
});

// Alert schema
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(), // 'error', 'warning', 'info'
  timestamp: timestamp("timestamp").defaultNow(),
  resolved: boolean("resolved").default(false),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
});

// Report schema
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  timeRange: text("time_range").notNull(), // '24h', '7d', '30d', etc.
  filters: json("filters"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Network Plans schema
export const networkPlans = pgTable("network_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").notNull(),
  status: text("status").default("draft"), // draft, in-progress, completed
  topology: json("topology").notNull(), // JSON structure for network topology
});

export const insertNetworkPlanSchema = createInsertSchema(networkPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Network Connections schema (for topology visualization)
export const networkConnections = pgTable("network_connections", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  sourceId: text("source_id").notNull(), // Can be device ID or node ID in topology
  targetId: text("target_id").notNull(), 
  connectionType: text("connection_type").notNull(), // ethernet, wifi, fiber, etc.
  bandwidth: text("bandwidth"), // e.g., "1Gbps", "10Gbps"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNetworkConnectionSchema = createInsertSchema(networkConnections).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertPingResult = z.infer<typeof insertPingResultSchema>;
export type PingResult = typeof pingResults.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertNetworkPlan = z.infer<typeof insertNetworkPlanSchema>;
export type NetworkPlan = typeof networkPlans.$inferSelect;

export type InsertNetworkConnection = z.infer<typeof insertNetworkConnectionSchema>;
export type NetworkConnection = typeof networkConnections.$inferSelect;

// Device status types
export type DeviceStatus = 'online' | 'offline' | 'warning';

// Device with status 
export type DeviceWithStatus = Device & {
  status: DeviceStatus;
  latency?: number;
  uptime?: string;
};

// Network topology node types
export type NodeType = 'router' | 'switch' | 'access-point' | 'server' | 'client' | 'printer' | 'camera' | 'other';

// Network topology structure
export type NetworkTopologyNode = {
  id: string;
  type: NodeType;
  label: string;
  x?: number;
  y?: number;
  ipAddress?: string;
  properties?: Record<string, any>;
};

export type NetworkTopologyLink = {
  source: string;
  target: string;
  type: string;
  bandwidth?: string;
  properties?: Record<string, any>;
};

export type NetworkTopology = {
  nodes: NetworkTopologyNode[];
  links: NetworkTopologyLink[];
};

// Router schema for WAN monitoring
export const routers = pgTable("routers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull(),
  location: text("location"),
  description: text("description"),
  model: text("model"),
  monitoringEnabled: boolean("monitoring_enabled").default(true),
  scheduleConfig: json("schedule_config"), // Configuration for ping schedule
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull(),
});

export const insertRouterSchema = createInsertSchema(routers).omit({
  id: true,
  createdAt: true,
});

// Router ISP connections
export const routerIspConnections = pgTable("router_isp_connections", {
  id: serial("id").primaryKey(),
  routerId: integer("router_id").notNull(),
  name: text("name").notNull(), // ISP name
  ipAddress: text("ip_address").notNull(),
  bandwidth: text("bandwidth"), // e.g., "100Mbps", "1Gbps"
  provider: text("provider"),
  accountNumber: text("account_number"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRouterIspConnectionSchema = createInsertSchema(routerIspConnections).omit({
  id: true,
  createdAt: true,
});

// Router ping results
export const routerPingResults = pgTable("router_ping_results", {
  id: serial("id").primaryKey(),
  routerId: integer("router_id").notNull(),
  ipAddress: text("ip_address").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  successful: boolean("successful").notNull(),
  latency: decimal("latency"), // in milliseconds
  packetLoss: decimal("packet_loss"), // percentage
  jitter: decimal("jitter"), // in milliseconds
  isp: text("isp"), // ISP name, null for main router IP
});

export const insertRouterPingResultSchema = createInsertSchema(routerPingResults).omit({
  id: true,
  timestamp: true,
});

// Router reports
export const routerReports = pgTable("router_reports", {
  id: serial("id").primaryKey(),
  routerId: integer("router_id").notNull(),
  title: text("title").notNull(),
  timeRange: text("time_range").notNull(),
  data: json("data").notNull(), // Report data in JSON format
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull(),
  emailSent: boolean("email_sent").default(false),
  emailRecipients: text("email_recipients").array(),
});

export const insertRouterReportSchema = createInsertSchema(routerReports).omit({
  id: true,
  createdAt: true,
});

// Router report types
export type InsertRouter = z.infer<typeof insertRouterSchema>;
export type Router = typeof routers.$inferSelect;

export type InsertRouterIspConnection = z.infer<typeof insertRouterIspConnectionSchema>;
export type RouterIspConnection = typeof routerIspConnections.$inferSelect;

export type InsertRouterPingResult = z.infer<typeof insertRouterPingResultSchema>;
export type RouterPingResult = typeof routerPingResults.$inferSelect;

export type InsertRouterReport = z.infer<typeof insertRouterReportSchema>;
export type RouterReport = typeof routerReports.$inferSelect;
