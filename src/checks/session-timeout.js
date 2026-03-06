import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'Session Timeout';
export const severity = 'MEDIUM';
export const description = 'Checks if session timeout is properly configured';

/**
 * Check if session timeout is configured
 * Sessions should have reasonable timeout values to prevent unauthorized access
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  // Check for session configuration
  const sessionConfig =
    getConfigValue(config, 'session') ||
    getConfigValue(config, 'gateway.session') ||
    getConfigValue(config, 'auth.session') ||
    getConfigValue(config, 'security.session');

  const sessionTimeout =
    getConfigValue(config, 'session.timeout') ||
    getConfigValue(config, 'gateway.session.timeout') ||
    getConfigValue(config, 'auth.session_timeout') ||
    getConfigValue(config, 'session.ttl');

  // If no session configuration exists, sessions might not be used
  if (!sessionConfig && !sessionTimeout) {
    return {
      passed: false,
      message:
        'No session timeout configuration found. Session timeouts should be configured for security.',
      location: null,
      recommendation:
        'Configure session timeout in the security section. Use reasonable values: 30 minutes for interactive sessions, 24 hours for API tokens.'
    };
  }

  // Check if timeout is configured
  if (!sessionTimeout) {
    return {
      passed: false,
      message: 'Session configuration exists but timeout is not specified.',
      location: null,
      recommendation:
        'Set session.timeout to a reasonable value (in seconds or minutes). Recommended: 1800s (30 minutes) for interactive sessions.'
    };
  }

  // Check if timeout value is reasonable
  if (typeof sessionTimeout === 'number') {
    // Assume value is in seconds if numeric
    const seconds = sessionTimeout;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    // Warn if timeout is very long (more than 24 hours)
    if (hours > 24) {
      return {
        passed: false,
        message: `Session timeout is very long (${hours} hours). This increases risk of unauthorized access.`,
        location: null,
        recommendation:
          'Reduce session timeout to a reasonable value. Maximum recommended: 24 hours. Interactive sessions should be 30 minutes or less.'
      };
    }

    // Warn if timeout is very short (less than 5 minutes)
    if (minutes < 5) {
      return {
        passed: false,
        message: `Session timeout is very short (${minutes} minutes). This may be too restrictive.`,
        location: null,
        recommendation:
          'Increase session timeout for better user experience. Recommended minimum: 15-30 minutes for interactive sessions.'
      };
    }
  }

  return {
    passed: true,
    message: `Session timeout is configured (${sessionTimeout})`,
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
