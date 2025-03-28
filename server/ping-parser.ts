/**
 * Utility to parse ping output from different platforms
 */

export type PingStatistics = {
  min: number;
  max: number;
  avg: number;
  stddev?: number;
  jitter?: number;
  packetLoss: number;
  ttl?: number;
  bytes?: number;
};

/**
 * Parse the output of a ping command into structured data
 * @param pingOutput Raw output from ping command
 * @param platform The platform (win32, darwin, linux, etc.)
 * @returns Parsed ping statistics
 */
export function pingParser(pingOutput: string, platform: string): PingStatistics {
  if (platform === 'win32') {
    return parseWindowsPing(pingOutput);
  } else if (platform === 'darwin') {
    return parseMacOSPing(pingOutput);
  } else {
    // Assume linux or similar
    return parseLinuxPing(pingOutput);
  }
}

/**
 * Parse ping output from Windows
 */
function parseWindowsPing(pingOutput: string): PingStatistics {
  const result: PingStatistics = {
    min: 0,
    max: 0,
    avg: 0,
    packetLoss: 0
  };
  
  // Parse packet loss
  const packetLossMatch = pingOutput.match(/(\d+)% loss/);
  if (packetLossMatch) {
    result.packetLoss = parseInt(packetLossMatch[1], 10);
  }
  
  // Parse min/max/avg times
  const timeMatch = pingOutput.match(/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/);
  if (timeMatch) {
    result.min = parseInt(timeMatch[1], 10);
    result.max = parseInt(timeMatch[2], 10);
    result.avg = parseInt(timeMatch[3], 10);
  }
  
  // Calculate jitter (as a simple measure of variability in latency)
  result.jitter = result.max - result.min;
  
  // Parse TTL if available
  const ttlMatch = pingOutput.match(/TTL=(\d+)/);
  if (ttlMatch) {
    result.ttl = parseInt(ttlMatch[1], 10);
  }
  
  // Parse bytes if available
  const bytesMatch = pingOutput.match(/with (\d+) bytes of data/);
  if (bytesMatch) {
    result.bytes = parseInt(bytesMatch[1], 10);
  }
  
  return result;
}

/**
 * Parse ping output from macOS
 */
function parseMacOSPing(pingOutput: string): PingStatistics {
  const result: PingStatistics = {
    min: 0,
    max: 0,
    avg: 0,
    packetLoss: 0
  };
  
  // Parse packet loss
  const packetLossMatch = pingOutput.match(/(\d+\.?\d*)% packet loss/);
  if (packetLossMatch) {
    result.packetLoss = parseFloat(packetLossMatch[1]);
  }
  
  // Parse round-trip min/avg/max/stddev
  const timeMatch = pingOutput.match(/round-trip min\/avg\/max\/(?:stddev|mdev) = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
  if (timeMatch) {
    result.min = parseFloat(timeMatch[1]);
    result.avg = parseFloat(timeMatch[2]);
    result.max = parseFloat(timeMatch[3]);
    result.stddev = parseFloat(timeMatch[4]);
  }
  
  // Calculate jitter (using stddev or range as fallback)
  result.jitter = result.stddev || (result.max - result.min);
  
  // Parse TTL if available
  const ttlMatch = pingOutput.match(/ttl=(\d+)/i);
  if (ttlMatch) {
    result.ttl = parseInt(ttlMatch[1], 10);
  }
  
  // Parse bytes if available
  const bytesMatch = pingOutput.match(/(\d+) bytes from/);
  if (bytesMatch) {
    result.bytes = parseInt(bytesMatch[1], 10);
  }
  
  return result;
}

/**
 * Parse ping output from Linux
 */
function parseLinuxPing(pingOutput: string): PingStatistics {
  const result: PingStatistics = {
    min: 0,
    max: 0,
    avg: 0,
    packetLoss: 0
  };
  
  // Parse packet loss
  const packetLossMatch = pingOutput.match(/(\d+\.?\d*)% packet loss/);
  if (packetLossMatch) {
    result.packetLoss = parseFloat(packetLossMatch[1]);
  }
  
  // Parse round-trip min/avg/max/mdev
  const timeMatch = pingOutput.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
  if (timeMatch) {
    result.min = parseFloat(timeMatch[1]);
    result.avg = parseFloat(timeMatch[2]);
    result.max = parseFloat(timeMatch[3]);
    result.stddev = parseFloat(timeMatch[4]); // mdev is equivalent to stddev
  }
  
  // Calculate jitter (using mdev or range as fallback)
  result.jitter = result.stddev || (result.max - result.min);
  
  // Parse TTL if available
  const ttlMatch = pingOutput.match(/ttl=(\d+)/i);
  if (ttlMatch) {
    result.ttl = parseInt(ttlMatch[1], 10);
  }
  
  // Parse bytes if available
  const bytesMatch = pingOutput.match(/(\d+) bytes from/);
  if (bytesMatch) {
    result.bytes = parseInt(bytesMatch[1], 10);
  }
  
  return result;
}