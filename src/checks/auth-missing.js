import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'Authentication Missing';
export const severity = 'CRITICAL';
export const description = 'Verifies that authentication is configured for the gateway';

/**
 * Check if authentication is configured
 * Authentication must be enabled to control access to the gateway
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  // Check various possible locations for auth configuration
  const authConfig =
    getConfigValue(config, 'auth') ||
    getConfigValue(config, 'authentication') ||
    getConfigValue(config, 'gateway.auth') ||
    getConfigValue(config, 'gateway.authentication') ||
    getConfigValue(config, 'security.authentication');

  const authEnabled = getConfigValue(config, 'gateway.auth.enabled', false) ||
    getConfigValue(config, 'auth.enabled', false) ||
    getConfigValue(config, 'authentication.enabled', false);

  // Check if auth is explicitly disabled
  if (authConfig === false || authConfig === 'disabled' || authEnabled === false) {
    const lineNum = findLineNumber(content, 'auth');
    return {
      passed: false,
      message:
        'Authentication is disabled. All requests will be processed without any verification.',
      location:
        lineNum > 0 ? `gateway.yaml:${lineNum} - auth: disabled` : null,
      recommendation:
        'Enable authentication and configure user credentials. Use supported auth methods like API keys, JWT, or LDAP'
    };
  }

  // Check if auth configuration exists
  if (!authConfig && !authEnabled) {
    return {
      passed: false,
      message: 'No authentication mechanism is configured.',
      location: null,
      recommendation:
        'Configure authentication in the gateway. Add auth section with credentials or API key management'
    };
  }

  // Check if auth has required fields
  if (typeof authConfig === 'object' && authConfig !== null) {
    const hasCredentials =
      authConfig.credentials ||
      authConfig.users ||
      authConfig.tokens ||
      authConfig.api_keys;
    if (!hasCredentials) {
      return {
        passed: false,
        message: 'Authentication is configured but no credentials are defined.',
        location: null,
        recommendation: 'Define user credentials, API keys, or tokens in the auth configuration'
      };
    }
  }

  return {
    passed: true,
    message: 'Authentication is properly configured',
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
