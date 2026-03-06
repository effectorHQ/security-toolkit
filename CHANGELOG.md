# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added

- Initial alpha release of OpenClaw Security Audit Toolkit
- Core scanning functionality for OpenClaw configuration files
- Eight security checks for identifying common misconfigurations:
  - `gateway-exposure`: Detect public gateway binding (CRITICAL)
  - `auth-missing`: Verify authentication configuration (CRITICAL)
  - `api-key-in-config`: Detect hardcoded credentials (HIGH)
  - `tls-disabled`: Check for encryption configuration (HIGH)
  - `default-port`: Warn about unprotected default ports (HIGH)
  - `webhook-validation`: Validate signature verification (MEDIUM)
  - `session-timeout`: Check session timeout settings (MEDIUM)
  - `logging-config`: Verify audit logging (LOW)
- CLI with three subcommands:
  - `scan`: Run complete security audit
  - `check`: Execute individual checks
  - `report`: Generate detailed reports in multiple formats
- Multiple output formats: text (colored), JSON, and markdown
- Configuration file support (`.openclaw-audit.json`)
- Comprehensive hardening guide for DevOps teams
- Bilingual documentation (English and Chinese)
- MIT License
- Automated testing with Node.js built-in test runner

### Security

- Read-only analysis with no modification of configuration files
- No credential transmission or storage
- Open-source implementation for community review

## Unreleased

### Planned for Future Releases

- Plugin system for custom security checks
- Integration with CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
- Real-time monitoring mode
- Configuration auto-remediation suggestions
- Web dashboard for visualization
- Multi-configuration scanning
- Performance metrics and benchmarking
- Advanced RBAC validation checks
