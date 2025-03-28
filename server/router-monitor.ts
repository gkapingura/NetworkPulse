import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from "./storage";
import { createNodeScheduler } from './scheduler';
import { pingParser } from './ping-parser';
import nodemailer from 'nodemailer';
import { 
  Router, RouterIspConnection, RouterPingResult, RouterReport,
  InsertRouterPingResult, InsertRouterReport
} from '@shared/schema';

const execAsync = promisify(exec);

/**
 * Interface defining the router monitor service
 */
interface RouterMonitor {
  /**
   * Start the router monitoring service
   */
  start(): void;
  
  /**
   * Stop the router monitoring service
   */
  stop(): void;
  
  /**
   * Set up ping scheduling for a specific router
   * @param routerId Router ID
   * @param scheduleConfig Schedule configuration
   */
  setupScheduleForRouter(routerId: number, scheduleConfig: any): void;
  
  /**
   * Remove ping scheduling for a specific router
   * @param routerId Router ID
   */
  removeScheduleForRouter(routerId: number): void;
  
  /**
   * Manually trigger a ping test for a router
   * @param routerId Router ID
   * @returns The ping results
   */
  pingRouterManually(routerId: number): Promise<RouterPingResult[]>;
  
  /**
   * Generate a performance report for a router
   * @param routerId Router ID
   * @param startDate Start date for the report period
   * @param endDate End date for the report period
   * @param options Report options
   * @returns The generated report
   */
  generateRouterReport(
    routerId: number, 
    startDate: Date, 
    endDate: Date, 
    options: {
      title?: string;
      userId: number;
      message?: string;
      emailRecipients?: string[];
    }
  ): Promise<RouterReport>;
  
  /**
   * Send a report by email
   * @param reportId Report ID
   * @param recipients Email recipients
   * @returns Whether the email was sent successfully
   */
  sendReportByEmail(reportId: number, recipients: string[]): Promise<boolean>;
}

/**
 * Implementation of the router monitor service
 */
class RouterMonitorService implements RouterMonitor {
  private scheduler = createNodeScheduler();
  private isRunning = false;
  
  /**
   * Start the router monitoring service
   */
  async start() {
    if (this.isRunning) return;
    
    console.log('Starting router monitor service...');
    this.isRunning = true;
    
    try {
      // Get all routers and set up their schedules
      const routers = await storage.getAllRouters();
      
      for (const router of routers) {
        if (router.monitoringEnabled && router.scheduleConfig) {
          this.setupScheduleForRouter(router.id, router.scheduleConfig);
        }
      }
      
      console.log(`Router monitor service started, monitoring ${routers.length} routers`);
    } catch (err) {
      console.error('Failed to start router monitor service:', err);
      this.isRunning = false;
    }
  }
  
  /**
   * Stop the router monitoring service
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('Stopping router monitor service...');
    this.scheduler.clearAll();
    this.isRunning = false;
    console.log('Router monitor service stopped');
  }
  
  /**
   * Set up ping scheduling for a specific router
   * @param routerId Router ID
   * @param scheduleConfig Schedule configuration 
   */
  setupScheduleForRouter(routerId: number, scheduleConfig: any) {
    // Clear any existing schedules for this router
    this.removeScheduleForRouter(routerId);
    
    // Create a job ID for this router
    const jobId = `router_ping_${routerId}`;
    
    try {
      // Handle daily schedule (specific times of day)
      if (scheduleConfig.type === 'daily' && Array.isArray(scheduleConfig.times)) {
        for (const time of scheduleConfig.times) {
          const timeJobId = `${jobId}_${time.replace(':', '_')}`;
          this.scheduler.scheduleDaily(timeJobId, time, async () => {
            await this.pingRouter(routerId);
          });
        }
        console.log(`Scheduled daily pings for router ${routerId} at times: ${scheduleConfig.times.join(', ')}`);
      }
      // Handle interval schedule (every X hours/minutes)
      else if (scheduleConfig.type === 'interval' && scheduleConfig.interval) {
        const interval = this.parseInterval(scheduleConfig.interval);
        if (interval > 0) {
          this.scheduler.scheduleInterval(jobId, async () => {
            await this.pingRouter(routerId);
          }, interval);
          console.log(`Scheduled interval pings for router ${routerId} every ${scheduleConfig.interval}`);
        }
      }
      // Handle cron schedule
      else if (scheduleConfig.type === 'cron' && scheduleConfig.cronExpression) {
        this.scheduler.scheduleCron(jobId, scheduleConfig.cronExpression, async () => {
          await this.pingRouter(routerId);
        });
        console.log(`Scheduled cron pings for router ${routerId} with expression: ${scheduleConfig.cronExpression}`);
      }
    } catch (err) {
      console.error(`Failed to set up schedule for router ${routerId}:`, err);
    }
  }
  
  /**
   * Parse interval string like "2h", "30m" into milliseconds
   * @param intervalStr Interval string
   * @returns Interval in milliseconds
   */
  private parseInterval(intervalStr: string): number {
    const match = intervalStr.match(/^(\d+)([hm])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    if (unit === 'h') return value * 60 * 60 * 1000; // hours to ms
    if (unit === 'm') return value * 60 * 1000; // minutes to ms
    
    return 0;
  }
  
  /**
   * Remove ping scheduling for a specific router
   * @param routerId Router ID
   */
  removeScheduleForRouter(routerId: number) {
    const baseJobId = `router_ping_${routerId}`;
    this.scheduler.clear(baseJobId);
    
    // Also clear any time-specific jobs
    // Note: This is a simplification. In a production app, we would track all job IDs.
    const router = storage.getRouter(routerId);
    if (router && router.scheduleConfig && router.scheduleConfig.type === 'daily' && Array.isArray(router.scheduleConfig.times)) {
      for (const time of router.scheduleConfig.times) {
        const timeJobId = `${baseJobId}_${time.replace(':', '_')}`;
        this.scheduler.clear(timeJobId);
      }
    }
  }
  
  /**
   * Ping a router and store the results
   * @param routerId Router ID
   * @returns The ping results
   */
  private async pingRouter(routerId: number): Promise<RouterPingResult[]> {
    try {
      const router = await storage.getRouter(routerId);
      if (!router) {
        console.error(`Router ${routerId} not found`);
        return [];
      }
      
      // Ping the router's main IP
      const mainResult = await this.pingIP(router.ipAddress);
      const results: RouterPingResult[] = [];
      
      // Store the result for the main router IP
      const pingData: InsertRouterPingResult = {
        routerId,
        ipAddress: router.ipAddress,
        successful: mainResult.successful,
        latency: mainResult.latency || null,
        packetLoss: mainResult.packetLoss || null,
        jitter: mainResult.jitter || null,
        isp: null // Main router IP has no ISP
      };
      
      const savedResult = await storage.createRouterPingResult(pingData);
      results.push(savedResult);
      
      // Get and ping all ISP connections for this router
      const ispConnections = await storage.getRouterIspConnections(routerId);
      for (const isp of ispConnections) {
        if (isp.isActive) {
          const ispResult = await this.pingIP(isp.ipAddress);
          
          // Store the result for this ISP
          const ispPingData: InsertRouterPingResult = {
            routerId,
            ipAddress: isp.ipAddress,
            successful: ispResult.successful,
            latency: ispResult.latency || null,
            packetLoss: ispResult.packetLoss || null,
            jitter: ispResult.jitter || null,
            isp: isp.name
          };
          
          const savedIspResult = await storage.createRouterPingResult(ispPingData);
          results.push(savedIspResult);
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error pinging router ${routerId}:`, error);
      return [];
    }
  }
  
  /**
   * Ping an IP address and parse the results
   * @param ipAddress IP address to ping
   * @returns Ping results
   */
  private async pingIP(ipAddress: string) {
    try {
      // Determine the ping command based on the platform
      const platform = process.platform;
      let pingCommand = '';
      
      if (platform === 'win32') {
        pingCommand = `ping -n 5 ${ipAddress}`;
      } else {
        // macOS and Linux
        pingCommand = `ping -c 5 ${ipAddress}`;
      }
      
      const { stdout } = await execAsync(pingCommand);
      
      // Parse the ping output
      const result = pingParser(stdout, platform);
      
      return {
        successful: result.packetLoss < 100, // Consider successful if at least some packets returned
        latency: result.avg,
        packetLoss: result.packetLoss,
        jitter: result.jitter || result.stddev, // Use jitter if available, otherwise stddev
      };
    } catch (err) {
      // If ping fails completely
      return {
        successful: false,
        latency: null,
        packetLoss: 100,
        jitter: null,
      };
    }
  }
  
  /**
   * Manually trigger a ping test for a router
   * @param routerId Router ID
   * @returns The ping results
   */
  async pingRouterManually(routerId: number): Promise<RouterPingResult[]> {
    return await this.pingRouter(routerId);
  }
  
  /**
   * Generate a performance report for a router
   * @param routerId Router ID
   * @param startDate Start date for the report period
   * @param endDate End date for the report period
   * @param options Report options
   * @returns The generated report
   */
  async generateRouterReport(
    routerId: number, 
    startDate: Date, 
    endDate: Date, 
    options: {
      title?: string;
      userId: number;
      message?: string;
      emailRecipients?: string[];
    }
  ): Promise<RouterReport> {
    try {
      // Get router details
      const router = await storage.getRouter(routerId);
      if (!router) {
        throw new Error(`Router ${routerId} not found`);
      }
      
      // Get ping results for the specified time period
      const pingResults = await storage.getRouterPingResults(routerId, startDate, endDate);
      
      // Get ISP connections for this router
      const ispConnections = await storage.getRouterIspConnections(routerId);
      
      // Calculate statistics for all IPs (main router IP and ISP connections)
      const statistics: any = {
        main: this.calculateStatistics(pingResults.filter(r => r.isp === null)),
      };
      
      // Calculate statistics per ISP
      for (const isp of ispConnections) {
        statistics[isp.name] = this.calculateStatistics(
          pingResults.filter(r => r.isp === isp.name)
        );
      }
      
      // Create report data
      const reportData = {
        router: {
          id: router.id,
          name: router.name,
          ipAddress: router.ipAddress,
          location: router.location,
        },
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        message: options.message || '',
        statistics,
        ispConnections: ispConnections.map(isp => ({
          id: isp.id,
          name: isp.name,
          ipAddress: isp.ipAddress,
          provider: isp.provider,
          bandwidth: isp.bandwidth,
        })),
      };
      
      // Create the report record
      const report: InsertRouterReport = {
        routerId,
        title: options.title || `Router Performance Report for ${router.name}`,
        timeRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
        data: reportData,
        createdBy: options.userId,
        emailSent: false,
        emailRecipients: options.emailRecipients || [],
      };
      
      const savedReport = await storage.createRouterReport(report);
      
      // Send email if recipients are provided
      if (options.emailRecipients && options.emailRecipients.length > 0) {
        await this.sendReportByEmail(savedReport.id, options.emailRecipients);
      }
      
      return savedReport;
    } catch (err) {
      console.error(`Error generating report for router ${routerId}:`, err);
      throw err;
    }
  }
  
  /**
   * Calculate statistics from ping results
   * @param results Ping results
   * @returns Calculated statistics
   */
  private calculateStatistics(results: RouterPingResult[]) {
    if (results.length === 0) {
      return {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        successRate: 0,
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        avgJitter: 0,
        avgPacketLoss: 0,
      };
    }
    
    const successfulResults = results.filter(r => r.successful);
    
    // Calculate statistics
    const totalTests = results.length;
    const successfulTests = successfulResults.length;
    const successRate = (successfulTests / totalTests) * 100;
    
    // Calculate latency statistics from successful pings
    const latencies = successfulResults
      .map(r => r.latency)
      .filter((l): l is number => l !== null && l !== undefined);
    
    const avgLatency = latencies.length ? 
      latencies.reduce((sum, val) => sum + val, 0) / latencies.length : 0;
    
    const minLatency = latencies.length ? 
      Math.min(...latencies) : 0;
    
    const maxLatency = latencies.length ? 
      Math.max(...latencies) : 0;
    
    // Calculate jitter average
    const jitters = successfulResults
      .map(r => r.jitter)
      .filter((j): j is number => j !== null && j !== undefined);
    
    const avgJitter = jitters.length ? 
      jitters.reduce((sum, val) => sum + val, 0) / jitters.length : 0;
    
    // Calculate packet loss average
    const packetLosses = results
      .map(r => r.packetLoss)
      .filter((p): p is number => p !== null && p !== undefined);
    
    const avgPacketLoss = packetLosses.length ? 
      packetLosses.reduce((sum, val) => sum + val, 0) / packetLosses.length : 0;
    
    return {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: Number(successRate.toFixed(2)),
      avgLatency: Number(avgLatency.toFixed(2)),
      minLatency: Number(minLatency.toFixed(2)),
      maxLatency: Number(maxLatency.toFixed(2)),
      avgJitter: Number(avgJitter.toFixed(2)),
      avgPacketLoss: Number(avgPacketLoss.toFixed(2)),
    };
  }
  
  /**
   * Send a report by email
   * @param reportId Report ID
   * @param recipients Email recipients
   * @returns Whether the email was sent successfully
   */
  async sendReportByEmail(reportId: number, recipients: string[]): Promise<boolean> {
    try {
      const report = await storage.getRouterReport(reportId);
      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }
      
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email configuration is missing. Cannot send report email.');
        return false;
      }
      
      // Configure email transport
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      
      // Create email HTML content
      const htmlContent = this.generateReportEmailHtml(report);
      
      // Send the email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipients.join(', '),
        subject: report.title,
        html: htmlContent,
      });
      
      // Update the report to indicate the email was sent
      await storage.updateRouterReport(reportId, {
        emailSent: true,
        emailRecipients: recipients,
      });
      
      return true;
    } catch (err) {
      console.error(`Error sending report email for report ${reportId}:`, err);
      return false;
    }
  }
  
  /**
   * Generate HTML content for report email
   * @param report Router report
   * @returns HTML content
   */
  private generateReportEmailHtml(report: RouterReport): string {
    const data = report.data as any;
    
    // Generate HTML for the report
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #0052CC; color: white; padding: 20px; }
            .content { padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .section { margin-bottom: 30px; }
            .good { color: #36B37E; }
            .warning { color: #FFAB00; }
            .bad { color: #FF5630; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Router Performance Report</h1>
            <p>Router: ${data.router.name} (${data.router.ipAddress})</p>
            <p>Period: ${new Date(data.timeRange.start).toLocaleString()} to ${new Date(data.timeRange.end).toLocaleString()}</p>
          </div>
          
          <div class="content">
            ${data.message ? `<div class="section"><p>${data.message}</p></div>` : ''}
            
            <div class="section">
              <h2>Primary Connection Summary</h2>
              <table>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td>Success Rate</td>
                  <td class="${this.getStatusClass(data.statistics.main.successRate, 98, 90)}">
                    ${data.statistics.main.successRate}%
                  </td>
                </tr>
                <tr>
                  <td>Average Latency</td>
                  <td class="${this.getLatencyClass(data.statistics.main.avgLatency)}">
                    ${data.statistics.main.avgLatency} ms
                  </td>
                </tr>
                <tr>
                  <td>Min Latency</td>
                  <td>${data.statistics.main.minLatency} ms</td>
                </tr>
                <tr>
                  <td>Max Latency</td>
                  <td>${data.statistics.main.maxLatency} ms</td>
                </tr>
                <tr>
                  <td>Average Jitter</td>
                  <td class="${this.getJitterClass(data.statistics.main.avgJitter)}">
                    ${data.statistics.main.avgJitter} ms
                  </td>
                </tr>
                <tr>
                  <td>Average Packet Loss</td>
                  <td class="${this.getPacketLossClass(data.statistics.main.avgPacketLoss)}">
                    ${data.statistics.main.avgPacketLoss}%
                  </td>
                </tr>
                <tr>
                  <td>Total Tests</td>
                  <td>${data.statistics.main.totalTests}</td>
                </tr>
              </table>
            </div>
            
            ${this.generateIspHtml(data)}
          </div>
        </body>
      </html>
    `;
  }
  
  /**
   * Generate HTML for ISP connections
   * @param data Report data
   * @returns HTML content
   */
  private generateIspHtml(data: any): string {
    if (!data.ispConnections || data.ispConnections.length === 0) {
      return '';
    }
    
    let html = '<div class="section"><h2>ISP Connections</h2>';
    
    for (const isp of data.ispConnections) {
      const ispStats = data.statistics[isp.name];
      if (!ispStats) continue;
      
      html += `
        <h3>${isp.name} (${isp.provider || 'Unknown Provider'})</h3>
        <p>IP: ${isp.ipAddress} | Bandwidth: ${isp.bandwidth || 'Not specified'}</p>
        <table>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Success Rate</td>
            <td class="${this.getStatusClass(ispStats.successRate, 98, 90)}">
              ${ispStats.successRate}%
            </td>
          </tr>
          <tr>
            <td>Average Latency</td>
            <td class="${this.getLatencyClass(ispStats.avgLatency)}">
              ${ispStats.avgLatency} ms
            </td>
          </tr>
          <tr>
            <td>Min Latency</td>
            <td>${ispStats.minLatency} ms</td>
          </tr>
          <tr>
            <td>Max Latency</td>
            <td>${ispStats.maxLatency} ms</td>
          </tr>
          <tr>
            <td>Average Jitter</td>
            <td class="${this.getJitterClass(ispStats.avgJitter)}">
              ${ispStats.avgJitter} ms
            </td>
          </tr>
          <tr>
            <td>Average Packet Loss</td>
            <td class="${this.getPacketLossClass(ispStats.avgPacketLoss)}">
              ${ispStats.avgPacketLoss}%
            </td>
          </tr>
          <tr>
            <td>Total Tests</td>
            <td>${ispStats.totalTests}</td>
          </tr>
        </table>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Get CSS class based on status (success rate)
   * @param value Status value
   * @param goodThreshold Threshold for "good" status
   * @param warningThreshold Threshold for "warning" status
   * @returns CSS class
   */
  private getStatusClass(value: number, goodThreshold = 98, warningThreshold = 90): string {
    if (value >= goodThreshold) return 'good';
    if (value >= warningThreshold) return 'warning';
    return 'bad';
  }
  
  /**
   * Get CSS class based on latency
   * @param value Latency value
   * @returns CSS class
   */
  private getLatencyClass(value: number): string {
    if (value < 50) return 'good';
    if (value < 100) return 'warning';
    return 'bad';
  }
  
  /**
   * Get CSS class based on jitter
   * @param value Jitter value
   * @returns CSS class
   */
  private getJitterClass(value: number): string {
    if (value < 5) return 'good';
    if (value < 15) return 'warning';
    return 'bad';
  }
  
  /**
   * Get CSS class based on packet loss
   * @param value Packet loss value
   * @returns CSS class
   */
  private getPacketLossClass(value: number): string {
    if (value < 1) return 'good';
    if (value < 5) return 'warning';
    return 'bad';
  }
}

// Export a singleton instance
export const routerMonitor: RouterMonitor = new RouterMonitorService();