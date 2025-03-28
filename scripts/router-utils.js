#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import { storage } from '../server/storage.js';
import { routerMonitor } from '../server/router-monitor.js';

// Available commands
const COMMANDS = {
  LIST: 'list',
  PING: 'ping',
  REPORT: 'report',
  SCHEDULE: 'schedule',
  GROUP: 'group'
};

// Helper to log error and exit
function exitWithError(message) {
  console.error(`ERROR: ${message}`);
  console.log('\nUsage:');
  console.log('  node router-utils.js list                          - List all routers');
  console.log('  node router-utils.js ping <routerId>               - Ping a router and all its ISP connections');
  console.log('  node router-utils.js report <routerId> [days]      - Generate a report for a router (default: 7 days)');
  console.log('  node router-utils.js schedule <routerId> <config>  - Set router ping schedule');
  console.log('  node router-utils.js group <by>                    - Group routers by: location, isp, type');
  process.exit(1);
}

// List all routers with their connections
async function listRouters() {
  try {
    const routers = await storage.getAllRouters();
    
    if (routers.length === 0) {
      console.log('No routers found. Run scripts/import-routers.js first.');
      return;
    }
    
    console.log(`Found ${routers.length} routers:\n`);
    
    for (const router of routers) {
      console.log(`Router #${router.id}: ${router.name}`);
      console.log(`  Location: ${router.location}`);
      console.log(`  IP: ${router.ipAddress}`);
      console.log(`  Model: ${router.model || 'Unknown'}`);
      console.log(`  Monitoring: ${router.monitoringEnabled ? 'Enabled' : 'Disabled'}`);
      
      // Get ISP connections for this router
      const connections = await storage.getRouterIspConnections(router.id);
      
      if (connections.length > 0) {
        console.log('  ISP Connections:');
        connections.forEach(conn => {
          console.log(`    - ${conn.name} (${conn.ipAddress}) [${conn.provider}]`);
        });
      } else {
        console.log('  ISP Connections: None');
      }
      
      console.log('');
    }
  } catch (error) {
    exitWithError(`Error listing routers: ${error.message}`);
  }
}

// Ping a router and all its ISP connections
async function pingRouter(routerId) {
  try {
    console.log(`Pinging router #${routerId} and all its connections...`);
    const results = await routerMonitor.pingRouterManually(routerId);
    
    if (results.length === 0) {
      console.log('No ping results returned. Check if the router exists.');
      return;
    }
    
    console.log(`\nPing Results (${results.length} connections):`);
    
    // Sort by ISP first
    results.sort((a, b) => {
      if (!a.isp && b.isp) return -1; // Main router IP first
      if (a.isp && !b.isp) return 1;
      if (a.isp && b.isp) return a.isp.localeCompare(b.isp);
      return 0;
    });
    
    for (const result of results) {
      const connectionType = !result.isp ? 'Main Router' : `${result.isp}`;
      const status = result.successful ? 'SUCCESS' : 'FAILED';
      const statusColor = result.successful ? '\x1b[32m' : '\x1b[31m'; // Green or Red
      const resetColor = '\x1b[0m';
      const latencyStr = result.latency !== null ? `${result.latency.toFixed(2)}ms` : 'N/A';
      const packetLossStr = result.packetLoss !== null ? `${result.packetLoss.toFixed(1)}%` : 'N/A';
      
      console.log(`${connectionType} (${result.ipAddress}): ${statusColor}${status}${resetColor}`);
      console.log(`  Latency: ${latencyStr}`);
      console.log(`  Packet Loss: ${packetLossStr}`);
      if (result.jitter !== null) {
        console.log(`  Jitter: ${result.jitter.toFixed(2)}ms`);
      }
      console.log('');
    }
  } catch (error) {
    exitWithError(`Error pinging router: ${error.message}`);
  }
}

// Generate a report for a router
async function generateReport(routerId, days = 7) {
  try {
    const router = await storage.getRouter(routerId);
    
    if (!router) {
      exitWithError(`Router with ID ${routerId} not found`);
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log(`Generating report for router #${routerId} (${router.name}) from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`);
    
    const report = await routerMonitor.generateRouterReport(routerId, startDate, endDate, {
      title: `Performance Report for ${router.name} - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      userId: 1,
      message: `Automated report generated for ${router.name} covering the past ${days} days.`
    });
    
    console.log(`\nReport #${report.id} generated successfully.`);
    
    // Display report summary
    const data = report.data;
    
    console.log('\nSummary:');
    console.log(`Router: ${data.router.name} (${data.router.ipAddress})`);
    console.log(`Location: ${data.router.location}`);
    console.log(`Period: ${new Date(data.timeRange.start).toLocaleDateString()} to ${new Date(data.timeRange.end).toLocaleDateString()}`);
    
    console.log('\nPrimary Connection:');
    console.log(`Success Rate: ${data.statistics.main.successRate}%`);
    console.log(`Avg. Latency: ${data.statistics.main.avgLatency}ms`);
    console.log(`Min Latency: ${data.statistics.main.minLatency}ms`);
    console.log(`Max Latency: ${data.statistics.main.maxLatency}ms`);
    console.log(`Avg. Jitter: ${data.statistics.main.avgJitter}ms`);
    console.log(`Avg. Packet Loss: ${data.statistics.main.avgPacketLoss}%`);
    console.log(`Tests Conducted: ${data.statistics.main.totalTests}`);
    
    // Display ISP connection stats
    if (data.ispConnections && data.ispConnections.length > 0) {
      console.log('\nISP Connections:');
      
      for (const isp of data.ispConnections) {
        const ispStats = data.statistics[isp.name];
        if (!ispStats) continue;
        
        console.log(`\n${isp.name} (${isp.provider || 'Unknown Provider'}) - ${isp.ipAddress}:`);
        console.log(`Success Rate: ${ispStats.successRate}%`);
        console.log(`Avg. Latency: ${ispStats.avgLatency}ms`);
        console.log(`Min Latency: ${ispStats.minLatency}ms`);
        console.log(`Max Latency: ${ispStats.maxLatency}ms`);
        console.log(`Avg. Jitter: ${ispStats.avgJitter}ms`);
        console.log(`Avg. Packet Loss: ${ispStats.avgPacketLoss}%`);
        console.log(`Tests Conducted: ${ispStats.totalTests}`);
      }
    }
  } catch (error) {
    exitWithError(`Error generating report: ${error.message}`);
  }
}

// Set router ping schedule
async function setSchedule(routerId, configStr) {
  try {
    const router = await storage.getRouter(routerId);
    
    if (!router) {
      exitWithError(`Router with ID ${routerId} not found`);
    }
    
    // Parse schedule config string
    // Format: type:value
    // Examples: daily:08:00,17:00 | interval:30m | cron:0 0 * * *
    const [type, value] = configStr.split(':');
    
    let scheduleConfig;
    
    if (type === 'daily') {
      const times = value.split(',');
      scheduleConfig = {
        type: 'daily',
        times
      };
      console.log(`Setting daily schedule at times: ${times.join(', ')}`);
    } 
    else if (type === 'interval') {
      const intervalRegex = /^(\d+)([mh])$/;
      const match = value.match(intervalRegex);
      
      if (!match) {
        exitWithError(`Invalid interval format. Use: 30m, 1h, etc.`);
      }
      
      scheduleConfig = {
        type: 'interval',
        interval: value
      };
      console.log(`Setting interval schedule every ${value}`);
    } 
    else if (type === 'cron') {
      scheduleConfig = {
        type: 'cron',
        cronExpression: value
      };
      console.log(`Setting cron schedule with expression: ${value}`);
    } 
    else {
      exitWithError(`Invalid schedule type. Use: daily, interval, or cron`);
    }
    
    // Update router with new schedule
    await storage.updateRouter(routerId, {
      scheduleConfig,
      monitoringEnabled: true
    });
    
    // Update the scheduler
    routerMonitor.setupScheduleForRouter(routerId, scheduleConfig);
    
    console.log(`\nSchedule updated for router #${routerId} (${router.name})`);
  } catch (error) {
    exitWithError(`Error setting schedule: ${error.message}`);
  }
}

// Group routers by different criteria
async function groupRouters(by) {
  try {
    const routers = await storage.getAllRouters();
    
    if (routers.length === 0) {
      console.log('No routers found. Run scripts/import-routers.js first.');
      return;
    }
    
    if (by === 'location') {
      console.log('Grouping routers by location:\n');
      
      const routersByLocation = routers.reduce((acc, router) => {
        if (!acc[router.location]) acc[router.location] = [];
        acc[router.location].push(router);
        return acc;
      }, {});
      
      for (const [location, locationRouters] of Object.entries(routersByLocation)) {
        console.log(`Location: ${location} (${locationRouters.length} routers)`);
        
        for (const router of locationRouters) {
          console.log(`  - ${router.name} (${router.ipAddress})`);
        }
        
        console.log('');
      }
    } 
    else if (by === 'isp') {
      console.log('Grouping connections by ISP:\n');
      
      // Get all connections for all routers
      const allConnections = await Promise.all(
        routers.map(async router => {
          const connections = await storage.getRouterIspConnections(router.id);
          return connections.map(conn => ({
            ...conn,
            routerName: router.name,
            routerLocation: router.location
          }));
        })
      ).then(conns => conns.flat());
      
      // Group by provider
      const connectionsByProvider = allConnections.reduce((acc, conn) => {
        const provider = conn.provider || 'Unknown';
        if (!acc[provider]) acc[provider] = [];
        acc[provider].push(conn);
        return acc;
      }, {});
      
      for (const [provider, connections] of Object.entries(connectionsByProvider)) {
        console.log(`ISP: ${provider} (${connections.length} connections)`);
        
        for (const conn of connections) {
          console.log(`  - ${conn.name} (${conn.ipAddress}) - ${conn.routerName} (${conn.routerLocation})`);
        }
        
        console.log('');
      }
    } 
    else if (by === 'type') {
      console.log('Grouping connections by type:\n');
      
      // Get all connections for all routers
      const allConnections = await Promise.all(
        routers.map(async router => {
          const connections = await storage.getRouterIspConnections(router.id);
          return connections.map(conn => ({
            ...conn,
            routerName: router.name,
            routerLocation: router.location
          }));
        })
      ).then(conns => conns.flat());
      
      // Group by connection type
      const connectionsByType = allConnections.reduce((acc, conn) => {
        // Determine type from name
        let type = 'Other';
        if (conn.name.includes('Internet')) type = 'Internet';
        else if (conn.name.includes('Link')) type = 'Link';
        else if (conn.name.includes('VPN')) type = 'VPN';
        
        if (!acc[type]) acc[type] = [];
        acc[type].push(conn);
        return acc;
      }, {});
      
      for (const [type, connections] of Object.entries(connectionsByType)) {
        console.log(`Type: ${type} (${connections.length} connections)`);
        
        for (const conn of connections) {
          console.log(`  - ${conn.name} (${conn.ipAddress}) - ${conn.routerName} (${conn.routerLocation})`);
        }
        
        console.log('');
      }
    } 
    else {
      exitWithError(`Invalid grouping criteria. Use: location, isp, or type`);
    }
  } catch (error) {
    exitWithError(`Error grouping routers: ${error.message}`);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  if (!command) {
    exitWithError('No command provided');
  }
  
  switch (command) {
    case COMMANDS.LIST:
      await listRouters();
      break;
      
    case COMMANDS.PING:
      const routerId = parseInt(args[1], 10);
      if (isNaN(routerId)) {
        exitWithError('Invalid router ID');
      }
      await pingRouter(routerId);
      break;
      
    case COMMANDS.REPORT:
      const reportRouterId = parseInt(args[1], 10);
      const days = parseInt(args[2], 10) || 7;
      if (isNaN(reportRouterId)) {
        exitWithError('Invalid router ID');
      }
      await generateReport(reportRouterId, days);
      break;
      
    case COMMANDS.SCHEDULE:
      const scheduleRouterId = parseInt(args[1], 10);
      const scheduleConfig = args[2];
      if (isNaN(scheduleRouterId)) {
        exitWithError('Invalid router ID');
      }
      if (!scheduleConfig) {
        exitWithError('No schedule configuration provided');
      }
      await setSchedule(scheduleRouterId, scheduleConfig);
      break;
      
    case COMMANDS.GROUP:
      const groupBy = args[1]?.toLowerCase();
      if (!groupBy || !['location', 'isp', 'type'].includes(groupBy)) {
        exitWithError('Invalid grouping criteria. Use: location, isp, or type');
      }
      await groupRouters(groupBy);
      break;
      
    default:
      exitWithError(`Unknown command: ${command}`);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });