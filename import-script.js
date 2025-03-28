import { storage } from './server/storage.js';
import ipData from './attached_assets/ips.json' assert { type: 'json' };

// Function to parse an IP name to extract location and ISP
function parseIPName(name) {
  // Extract location (first part of the name)
  const location = name.split(' ')[0];
  
  // Extract ISP (Liquid or Telone)
  const isp = name.includes('Liquid') ? 'Liquid' : 
            name.includes('Telone') ? 'Telone' : 'Other';
  
  // Extract type (Internet, Link, VPN)
  let type = 'Other';
  if (name.includes('Internet')) type = 'Internet';
  else if (name.includes('Link')) type = 'Link';
  else if (name.includes('VPN')) type = 'VPN';
  
  return { location, isp, type };
}

// Function to group IPs by location
function groupByLocation(ips) {
  const locations = {};
  
  ips.forEach(ip => {
    const { location } = parseIPName(ip.name);
    
    if (!locations[location]) {
      locations[location] = [];
    }
    
    locations[location].push(ip);
  });
  
  return locations;
}

// Main function to import routers and IPs
async function importRoutersAndIPs() {
  try {   
    console.log(`Found ${ipData.length} IP addresses to import`);
    
    // Group IPs by location
    const ipsByLocation = groupByLocation(ipData);
    
    // Create routers and ISP connections
    for (const [location, ips] of Object.entries(ipsByLocation)) {
      // Filter out known ISPs
      const liquidIPs = ips.filter(ip => ip.name.includes('Liquid'));
      const teloneIPs = ips.filter(ip => ip.name.includes('Telone'));
      
      if (liquidIPs.length > 0 || teloneIPs.length > 0) {
        // Create the router
        const router = await storage.createRouter({
          name: `${location} Router`,
          ipAddress: liquidIPs.length > 0 ? liquidIPs[0].ip : teloneIPs[0].ip, // Primary IP
          location: location,
          description: `Main router for ${location} location`,
          model: 'Cisco ASR 1001-X',
          monitoringEnabled: true,
          scheduleConfig: {
            type: 'interval',
            interval: '1h' // Ping every hour
          },
          createdBy: 1 // Default user
        });
        
        console.log(`Created router for ${location}: ${router.name} (${router.ipAddress})`);
        
        // Create ISP connections
        // Add Liquid ISPs
        for (const ip of liquidIPs) {
          if (ip.ip !== router.ipAddress) { // Skip primary IP
            const connectionType = ip.name.includes('Link') ? 'Link' :
                                  ip.name.includes('VPN') ? 'VPN' : 'Internet';
            
            await storage.createRouterIspConnection({
              routerId: router.id,
              name: `Liquid ${connectionType}`,
              ipAddress: ip.ip,
              bandwidth: connectionType === 'Internet' ? '100Mbps' : '50Mbps',
              provider: 'Liquid Telecom',
              notes: `${connectionType} connection for ${location}`,
              isActive: true
            });
            
            console.log(`  Added Liquid ${connectionType} ISP connection: ${ip.ip}`);
          }
        }
        
        // Add Telone ISPs
        for (const ip of teloneIPs) {
          const connectionType = ip.name.includes('Link') ? 'Link' :
                                ip.name.includes('VPN') ? 'VPN' : 'Internet';
          
          await storage.createRouterIspConnection({
            routerId: router.id,
            name: `Telone ${connectionType}`,
            ipAddress: ip.ip,
            bandwidth: connectionType === 'Internet' ? '50Mbps' : '30Mbps',
            provider: 'TelOne',
            notes: `${connectionType} connection for ${location}`,
            isActive: true
          });
          
          console.log(`  Added Telone ${connectionType} ISP connection: ${ip.ip}`);
        }
      }
    }
    
    console.log('Import completed successfully!');
    
    // Display some stats
    const routers = await storage.getAllRouters();
    const connections = await Promise.all(routers.map(r => storage.getRouterIspConnections(r.id)))
                              .then(conns => conns.flat());
    
    console.log('\nImport Summary:');
    console.log(`Total Routers: ${routers.length}`);
    console.log(`Total ISP Connections: ${connections.length}`);
    console.log(`Liquid Connections: ${connections.filter(c => c.provider === 'Liquid Telecom').length}`);
    console.log(`TelOne Connections: ${connections.filter(c => c.provider === 'TelOne').length}`);
    
    // Group by location
    console.log('\nRouters by Location:');
    const routersByLocation = routers.reduce((acc, router) => {
      if (!acc[router.location]) acc[router.location] = 0;
      acc[router.location]++;
      return acc;
    }, {});
    
    for (const [location, count] of Object.entries(routersByLocation)) {
      console.log(`  ${location}: ${count}`);
    }
  } catch (error) {
    console.error('Error importing routers and IPs:', error);
  }
}

// Run the import
importRoutersAndIPs();