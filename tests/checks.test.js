import { test } from 'node:test';
import assert from 'node:assert';
import * as gatewayExposure from '../src/checks/gateway-exposure.js';
import * as authMissing from '../src/checks/auth-missing.js';
import * as apiKeyInConfig from '../src/checks/api-key-in-config.js';
import * as tlsDisabled from '../src/checks/tls-disabled.js';
import * as defaultPort from '../src/checks/default-port.js';
import * as webhookValidation from '../src/checks/webhook-validation.js';
import * as sessionTimeout from '../src/checks/session-timeout.js';
import * as loggingConfig from '../src/checks/logging-config.js';

// Test data
const goodConfig = {
  type: 'yaml',
  path: '/test/gateway.yaml',
  content: `
gateway:
  bind_address: 127.0.0.1
  port: 18789
  auth:
    enabled: true
    credentials:
      - user: admin
        password: secure_password
  tls:
    enabled: true
    certificate_path: /etc/openclaw/certs/cert.pem
    key_path: /etc/openclaw/certs/key.pem
  firewall:
    enabled: true
    rules:
      - allow: 192.168.1.0/24
      - allow: 10.0.0.0/8
  webhooks:
    signature_validation:
      enabled: true
    secret: very_secure_shared_secret
  session:
    timeout: 1800
  logging:
    level: info
    audit:
      enabled: true
`,
  config: {
    gateway: {
      bind_address: '127.0.0.1',
      port: 18789,
      auth: {
        enabled: true,
        credentials: [
          { user: 'admin', password: 'secure_password' }
        ]
      },
      tls: {
        enabled: true,
        certificate_path: '/etc/openclaw/certs/cert.pem',
        key_path: '/etc/openclaw/certs/key.pem'
      },
      firewall: {
        enabled: true,
        rules: [
          { allow: '192.168.1.0/24' },
          { allow: '10.0.0.0/8' }
        ]
      },
      webhooks: {
        signature_validation: { enabled: true },
        secret: 'very_secure_shared_secret'
      },
      session: { timeout: 1800 },
      logging: {
        level: 'info',
        audit: { enabled: true }
      }
    }
  }
};

const badConfig = {
  type: 'yaml',
  path: '/test/gateway.yaml',
  content: `
gateway:
  bind_address: 0.0.0.0
  port: 18789
  auth: disabled
  tls:
    enabled: false
  webhooks:
    signature_validation:
      enabled: false
  session:
    timeout: 86400
  logging:
    level: error
    audit:
      enabled: false
api_key: sk_live_secret123456789
`,
  config: {
    gateway: {
      bind_address: '0.0.0.0',
      port: 18789,
      auth: 'disabled',
      tls: { enabled: false },
      webhooks: { signature_validation: { enabled: false } },
      session: { timeout: 86400 },
      logging: { level: 'error', audit: { enabled: false } }
    },
    api_key: 'sk_live_secret123456789'
  }
};

// Gateway Exposure Tests
test('gateway-exposure: should pass with localhost binding', async () => {
  const result = await gatewayExposure.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('gateway-exposure: should fail with 0.0.0.0 binding', async () => {
  const result = await gatewayExposure.run(badConfig);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /0\.0\.0\.0/);
});

// Auth Missing Tests
test('auth-missing: should pass with auth enabled', async () => {
  const result = await authMissing.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('auth-missing: should fail with auth disabled', async () => {
  const result = await authMissing.run(badConfig);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /disabled/i);
});

// API Key in Config Tests
test('api-key-in-config: should pass without hardcoded keys', async () => {
  const result = await apiKeyInConfig.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('api-key-in-config: should fail with hardcoded API key', async () => {
  const result = await apiKeyInConfig.run(badConfig);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /hardcoded|credential/i);
});

// TLS Disabled Tests
test('tls-disabled: should pass with TLS enabled', async () => {
  const result = await tlsDisabled.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('tls-disabled: should fail with TLS disabled', async () => {
  const result = await tlsDisabled.run(badConfig);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /TLS|encryption|unencrypted/i);
});

// Default Port Tests
test('default-port: should pass with firewall rules', async () => {
  const result = await defaultPort.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('default-port: should fail with default port and no firewall', async () => {
  const configNoFirewall = JSON.parse(JSON.stringify(badConfig));
  configNoFirewall.config.gateway.firewall = undefined;
  const result = await defaultPort.run(configNoFirewall);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /default|firewall/i);
});

// Webhook Validation Tests
test('webhook-validation: should pass with signature validation enabled', async () => {
  const result = await webhookValidation.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('webhook-validation: should fail with signature validation disabled', async () => {
  const result = await webhookValidation.run(badConfig);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /signature|validation/i);
});

// Session Timeout Tests
test('session-timeout: should pass with reasonable timeout', async () => {
  const result = await sessionTimeout.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('session-timeout: should fail with excessive timeout', async () => {
  const result = await sessionTimeout.run(badConfig);
  assert.strictEqual(result.passed, false);
  assert.match(result.message, /long|timeout/i);
});

// Logging Config Tests
test('logging-config: should pass with proper logging', async () => {
  const result = await loggingConfig.run(goodConfig);
  assert.strictEqual(result.passed, true);
});

test('logging-config: should fail with audit logging disabled', async () => {
  const result = await loggingConfig.run(badConfig);
  assert.strictEqual(result.passed, false);
});

// Check metadata
test('all checks should have required metadata', () => {
  const checks = [
    gatewayExposure,
    authMissing,
    apiKeyInConfig,
    tlsDisabled,
    defaultPort,
    webhookValidation,
    sessionTimeout,
    loggingConfig
  ];

  checks.forEach(check => {
    assert.strictEqual(typeof check.name, 'string');
    assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(check.severity));
    assert.strictEqual(typeof check.description, 'string');
    assert.strictEqual(typeof check.run, 'function');
  });
});

console.log('All tests passed!');
