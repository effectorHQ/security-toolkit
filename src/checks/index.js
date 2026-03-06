// Central registry of all security checks
import * as gatewayExposure from './gateway-exposure.js';
import * as authMissing from './auth-missing.js';
import * as apiKeyInConfig from './api-key-in-config.js';
import * as tlsDisabled from './tls-disabled.js';
import * as defaultPort from './default-port.js';
import * as webhookValidation from './webhook-validation.js';
import * as sessionTimeout from './session-timeout.js';
import * as loggingConfig from './logging-config.js';

export const CHECKS = {
  'gateway-exposure': gatewayExposure,
  'auth-missing': authMissing,
  'api-key-in-config': apiKeyInConfig,
  'tls-disabled': tlsDisabled,
  'default-port': defaultPort,
  'webhook-validation': webhookValidation,
  'session-timeout': sessionTimeout,
  'logging-config': loggingConfig
};

export default CHECKS;
