import { storage } from './storage';
import { DeviceWithStatus } from '@shared/schema';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Class to handle network monitoring functionality
export class NetworkMonitor {
  private monitoringIntervalId: NodeJS.Timeout | null = null;
  private readonly monitoringInterval = 60000; // 1 minute
  private readonly maxFailuresBeforeAlert = 3;
  private failureCounters: Map<number, number> = new Map();

  constructor() {}

  // Start monitoring all devices
  public start(): void {
    if (!this.monitoringIntervalId) {
      // Immediately run first check
      this.checkAllDevices();
      
      // Then set interval for subsequent checks
      this.monitoringIntervalId = setInterval(() => {
        this.checkAllDevices();
      }, this.monitoringInterval);
      
      console.log('Network monitoring started');
    }
  }

  // Stop monitoring
  public stop(): void {
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
      console.log('Network monitoring stopped');
    }
  }

  // Check a single device
  public async checkDevice(deviceId: number): Promise<DeviceWithStatus | undefined> {
    const device = await storage.getDevice(deviceId);
    if (!device || !device.monitoringEnabled) {
      return undefined;
    }

    try {
      const pingResult = await this.pingDevice(device.ipAddress);
      
      // Store ping result in database
      await storage.createPingResult({
        deviceId: device.id,
        successful: pingResult.successful,
        latency: pingResult.latency
      });

      // Handle alert creation or resolution based on ping result
      if (!pingResult.successful) {
        const currentFailures = (this.failureCounters.get(deviceId) || 0) + 1;
        this.failureCounters.set(deviceId, currentFailures);
        
        if (currentFailures >= this.maxFailuresBeforeAlert) {
          // Create alert for device offline
          await storage.createAlert({
            deviceId: device.id,
            message: `${device.name} is offline`,
            severity: 'error',
            resolved: false
          });
        }
      } else {
        // Reset failure counter if device is back online
        if (this.failureCounters.get(deviceId) && this.failureCounters.get(deviceId)! >= this.maxFailuresBeforeAlert) {
          // Create alert for device back online
          await storage.createAlert({
            deviceId: device.id,
            message: `${device.name} is back online`,
            severity: 'info',
            resolved: false
          });
        }
        this.failureCounters.set(deviceId, 0);
        
        // Check latency threshold for warning
        if (pingResult.latency > 100) {
          await storage.createAlert({
            deviceId: device.id,
            message: `High latency detected on ${device.name} (${pingResult.latency}ms)`,
            severity: 'warning',
            resolved: false
          });
        }
      }

      // Get complete device status
      return {
        ...device,
        status: !pingResult.successful 
          ? 'offline' 
          : (pingResult.latency > 100 ? 'warning' : 'online'),
        latency: pingResult.successful ? pingResult.latency : undefined,
        uptime: pingResult.successful ? this.calculateUptime(device.id) : undefined
      };
    } catch (error) {
      console.error(`Error checking device ${device.name}:`, error);
      return {
        ...device,
        status: 'offline',
        latency: undefined,
        uptime: undefined
      };
    }
  }

  // Check all devices
  private async checkAllDevices(): Promise<void> {
    try {
      const devices = await storage.getAllDevices();
      
      for (const device of devices) {
        if (device.monitoringEnabled) {
          await this.checkDevice(device.id);
        }
      }
    } catch (error) {
      console.error('Error checking devices:', error);
    }
  }

  // Ping a device and return result
  private async pingDevice(ipAddress: string): Promise<{ successful: boolean; latency?: number }> {
    try {
      // Different ping command format based on OS
      const pingCount = process.platform === 'win32' ? '-n 4' : '-c 4';
      const pingTimeout = process.platform === 'win32' ? '-w 1000' : '-W 1';
      
      const { stdout } = await execAsync(`ping ${pingCount} ${pingTimeout} ${ipAddress}`);
      
      // Parse ping output to extract latency
      const successful = !stdout.includes('100% packet loss') && !stdout.includes('100% loss');
      
      let latency: number | undefined;
      if (successful) {
        // Extract average ping time
        const avgMatch = stdout.match(/Average = (\d+)ms/) || // Windows format
                         stdout.match(/min\/avg\/max\/mdev = [0-9.]+\/([0-9.]+)\/[0-9.]+\/[0-9.]+ ms/); // Unix format
        
        if (avgMatch && avgMatch[1]) {
          latency = parseInt(avgMatch[1], 10);
        }
      }
      
      return { successful, latency };
    } catch (error) {
      // If ping command fails, device is considered offline
      return { successful: false };
    }
  }

  // Helper method to calculate device uptime (mocked for now)
  private calculateUptime(deviceId: number): string {
    // In a real implementation, this would calculate based on ping history
    // For now, it returns a random placeholder
    const days = Math.floor(Math.random() * 30);
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }
}

// Export a singleton instance
export const networkMonitor = new NetworkMonitor();
