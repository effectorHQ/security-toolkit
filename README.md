# Security Audit Toolkit

[![npm version](https://img.shields.io/npm/v/@effectorhq/security-audit.svg?style=flat-square)](https://www.npmjs.com/package/@effectorhq/security-audit)
[![CI Status](https://img.shields.io/github/actions/workflow/status/effectorHQ/security-toolkit/ci.yml?style=flat-square)](https://github.com/effectorHQ/security-toolkit/actions)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square)](https://nodejs.org/)
[![Apache License 2.0](https://img.shields.io/badge/License-Apache-2.0-blue.svg?style=flat-square)](LICENSE)

[中文文档](./README.zh.md)

## The Problem

OpenClaw has over **135,000 exposed instances** running on the public internet. The majority of these instances operate with default or insecure configurations, creating a critical security vulnerability across the entire ecosystem. Common misconfigurations include:

- Gateway services listening on `0.0.0.0` instead of `127.0.0.1`
- Authentication completely disabled or using default credentials
- API keys hardcoded in configuration files
- TLS/SSL encryption not configured
- Webhook endpoints lacking signature validation
- Insufficient audit logging and monitoring

## What This Tool Does

The OpenClaw Security Audit Toolkit is a comprehensive CLI scanner that automatically detects and reports common security misconfigurations in OpenClaw instances. It analyzes:

- **Gateway Configuration**: Validates network binding, port exposure, and protocol settings
- **Authentication**: Verifies authentication mechanisms are properly configured
- **API Key Management**: Detects hardcoded credentials and enforces environment variable usage
- **TLS/SSL**: Ensures encryption is enabled for all communication channels
- **Webhook Security**: Validates signature verification for webhook endpoints
- **Session Management**: Checks timeout configurations
- **Audit Logging**: Ensures comprehensive logging is enabled

Results are classified by severity level (CRITICAL, HIGH, MEDIUM, LOW) to help you prioritize remediation efforts.

## Quick Start

### Installation

```bash
npm install -g @effectorhq/security-audit
```

Or use with npx (no installation required):

```bash
npx @effectorhq/security-audit scan
```

### Basic Scan

Run a complete security audit on your OpenClaw configuration:

```bash
openclaw-audit scan /path/to/gateway.yaml
```

### Generate a Report

Create a detailed security report in multiple formats:

```bash
# Terminal output (colored)
openclaw-audit report /path/to/gateway.yaml --format text

# JSON output for programmatic processing
openclaw-audit report /path/to/gateway.yaml --format json

# Markdown output for documentation
openclaw-audit report /path/to/gateway.yaml --format markdown
```

### Run Specific Checks

Execute individual security checks:

```bash
openclaw-audit check gateway-exposure /path/to/gateway.yaml
openclaw-audit check auth-missing /path/to/gateway.yaml
openclaw-audit check api-key-in-config /path/to/gateway.yaml
```

## Example Output

```
OpenClaw Security Audit Scan Results
=====================================

Configuration: /etc/openclaw/gateway.yaml
Scan Time: 2026-03-05T10:30:00Z

CRITICAL Issues (2)
-------------------
✗ Gateway Exposure (gateway-exposure)
  The gateway is listening on 0.0.0.0. This exposes the service to all network interfaces.
  Location: gateway.yaml:12 - bind_address: 0.0.0.0
  Recommendation: Change to 127.0.0.1 or a specific internal IP address

✗ Authentication Missing (auth-missing)
  No authentication mechanism is configured. All requests are processed without verification.
  Location: gateway.yaml:45 - auth: disabled
  Recommendation: Enable authentication and configure user credentials

HIGH Issues (3)
---------------
⚠ API Key in Config (api-key-in-config)
  API keys are hardcoded in the configuration file. Credentials should use environment variables.
  Location: gateway.yaml:78 - api_key: sk_live_aBc...
  Recommendation: Move to environment variable: export OPENCLAW_API_KEY=...

⚠ TLS Disabled (tls-disabled)
  TLS/SSL encryption is not configured for the gateway. All traffic is unencrypted.
  Location: gateway.yaml:52
  Recommendation: Enable TLS with valid certificates

⚠ Default Port (default-port)
  Gateway is using the default port 18789 without firewall protection.
  Location: gateway.yaml:8 - port: 18789
  Recommendation: Configure firewall rules or move to non-standard port

MEDIUM Issues (1)
-----------------
ℹ Webhook Validation (webhook-validation)
  Webhook endpoints are not validating request signatures.
  Location: gateway.yaml:95
  Recommendation: Enable webhook signature validation

Summary
-------
Total Issues: 6
  Critical: 2 | High: 3 | Medium: 1 | Low: 0
Status: FAILED - Critical issues must be addressed

Fix Priority:
1. Enable authentication
2. Change gateway binding address
3. Remove hardcoded API keys
4. Enable TLS encryption
5. Configure firewall rules
```

## Available Checks

| Check Name | Severity | Description |
|-----------|----------|-------------|
| `gateway-exposure` | CRITICAL | Detects if gateway listens on 0.0.0.0 |
| `auth-missing` | CRITICAL | Verifies authentication is configured |
| `api-key-in-config` | HIGH | Detects hardcoded API keys in configuration |
| `tls-disabled` | HIGH | Checks if TLS/SSL encryption is enabled |
| `default-port` | HIGH | Warns about default port 18789 without firewall |
| `webhook-validation` | MEDIUM | Validates webhook signature verification |
| `session-timeout` | MEDIUM | Checks session timeout configuration |
| `logging-config` | LOW | Verifies audit logging is enabled |

## Configuration

Create a `.openclaw-audit.json` file in your project root to customize scan behavior:

```json
{
  "configPath": "/etc/openclaw/gateway.yaml",
  "severity": "HIGH",
  "checks": ["gateway-exposure", "auth-missing", "api-key-in-config"],
  "excludeChecks": ["logging-config"],
  "strict": true
}
```

## Exit Codes

- `0`: Scan completed successfully, no critical issues
- `1`: Scan completed, critical or high-severity issues found
- `2`: Scan failed due to configuration error
- `3`: File not found or unreadable

## Security Considerations

This tool performs **read-only** analysis of your configuration files. It does not:
- Modify configuration files
- Make network connections to your OpenClaw instance
- Store or transmit your configuration data
- Require authentication credentials

Always review the tool's source code and run it in secure environments with restricted access to configuration files.

## Contributing

We welcome security researchers and community contributions. If you discover additional misconfigurations or hardening strategies, please open an issue or submit a pull request on [GitHub](https://github.com/effectorHQ/security-toolkit).

**Security Note**: For security vulnerabilities in OpenClaw itself (not this tool), please report directly to the OpenClaw security team rather than opening public issues.

## License


This project is currently licensed under the Apache 2.0 License 。

Apache License 2.0 - Copyright 2026 effectorHQ Contributors

## Resources

- [OpenClaw Hardening Guide](./docs/hardening-guide.md)
- [OpenClaw Documentation](https://github.com/effectorHQ)
- [OWASP Configuration Security Checklist](https://owasp.org)
