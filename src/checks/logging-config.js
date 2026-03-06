import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'Logging Configuration';
export const severity = 'LOW';
export const description = 'Verifies that audit logging is enabled for security events';

/**
 * Check if logging is properly configured
 * Audit logs are essential for detecting and investigating security incidents
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  // Check for logging configuration
  const loggingConfig =
    getConfigValue(config, 'logging') ||
    getConfigValue(config, 'gateway.logging') ||
    getConfigValue(config, 'log') ||
    getConfigValue(config, 'logs');

  const auditLogging =
    getConfigValue(config, 'logging.audit') ||
    getConfigValue(config, 'logging.audit.enabled') ||
    getConfigValue(config, 'gateway.audit_logging') ||
    getConfigValue(config, 'audit.enabled');

  const logLevel =
    getConfigValue(config, 'logging.level') ||
    getConfigValue(config, 'gateway.logging.level') ||
    getConfigValue(config, 'log.level');

  // If no logging configuration exists
  if (!loggingConfig && !auditLogging) {
    return {
      passed: false,
      message: 'No logging configuration found. Audit logging should be enabled.',
      location: null,
      recommendation:
        'Configure logging to capture security-relevant events. Enable audit logging to track authentication attempts, API access, and configuration changes.'
    };
  }

  // Check if audit logging is explicitly disabled
  if (auditLogging === false) {
    const lineNum = findLineNumber(content, 'audit');
    return {
      passed: false,
      message: 'Audit logging is disabled. Security events will not be recorded.',
      location: lineNum > 0 ? `gateway.yaml:${lineNum}` : null,
      recommendation:
        'Enable audit logging by setting logging.audit.enabled: true. Configure log output to a secure location with restricted access.'
    };
  }

  // Check if log level is appropriate
  if (logLevel) {
    const levelHierarchy = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevel = String(logLevel).toLowerCase();
    const levelIndex = levelHierarchy.indexOf(currentLevel);

    // Warn if log level is too high (missing important events)
    if (levelIndex > 1) {
      // Anything above 'info'
      return {
        passed: false,
        message: `Log level is set to ${currentLevel}. Important security events may not be captured.`,
        location: null,
        recommendation:
          'Set log level to "info" or "debug" to capture all relevant security events including authentication, authorization, and API access.'
      };
    }
  } else {
    return {
      passed: false,
      message: 'Logging is configured but log level is not specified.',
      location: null,
      recommendation:
        'Set logging.level to "info" to capture security-relevant events without excessive debug output.'
    };
  }

  return {
    passed: true,
    message: 'Logging is properly configured',
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
