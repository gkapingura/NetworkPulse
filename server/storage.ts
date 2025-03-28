import { users, devices, pingResults, alerts, reports, networkPlans, networkConnections } from "@shared/schema";
import type { 
  User, InsertUser, 
  Device, InsertDevice, 
  PingResult, InsertPingResult, 
  Alert, InsertAlert, 
  Report, InsertReport, 
  NetworkPlan, InsertNetworkPlan,
  NetworkConnection, InsertNetworkConnection,
  DeviceWithStatus 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device operations
  getAllDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  
  // Ping results operations
  getPingResults(deviceId: number, limit?: number): Promise<PingResult[]>;
  createPingResult(pingResult: InsertPingResult): Promise<PingResult>;
  getLatestPingResult(deviceId: number): Promise<PingResult | undefined>;
  
  // Alert operations
  getAlerts(limit?: number, includeResolved?: boolean): Promise<Alert[]>;
  getDeviceAlerts(deviceId: number, limit?: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: number): Promise<Alert | undefined>;
  
  // Report operations
  getReports(userId: number): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  
  // Network Planning operations
  getNetworkPlans(userId: number): Promise<NetworkPlan[]>;
  getNetworkPlan(id: number): Promise<NetworkPlan | undefined>;
  createNetworkPlan(plan: InsertNetworkPlan): Promise<NetworkPlan>;
  updateNetworkPlan(id: number, plan: Partial<InsertNetworkPlan>): Promise<NetworkPlan | undefined>;
  deleteNetworkPlan(id: number): Promise<boolean>;
  
  // Network Connection operations
  getNetworkConnections(planId: number): Promise<NetworkConnection[]>;
  createNetworkConnection(connection: InsertNetworkConnection): Promise<NetworkConnection>;
  updateNetworkConnection(id: number, connection: Partial<InsertNetworkConnection>): Promise<NetworkConnection | undefined>;
  deleteNetworkConnection(id: number): Promise<boolean>;
  
  // Router operations
  getAllRouters(): Promise<Router[]>;
  getRouter(id: number): Promise<Router | undefined>;
  createRouter(router: InsertRouter): Promise<Router>;
  updateRouter(id: number, router: Partial<InsertRouter>): Promise<Router | undefined>;
  deleteRouter(id: number): Promise<boolean>;
  
  // Router ISP connections
  getRouterIspConnections(routerId: number): Promise<RouterIspConnection[]>;
  getRouterIspConnection(id: number): Promise<RouterIspConnection | undefined>;
  createRouterIspConnection(connection: InsertRouterIspConnection): Promise<RouterIspConnection>;
  updateRouterIspConnection(id: number, connection: Partial<InsertRouterIspConnection>): Promise<RouterIspConnection | undefined>;
  deleteRouterIspConnection(id: number): Promise<boolean>;
  
  // Router ping results
  getRouterPingResults(routerId: number, startDate?: Date, endDate?: Date): Promise<RouterPingResult[]>;
  createRouterPingResult(pingResult: InsertRouterPingResult): Promise<RouterPingResult>;
  
  // Router reports
  getRouterReports(routerId: number): Promise<RouterReport[]>;
  getRouterReport(id: number): Promise<RouterReport | undefined>;
  createRouterReport(report: InsertRouterReport): Promise<RouterReport>;
  updateRouterReport(id: number, report: Partial<InsertRouterReport>): Promise<RouterReport | undefined>;
  deleteRouterReport(id: number): Promise<boolean>;
  
  // Composite operations
  getDevicesWithStatus(): Promise<DeviceWithStatus[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private pingResults: Map<number, PingResult>;
  private alerts: Map<number, Alert>;
  private reports: Map<number, Report>;
  private networkPlans: Map<number, NetworkPlan>;
  private networkConnections: Map<number, NetworkConnection>;
  private routers: Map<number, Router>;
  private routerIspConnections: Map<number, RouterIspConnection>;
  private routerPingResults: Map<number, RouterPingResult>;
  private routerReports: Map<number, RouterReport>;
  
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private deviceIdCounter: number;
  private pingResultIdCounter: number;
  private alertIdCounter: number;
  private reportIdCounter: number;
  private networkPlanIdCounter: number;
  private networkConnectionIdCounter: number;
  private routerIdCounter: number;
  private routerIspConnectionIdCounter: number;
  private routerPingResultIdCounter: number;
  private routerReportIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.pingResults = new Map();
    this.alerts = new Map();
    this.reports = new Map();
    this.networkPlans = new Map();
    this.networkConnections = new Map();
    this.routers = new Map();
    this.routerIspConnections = new Map();
    this.routerPingResults = new Map();
    this.routerReports = new Map();
    
    this.userIdCounter = 1;
    this.deviceIdCounter = 1;
    this.pingResultIdCounter = 1;
    this.alertIdCounter = 1;
    this.reportIdCounter = 1;
    this.networkPlanIdCounter = 1;
    this.networkConnectionIdCounter = 1;
    this.routerIdCounter = 1;
    this.routerIspConnectionIdCounter = 1;
    this.routerPingResultIdCounter = 1;
    this.routerReportIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Device operations
  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }
  
  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }
  
  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.deviceIdCounter++;
    const device: Device = { 
      ...insertDevice, 
      id,
      createdAt: new Date()
    };
    this.devices.set(id, device);
    return device;
  }
  
  async updateDevice(id: number, updateData: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice: Device = {
      ...device,
      ...updateData,
    };
    
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async deleteDevice(id: number): Promise<boolean> {
    return this.devices.delete(id);
  }
  
  // Ping results operations
  async getPingResults(deviceId: number, limit?: number): Promise<PingResult[]> {
    const results = Array.from(this.pingResults.values())
      .filter(result => result.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? results.slice(0, limit) : results;
  }
  
  async createPingResult(insertPingResult: InsertPingResult): Promise<PingResult> {
    const id = this.pingResultIdCounter++;
    const pingResult: PingResult = {
      ...insertPingResult,
      id,
      timestamp: new Date()
    };
    this.pingResults.set(id, pingResult);
    return pingResult;
  }
  
  async getLatestPingResult(deviceId: number): Promise<PingResult | undefined> {
    const results = await this.getPingResults(deviceId, 1);
    return results.length > 0 ? results[0] : undefined;
  }
  
  // Alert operations
  async getAlerts(limit?: number, includeResolved: boolean = false): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values());
    
    if (!includeResolved) {
      alerts = alerts.filter(alert => !alert.resolved);
    }
    
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? alerts.slice(0, limit) : alerts;
  }
  
  async getDeviceAlerts(deviceId: number, limit?: number): Promise<Alert[]> {
    const alerts = Array.from(this.alerts.values())
      .filter(alert => alert.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? alerts.slice(0, limit) : alerts;
  }
  
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.alertIdCounter++;
    const alert: Alert = {
      ...insertAlert,
      id,
      timestamp: new Date()
    };
    this.alerts.set(id, alert);
    return alert;
  }
  
  async resolveAlert(id: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updatedAlert: Alert = {
      ...alert,
      resolved: true
    };
    
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }
  
  // Report operations
  async getReports(userId: number): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(report => report.createdBy === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }
  
  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = this.reportIdCounter++;
    const report: Report = {
      ...insertReport,
      id,
      createdAt: new Date()
    };
    this.reports.set(id, report);
    return report;
  }
  
  // Router operations
  async getAllRouters(): Promise<Router[]> {
    return Array.from(this.routers.values());
  }
  
  async getRouter(id: number): Promise<Router | undefined> {
    return this.routers.get(id);
  }
  
  async createRouter(insertRouter: InsertRouter): Promise<Router> {
    const id = this.routerIdCounter++;
    const router: Router = {
      ...insertRouter,
      id,
      createdAt: new Date()
    };
    this.routers.set(id, router);
    return router;
  }
  
  async updateRouter(id: number, updateData: Partial<InsertRouter>): Promise<Router | undefined> {
    const router = this.routers.get(id);
    if (!router) return undefined;
    
    const updatedRouter: Router = {
      ...router,
      ...updateData,
    };
    
    this.routers.set(id, updatedRouter);
    return updatedRouter;
  }
  
  async deleteRouter(id: number): Promise<boolean> {
    return this.routers.delete(id);
  }
  
  // Router ISP connections
  async getRouterIspConnections(routerId: number): Promise<RouterIspConnection[]> {
    return Array.from(this.routerIspConnections.values())
      .filter(conn => conn.routerId === routerId);
  }
  
  async getRouterIspConnection(id: number): Promise<RouterIspConnection | undefined> {
    return this.routerIspConnections.get(id);
  }
  
  async createRouterIspConnection(insertConn: InsertRouterIspConnection): Promise<RouterIspConnection> {
    const id = this.routerIspConnectionIdCounter++;
    const connection: RouterIspConnection = {
      ...insertConn,
      id,
      createdAt: new Date()
    };
    this.routerIspConnections.set(id, connection);
    return connection;
  }
  
  async updateRouterIspConnection(id: number, updateData: Partial<InsertRouterIspConnection>): Promise<RouterIspConnection | undefined> {
    const connection = this.routerIspConnections.get(id);
    if (!connection) return undefined;
    
    const updatedConnection: RouterIspConnection = {
      ...connection,
      ...updateData,
    };
    
    this.routerIspConnections.set(id, updatedConnection);
    return updatedConnection;
  }
  
  async deleteRouterIspConnection(id: number): Promise<boolean> {
    return this.routerIspConnections.delete(id);
  }
  
  // Router ping results
  async getRouterPingResults(routerId: number, startDate?: Date, endDate?: Date): Promise<RouterPingResult[]> {
    let results = Array.from(this.routerPingResults.values())
      .filter(result => result.routerId === routerId);
    
    if (startDate) {
      results = results.filter(result => result.timestamp >= startDate);
    }
    
    if (endDate) {
      results = results.filter(result => result.timestamp <= endDate);
    }
    
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async createRouterPingResult(insertPingResult: InsertRouterPingResult): Promise<RouterPingResult> {
    const id = this.routerPingResultIdCounter++;
    const pingResult: RouterPingResult = {
      ...insertPingResult,
      id,
      timestamp: new Date()
    };
    this.routerPingResults.set(id, pingResult);
    return pingResult;
  }
  
  // Router reports
  async getRouterReports(routerId: number): Promise<RouterReport[]> {
    return Array.from(this.routerReports.values())
      .filter(report => report.routerId === routerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getRouterReport(id: number): Promise<RouterReport | undefined> {
    return this.routerReports.get(id);
  }
  
  async createRouterReport(insertReport: InsertRouterReport): Promise<RouterReport> {
    const id = this.routerReportIdCounter++;
    const report: RouterReport = {
      ...insertReport,
      id,
      createdAt: new Date()
    };
    this.routerReports.set(id, report);
    return report;
  }
  
  async updateRouterReport(id: number, updateData: Partial<InsertRouterReport>): Promise<RouterReport | undefined> {
    const report = this.routerReports.get(id);
    if (!report) return undefined;
    
    const updatedReport: RouterReport = {
      ...report,
      ...updateData,
    };
    
    this.routerReports.set(id, updatedReport);
    return updatedReport;
  }
  
  async deleteRouterReport(id: number): Promise<boolean> {
    return this.routerReports.delete(id);
  }
  
  // Composite operations
  async getDevicesWithStatus(): Promise<DeviceWithStatus[]> {
    const devices = await this.getAllDevices();
    const devicesWithStatus: DeviceWithStatus[] = [];
    
    for (const device of devices) {
      const latestPing = await this.getLatestPingResult(device.id);
      let status: 'online' | 'offline' | 'warning' = 'offline';
      
      if (latestPing) {
        if (latestPing.successful) {
          // If latency is too high, set status to warning
          status = latestPing.latency && latestPing.latency > 100 ? 'warning' : 'online';
        }
      }
      
      // Calculate uptime (mock for now)
      const uptime = status === 'online' ? this.calculateUptime(device.id) : undefined;
      
      devicesWithStatus.push({
        ...device,
        status,
        latency: latestPing?.latency,
        uptime
      });
    }
    
    return devicesWithStatus;
  }
  
  // Helper method to calculate device uptime
  private calculateUptime(deviceId: number): string {
    // Mock implementation - in a real app this would calculate based on ping history
    const days = Math.floor(Math.random() * 30);
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }
  
  // Network planning operations
  async getNetworkPlans(userId: number): Promise<NetworkPlan[]> {
    return Array.from(this.networkPlans.values())
      .filter(plan => plan.createdBy === userId)
      .sort((a, b) => {
        if (a.updatedAt && b.updatedAt) {
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
        return 0;
      });
  }
  
  async getNetworkPlan(id: number): Promise<NetworkPlan | undefined> {
    return this.networkPlans.get(id);
  }
  
  async createNetworkPlan(insertNetworkPlan: InsertNetworkPlan): Promise<NetworkPlan> {
    const id = this.networkPlanIdCounter++;
    const now = new Date();
    const networkPlan: NetworkPlan = {
      ...insertNetworkPlan,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.networkPlans.set(id, networkPlan);
    return networkPlan;
  }
  
  async updateNetworkPlan(id: number, updateData: Partial<InsertNetworkPlan>): Promise<NetworkPlan | undefined> {
    const plan = this.networkPlans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan: NetworkPlan = {
      ...plan,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.networkPlans.set(id, updatedPlan);
    return updatedPlan;
  }
  
  async deleteNetworkPlan(id: number): Promise<boolean> {
    // Delete all connections associated with this plan
    const connectionsToDelete = Array.from(this.networkConnections.values())
      .filter(conn => conn.planId === id)
      .map(conn => conn.id);
    
    for (const connId of connectionsToDelete) {
      this.networkConnections.delete(connId);
    }
    
    return this.networkPlans.delete(id);
  }
  
  // Network connection operations
  async getNetworkConnections(planId: number): Promise<NetworkConnection[]> {
    return Array.from(this.networkConnections.values())
      .filter(conn => conn.planId === planId);
  }
  
  async createNetworkConnection(insertConnection: InsertNetworkConnection): Promise<NetworkConnection> {
    const id = this.networkConnectionIdCounter++;
    const connection: NetworkConnection = {
      ...insertConnection,
      id,
      createdAt: new Date()
    };
    this.networkConnections.set(id, connection);
    return connection;
  }
  
  async updateNetworkConnection(id: number, updateData: Partial<InsertNetworkConnection>): Promise<NetworkConnection | undefined> {
    const connection = this.networkConnections.get(id);
    if (!connection) return undefined;
    
    const updatedConnection: NetworkConnection = {
      ...connection,
      ...updateData
    };
    
    this.networkConnections.set(id, updatedConnection);
    return updatedConnection;
  }
  
  async deleteNetworkConnection(id: number): Promise<boolean> {
    return this.networkConnections.delete(id);
  }
}

export const storage = new MemStorage();
