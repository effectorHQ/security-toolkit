import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'TLS Disabled';
export const severity = 'HIGH';
export const description =
  'Checks if TLS/SSL encryption is configured for gateway communication';

/**
 * Check if TLS/SSL is enabled
 * All production gateways must use TLS to encrypt communication
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  // Check for TLS configuration
  const tlsEnabled =
    getConfigValue(config, 'gateway.tls.enabled') ||
    getConfigValue(config, 'tls.enabled') ||
    getConfigValue(config, 'ssl.enabled') ||
    getConfigValue(config, 'gateway.ssl.enabled');

  const tlsConfig =
    getConfigValue(config, 'gateway.tls') ||
    getConfigValue(config, 'tls') ||
    getConfigValue(config, 'ssl') ||
    getConfigValue(config, 'gateway.ssl');

  // Check if TLS is explicitly disabled
  if (tlsEnabled === false) {
    const lineNum = findLineNumber(content, 'tls.enabled');
    return {
      passed: false,
      message: 'TLS/SSL encryption is not enabled. All communication is unencrypted.',
      location: lineNum > 0 ? `gateway.yaml:${lineNum} - tls.enabled: false` : null,
      recommendation:
        'Enable TLS by setting tls.enabled: true and providing valid certificates. Use self-signed certs for development and proper CA-signed certs for production'
    };
  }

  // Check if no TLS configuration exists
  if (!tlsEnabled && !tlsConfig) {
    return {
      passed: false,
      message: 'No TLS/SSL configuration found. Gateway communication is not encrypted.',
      location: null,
      recommendation:
        'Configure TLS in the gateway. Add tls section with certificate_path and key_path pointing to valid certificates'
    };
  }

  // Check if TLS config has required certificate paths
  if (typeof tlsConfig === 'object' && tlsConfig !== null) {
    const hasCertificates =
      tlsConfig.certificate_path ||
      tlsConfig.cert_path ||
      tlsConfig.certificate ||
      tlsConfig.crt;
    const hasKeyPath =
      tlsConfig.key_path ||
      tlsConfig.private_key ||
      tlsConfig.key ||
      tlsConfig.pem;

    if (!hasCertificates || !hasKeyPath) {
      return {
        passed: false,
        message: 'TLS is configured but certificate or key paths are missing.',
        location: null,
        recommendation:
          'Specify certificate_path and key_path in tls configuration. Ensure files exist and are readable by the gateway process'
      };
    }
  }

  return {
    passed: true,
    message: 'TLS/SSL is properly configured',
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
