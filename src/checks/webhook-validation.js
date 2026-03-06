import { getConfigValue, findLineNumber } from '../scanner.js';

export const name = 'Webhook Validation';
export const severity = 'MEDIUM';
export const description =
  'Validates that webhook endpoints are configured to verify request signatures';

/**
 * Check if webhook signature validation is enabled
 * Webhooks must validate signatures to prevent spoofed requests
 */
export async function run(configData) {
  const config = configData.config;
  const content = configData.content;

  // Check for webhook configuration
  const webhookConfig =
    getConfigValue(config, 'webhooks') ||
    getConfigValue(config, 'gateway.webhooks') ||
    getConfigValue(config, 'webhook') ||
    getConfigValue(config, 'gateway.webhook');

  // If no webhook config exists, assume webhooks are not used
  if (!webhookConfig) {
    return {
      passed: true,
      message: 'No webhook configuration found. Webhooks are not in use.',
      location: null,
      recommendation: null
    };
  }

  // Check if signature validation is enabled
  const signatureValidation =
    getConfigValue(config, 'webhooks.signature_validation.enabled') ||
    getConfigValue(config, 'webhooks.verify_signatures') ||
    getConfigValue(config, 'webhook.signature_validation') ||
    getConfigValue(config, 'gateway.webhook.validate_signature');

  const signatureSecret =
    getConfigValue(config, 'webhooks.secret') ||
    getConfigValue(config, 'webhooks.shared_secret') ||
    getConfigValue(config, 'webhook.secret_key');

  if (signatureValidation === false || signatureValidation === 'disabled') {
    const lineNum = findLineNumber(content, 'signature_validation');
    return {
      passed: false,
      message:
        'Webhook signature validation is disabled. Webhook endpoints are vulnerable to spoofed requests.',
      location: lineNum > 0 ? `gateway.yaml:${lineNum}` : null,
      recommendation:
        'Enable webhook signature validation and ensure a shared secret is configured. Validate HMAC signatures on all incoming webhook requests.'
    };
  }

  if (!signatureValidation && !signatureSecret) {
    return {
      passed: false,
      message:
        'Webhook signature validation is not configured. Endpoints cannot verify request authenticity.',
      location: null,
      recommendation:
        'Configure signature_validation.enabled: true and provide a shared secret for HMAC validation. All webhook consumers must validate signatures.'
    };
  }

  if (signatureValidation && !signatureSecret) {
    return {
      passed: false,
      message:
        'Webhook signature validation is enabled but no shared secret is configured.',
      location: null,
      recommendation:
        'Define a strong shared secret in webhooks.secret. Use a cryptographically random value (minimum 32 bytes). Share this securely with webhook consumers.'
    };
  }

  return {
    passed: true,
    message: 'Webhook signature validation is properly configured',
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
