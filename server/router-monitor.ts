import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from './storage';
import { createNodeScheduler } from './scheduler';
import { pingParser } from './ping-parser';
import { platform } from 'os';

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
  pingRouterManually(routerId: number): Promise<any[]>;
  
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
  ): Promise<any>;
  
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
    
    console.log('Starting router monitoring service...');
    
    // Reset all schedules
    this.scheduler.clearAll();
    
    // Load routers with monitoring enabled
    const routers = await storage.getAllRouters();
    const enabledRouters = routers.filter(router => router.monitoringEnabled);
    
    // Set up scheduled pings for each router
    for (const router of enabledRouters) {
      if (router.scheduleConfig) {
        this.setupScheduleForRouter(router.id, router.scheduleConfig);
      }
    }
    
    // Set up global maintenance tasks (e.g., clean up old ping results)
    this.setupMaintenanceTasks();
    
    this.isRunning = true;
    console.log(`Router monitoring service started (${enabledRouters.length} routers monitored)`);
  }
  
  /**
   * Stop the router monitoring service
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('Stopping router monitoring service...');
    this.scheduler.clearAll();
    this.isRunning = false;
    console.log('Router monitoring service stopped');
  }
  
  /**
   * Set up maintenance tasks
   */
  private setupMaintenanceTasks() {
    // Run daily at 2:00 AM
    this.scheduler.scheduleDaily('router-maintenance', '02:00', async () => {
      console.log('Running router monitoring maintenance tasks...');
      
      // Example: Clean up old ping results
      // await this.cleanupOldPingResults();
      
      console.log('Router monitoring maintenance tasks completed');
    });
  }
  
  /**
   * Set up ping scheduling for a specific router
   * @param routerId Router ID
   * @param scheduleConfig Schedule configuration 
   */
  setupScheduleForRouter(routerId: number, scheduleConfig: any) {
    if (!scheduleConfig) return;
    
    const jobId = `router-ping-${routerId}`;
    
    // Clear any existing schedule for this router
    this.removeScheduleForRouter(routerId);
    
    if (scheduleConfig.type === 'interval') {
      // Schedule at regular intervals (e.g., "30m", "1h", "4h")
      const intervalMs = this.parseInterval(scheduleConfig.interval);
      if (intervalMs > 0) {
        console.log(`Setting up interval ping (${scheduleConfig.interval}) for router #${routerId}`);
        this.scheduler.scheduleInterval(
          jobId,
          () => this.pingRouter(routerId),
          intervalMs
        );
      }
    }
    else if (scheduleConfig.type === 'daily' && Array.isArray(scheduleConfig.times)) {
      // Schedule at specific times each day
      for (let i = 0; i < scheduleConfig.times.length; i++) {
        const time = scheduleConfig.times[i];
        console.log(`Setting up daily ping at ${time} for router #${routerId}`);
        this.scheduler.scheduleDaily(
          `${jobId}-${i}`,
          time,
          () => this.pingRouter(routerId)
        );
      }
    }
    else if (scheduleConfig.type === 'cron' && scheduleConfig.cronExpression) {
      // Schedule using a cron expression
      console.log(`Setting up cron ping (${scheduleConfig.cronExpression}) for router #${routerId}`);
      this.scheduler.scheduleCron(
        jobId,
        scheduleConfig.cronExpression,
        () => this.pingRouter(routerId)
      );
    }
  }
  
  /**
   * Parse interval string like "2h", "30m" into milliseconds
   * @param intervalStr Interval string
   * @returns Interval in milliseconds
   */
  private parseInterval(intervalStr: string): number {
    if (!intervalStr) return 0;
    
    const match = intervalStr.match(/^(\d+)([mh])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    if (unit === 'm') return value * 60 * 1000; // minutes to ms
    if (unit === 'h') return value * 60 * 60 * 1000; // hours to ms
    
    return 0;
  }
  
  /**
   * Remove ping scheduling for a specific router
   * @param routerId Router ID
   */
  removeScheduleForRouter(routerId: number) {
    const jobId = `router-ping-${routerId}`;
    this.scheduler.clear(jobId);
    
    // Also clear any possible daily jobs
    for (let i = 0; i < 24; i++) {
      this.scheduler.clear(`${jobId}-${i}`);
    }
  }
  
  /**
   * Ping a router and store the results
   * @param routerId Router ID
   * @returns The ping results
   */
  private async pingRouter(routerId: number): Promise<any[]> {
    try {
      const router = await storage.getRouter(routerId);
      if (!router) {
        console.error(`Cannot ping router #${routerId}: Router not found`);
        return [];
      }
      
      console.log(`Pinging router #${routerId} (${router.name})`);
      
      // Ping primary router IP
      const pingResult = await this.pingIP(router.ipAddress);
      
      // Store the ping result
      const pingData = {
        routerId,
        ipAddress: router.ipAddress,
        successful: pingResult !== null,
        latency: pingResult?.avg || null,
        packetLoss: pingResult?.packetLoss || 100,
        jitter: pingResult?.jitter || null,
        isp: null // Main router IP, no ISP
      };
      
      const savedPingResult = await storage.createRouterPingResult(pingData);
      const results = [savedPingResult];
      
      // Also ping ISP connections
      const ispConnections = await storage.getRouterIspConnections(routerId);
      
      for (const conn of ispConnections) {
        if (!conn.isActive) continue;
        
        const ispPingResult = await this.pingIP(conn.ipAddress);
        
        // Store the ISP ping result
        const ispPingData = {
          routerId,
          ipAddress: conn.ipAddress,
          successful: ispPingResult !== null,
          latency: ispPingResult?.avg || null,
          packetLoss: ispPingResult?.packetLoss || 100,
          jitter: ispPingResult?.jitter || null,
          isp: conn.name
        };
        
        const savedIspPingResult = await storage.createRouterPingResult(ispPingData);
        results.push(savedIspPingResult);
      }
      
      return results;
    } catch (err) {
      console.error(`Error pinging router #${routerId}:`, err);
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
      // Adjust ping command based on platform
      let pingCommand;
      const currentPlatform = platform();
      
      if (currentPlatform === 'win32') {
        // Windows
        pingCommand = `ping -n 4 ${ipAddress}`;
      } else {
        // Linux/macOS
        pingCommand = `ping -c 4 ${ipAddress}`;
      }
      
      const { stdout } = await execAsync(pingCommand);
      
      // Parse the ping output
      return pingParser(stdout, currentPlatform);
    } catch (err) {
      console.log(`Ping failed for ${ipAddress}`);
      return null;
    }
  }
  
  /**
   * Manually trigger a ping test for a router
   * @param routerId Router ID
   * @returns The ping results
   */
  async pingRouterManually(routerId: number): Promise<any[]> {
    return this.pingRouter(routerId);
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
  ) {
    const router = await storage.getRouter(routerId);
    if (!router) {
      throw new Error(`Router with ID ${routerId} not found`);
    }
    
    // Get ping results for the period
    const pingResults = await storage.getRouterPingResults(routerId, startDate, endDate);
    
    // Get ISP connections
    const ispConnections = await storage.getRouterIspConnections(routerId);
    
    // Calculate statistics for main router IP and ISP connections
    const statistics = this.calculateStatistics(pingResults);
    
    // Prepare report data
    const reportData = {
      router,
      timeRange: {
        start: startDate,
        end: endDate
      },
      ispConnections,
      statistics,
      message: options.message || '',
      pingResults
    };
    
    // Store the report
    const report = {
      routerId,
      title: options.title || `Performance Report - ${router.name}`,
      timeRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      data: reportData,
      createdBy: options.userId,
      emailSent: false,
      emailRecipients: options.emailRecipients || []
    };
    
    const savedReport = await storage.createRouterReport(report);
    
    // Send email if recipients are provided
    if (options.emailRecipients && options.emailRecipients.length > 0) {
      await this.sendReportByEmail(savedReport.id, options.emailRecipients);
    }
    
    return savedReport;
  }
  
  /**
   * Calculate statistics from ping results
   * @param results Ping results
   * @returns Calculated statistics
   */
  private calculateStatistics(results: any[]) {
    const statistics: Record<string, any> = {};
    
    // Group results by IP address
    const resultsByIP = results.reduce((acc: Record<string, any[]>, result) => {
      const key = result.isp || 'main';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});
    
    // Calculate statistics for each IP
    for (const [key, ipResults] of Object.entries(resultsByIP)) {
      const totalTests = ipResults.length;
      const successfulTests = ipResults.filter(r => r.successful).length;
      const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
      
      // Filter for successful tests only for latency calculations
      const successfulData = ipResults.filter(r => r.successful);
      
      // Calculate latency statistics
      function isNumericLatency(val: string): boolean {
        return val !== null && val !== undefined && !isNaN(Number(val));
      }
      
      // Convert all latency values to numbers, filtering out null/undefined values
      const latencyValues = successfulData
        .map(r => r.latency)
        .filter(isNumericLatency)
        .map(Number);
      
      // Calculate the sum of all latency values
      const latencySum = latencyValues.length ? 
        latencyValues.reduce((sum: number, val: string) => sum + Number(val), 0) : 0;
        
      // Calculate min/max/avg latency
      const minLatency = latencyValues.length ? Math.min(...latencyValues) : 0;
      const maxLatency = latencyValues.length ? Math.max(...latencyValues) : 0;
      const avgLatency = latencyValues.length ? latencySum / latencyValues.length : 0;
      
      // Process jitter values
      function isNumericJitter(val: string): boolean {
        return val !== null && val !== undefined && !isNaN(Number(val));
      }
      
      const jitterValues = successfulData
        .map(r => r.jitter)
        .filter(isNumericJitter)
        .map(Number);
      
      const jitterSum = jitterValues.length ? 
        jitterValues.reduce((sum: number, val: string) => sum + Number(val), 0) : 0;
      
      const avgJitter = jitterValues.length ? jitterSum / jitterValues.length : 0;
      
      // Process packet loss values
      function isNumericPacketLoss(val: string): boolean {
        return val !== null && val !== undefined && !isNaN(Number(val));
      }
      
      const packetLossValues = ipResults
        .map(r => r.packetLoss)
        .filter(isNumericPacketLoss)
        .map(Number);
      
      const packetLossSum = packetLossValues.length ? 
        packetLossValues.reduce((sum: number, val: string) => sum + Number(val), 0) : 0;
      
      const avgPacketLoss = packetLossValues.length ? packetLossSum / packetLossValues.length : 100;
      
      // Store the statistics
      statistics[key] = {
        totalTests,
        successfulTests,
        successRate: parseFloat(successRate.toFixed(2)),
        minLatency: parseFloat(minLatency.toFixed(2)),
        maxLatency: parseFloat(maxLatency.toFixed(2)),
        avgLatency: parseFloat(avgLatency.toFixed(2)),
        avgJitter: parseFloat(avgJitter.toFixed(2)),
        avgPacketLoss: parseFloat(avgPacketLoss.toFixed(2))
      };
    }
    
    return statistics;
  }
  
  /**
   * Send a report by email
   * @param reportId Report ID
   * @param recipients Email recipients
   * @returns Whether the email was sent successfully
   */
  async sendReportByEmail(reportId: number, recipients: string[]): Promise<boolean> {
    // In production, this would use the email service to send the actual email
    const report = await storage.getRouterReport(reportId);
    if (!report) {
      console.error(`Cannot send email: Report #${reportId} not found`);
      return false;
    }
    
    // Mock email sending (in a real app, use nodemailer or other email service)
    console.log(`[MOCK] Sending report #${reportId} to ${recipients.join(', ')}`);
    
    // In a real implementation, we would:
    // 1. Generate HTML email template using report data
    const htmlContent = this.generateReportEmailHtml(report);
    // 2. Send the email to all recipients
    // 3. Update the report record to indicate email was sent
    
    // For this example, we'll just update the report record
    await storage.updateRouterReport(reportId, {
      emailSent: true
    });
    
    return true;
  }
  
  /**
   * Generate HTML content for report email
   * @param report Router report
   * @returns HTML content
   */
  private generateReportEmailHtml(report: any): string {
    const data = report.data;
    
    // This would be a more elaborate HTML template in a real implementation
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #0052CC; color: white; padding: 20px; }
            .section { margin: 20px 0; border: 1px solid #ddd; padding: 15px; }
            .success { color: #36B37E; }
            .warning { color: #FFAB00; }
            .danger { color: #FF5630; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${report.title}</h2>
            <p>Time Period: ${report.timeRange}</p>
          </div>
          
          <div class="section">
            <h3>Router Information</h3>
            <p><strong>Name:</strong> ${data.router.name}</p>
            <p><strong>IP Address:</strong> ${data.router.ipAddress}</p>
            <p><strong>Location:</strong> ${data.router.location || 'N/A'}</p>
          </div>
          
          <div class="section">
            <h3>Main Connection Performance</h3>
            <table>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Success Rate</td>
                <td class="${this.getStatusClass(data.statistics.main.successRate)}">
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
                <td>Tests Conducted</td>
                <td>${data.statistics.main.totalTests}</td>
              </tr>
            </table>
          </div>
          
          ${data.ispConnections && data.ispConnections.length > 0 ? 
            this.generateIspHtml(data) : ''}
          
          ${data.message ? `
          <div class="section">
            <h3>Additional Information</h3>
            <p>${data.message}</p>
          </div>` : ''}
          
          <div class="footer">
            <p>This is an automated report generated by BHC Network Pulse.</p>
          </div>
        </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Generate HTML for ISP connections
   * @param data Report data
   * @returns HTML content
   */
  private generateIspHtml(data: any): string {
    let html = `
      <div class="section">
        <h3>ISP Connections</h3>
    `;
    
    for (const isp of data.ispConnections) {
      const ispStats = data.statistics[isp.name];
      if (!ispStats) continue;
      
      html += `
        <div style="margin-bottom: 20px;">
          <h4>${isp.name} (${isp.provider || 'Unknown Provider'})</h4>
          <table>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Success Rate</td>
              <td class="${this.getStatusClass(ispStats.successRate)}">
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
              <td>Tests Conducted</td>
              <td>${ispStats.totalTests}</td>
            </tr>
          </table>
        </div>
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
    if (value >= goodThreshold) return 'success';
    if (value >= warningThreshold) return 'warning';
    return 'danger';
  }
  
  /**
   * Get CSS class based on latency
   * @param value Latency value
   * @returns CSS class
   */
  private getLatencyClass(value: number): string {
    if (value < 50) return 'success';
    if (value < 100) return 'warning';
    return 'danger';
  }
  
  /**
   * Get CSS class based on jitter
   * @param value Jitter value
   * @returns CSS class
   */
  private getJitterClass(value: number): string {
    if (value < 10) return 'success';
    if (value < 30) return 'warning';
    return 'danger';
  }
  
  /**
   * Get CSS class based on packet loss
   * @param value Packet loss value
   * @returns CSS class
   */
  private getPacketLossClass(value: number): string {
    if (value < 1) return 'success';
    if (value < 5) return 'warning';
    return 'danger';
  }
}

export const routerMonitor: RouterMonitor = new RouterMonitorService();