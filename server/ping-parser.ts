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
  // Determine the platform and call the appropriate parser
  if (platform === 'win32') {
    return parseWindowsPing(pingOutput);
  } else if (platform === 'darwin') {
    return parseMacOSPing(pingOutput);
  } else {
    // Assume Linux or other Unix-like platforms
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
    packetLoss: 100, // Default to 100% packet loss
  };

  // Extract packet loss percentage
  const packetLossMatch = pingOutput.match(/Lost = (\d+) \((\d+)% loss\)/);
  if (packetLossMatch && packetLossMatch[2]) {
    result.packetLoss = parseInt(packetLossMatch[2], 10);
  }

  // Extract ping statistics
  const statsMatch = pingOutput.match(/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/);
  if (statsMatch) {
    result.min = parseInt(statsMatch[1], 10);
    result.max = parseInt(statsMatch[2], 10);
    result.avg = parseInt(statsMatch[3], 10);
  }

  // Extract TTL
  const ttlMatch = pingOutput.match(/TTL=(\d+)/);
  if (ttlMatch && ttlMatch[1]) {
    result.ttl = parseInt(ttlMatch[1], 10);
  }

  // Extract bytes
  const bytesMatch = pingOutput.match(/with (\d+) bytes of data/);
  if (bytesMatch && bytesMatch[1]) {
    result.bytes = parseInt(bytesMatch[1], 10);
  }

  // Calculate jitter (as an approximation using stddev)
  if (result.max > 0 && result.min > 0) {
    // Simple approximation of standard deviation
    result.stddev = (result.max - result.min) / 4;
    result.jitter = result.stddev;
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
    packetLoss: 100, // Default to 100% packet loss
  };

  // Extract packet loss percentage
  const packetLossMatch = pingOutput.match(/(\d+\.?\d*)% packet loss/);
  if (packetLossMatch && packetLossMatch[1]) {
    result.packetLoss = parseFloat(packetLossMatch[1]);
  }

  // Extract ping statistics
  const statsMatch = pingOutput.match(/round-trip min\/avg\/max\/stddev = (\d+\.?\d*)\/(\d+\.?\d*)\/(\d+\.?\d*)\/(\d+\.?\d*) ms/);
  if (statsMatch) {
    result.min = parseFloat(statsMatch[1]);
    result.avg = parseFloat(statsMatch[2]);
    result.max = parseFloat(statsMatch[3]);
    result.stddev = parseFloat(statsMatch[4]);
    result.jitter = result.stddev; // Use stddev as jitter in macOS
  }

  // Extract TTL
  const ttlMatch = pingOutput.match(/ttl=(\d+)/i);
  if (ttlMatch && ttlMatch[1]) {
    result.ttl = parseInt(ttlMatch[1], 10);
  }

  // Extract bytes
  const bytesMatch = pingOutput.match(/(\d+) bytes/);
  if (bytesMatch && bytesMatch[1]) {
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
    packetLoss: 100, // Default to 100% packet loss
  };

  // Extract packet loss percentage
  const packetLossMatch = pingOutput.match(/(\d+)% packet loss/);
  if (packetLossMatch && packetLossMatch[1]) {
    result.packetLoss = parseInt(packetLossMatch[1], 10);
  }

  // Extract ping statistics
  const statsMatch = pingOutput.match(/rtt min\/avg\/max\/mdev = (\d+\.?\d*)\/(\d+\.?\d*)\/(\d+\.?\d*)\/(\d+\.?\d*) ms/);
  if (statsMatch) {
    result.min = parseFloat(statsMatch[1]);
    result.avg = parseFloat(statsMatch[2]);
    result.max = parseFloat(statsMatch[3]);
    result.stddev = parseFloat(statsMatch[4]);
    result.jitter = result.stddev; // Use mdev as jitter in Linux
  }

  // Extract TTL
  const ttlMatch = pingOutput.match(/ttl=(\d+)/i);
  if (ttlMatch && ttlMatch[1]) {
    result.ttl = parseInt(ttlMatch[1], 10);
  }

  // Extract bytes
  const bytesMatch = pingOutput.match(/(\d+)\(\d+\) bytes/);
  if (bytesMatch && bytesMatch[1]) {
    result.bytes = parseInt(bytesMatch[1], 10);
  }

  return result;
}