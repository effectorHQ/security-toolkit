import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'Default Port';
export const severity = 'HIGH';
export const description =
  'Warns if the default port 18789 is used without firewall protection rules';

/**
 * Check if default port is used with firewall rules
 * Using the default port without firewall rules exposes the service
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  const DEFAULT_OPENCLAW_PORT = 18789;

  // Check for port configuration
  const port =
    getConfigValue(config, 'gateway.port') ||
    getConfigValue(config, 'port') ||
    getConfigValue(config, 'gateway.listen_port') ||
    getConfigValue(config, 'server.port');

  const firewall =
    getConfigValue(config, 'gateway.firewall') ||
    getConfigValue(config, 'firewall') ||
    getConfigValue(config, 'security.firewall');

  const firewallRules =
    getConfigValue(config, 'gateway.firewall.rules') ||
    getConfigValue(config, 'firewall.rules') ||
    getConfigValue(config, 'security.firewall_rules');

  // Port not specified defaults to 18789
  const actualPort = port || DEFAULT_OPENCLAW_PORT;

  if (actualPort === DEFAULT_OPENCLAW_PORT) {
    const hasFirewall =
      firewall === true ||
      (typeof firewall === 'object' && firewall !== null) ||
      (Array.isArray(firewallRules) && firewallRules.length > 0);

    if (!hasFirewall) {
      const lineNum = findLineNumber(content, 'port');
      return {
        passed: false,
        message: `Gateway is using the default port ${DEFAULT_OPENCLAW_PORT} without configured firewall rules. This exposes the service.`,
        location:
          lineNum > 0 ? `gateway.yaml:${lineNum} - port: ${DEFAULT_OPENCLAW_PORT}` : null,
        recommendation:
          'Configure firewall rules to restrict access to port 18789. Only allow connections from authorized IP addresses or networks. Alternatively, change to a non-standard port.'
      };
    }
  }

  return {
    passed: true,
    message: `Port configuration is acceptable (${actualPort})`,
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
