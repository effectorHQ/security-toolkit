import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'Gateway Exposure';
export const severity = 'CRITICAL';
export const description =
  'Detects if the gateway is listening on 0.0.0.0 instead of a specific interface';

/**
 * Check if gateway is exposed to all interfaces
 * The gateway should never listen on 0.0.0.0 as it exposes the service to all networks
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  // Check various possible locations for bind address
  const bindAddress =
    getConfigValue(config, 'gateway.bind_address') ||
    getConfigValue(config, 'gateway.listen') ||
    getConfigValue(config, 'bind_address') ||
    getConfigValue(config, 'listen_address') ||
    getConfigValue(config, 'server.listen_address');

  // If no address is configured, assume it defaults to 0.0.0.0
  if (!bindAddress) {
    return {
      passed: false,
      message:
        'No bind address configured. Gateway may default to listening on 0.0.0.0',
      location: null,
      recommendation:
        'Explicitly set bind_address in gateway configuration to 127.0.0.1 or a specific internal IP'
    };
  }

  if (bindAddress === '0.0.0.0' || bindAddress === '::') {
    const lineNum = findLineNumber(content, 'bind_address');
    return {
      passed: false,
      message:
        'Gateway is listening on all network interfaces (0.0.0.0). This exposes the service to all networks.',
      location:
        lineNum > 0
          ? `gateway.yaml:${lineNum} - bind_address: ${bindAddress}`
          : null,
      recommendation:
        'Change bind_address to 127.0.0.1 for localhost-only access or specify a private network IP (e.g., 192.168.x.x, 10.x.x.x)'
    };
  }

  return {
    passed: true,
    message: `Gateway is properly bound to ${bindAddress}`,
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
