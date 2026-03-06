#!/usr/bin/env node

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scan, runCheck, generateReport } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const args = process.argv.slice(2);
const command = args[0];
const configPath = args[1] || './gateway.yaml';
const options = parseOptions(args.slice(2));

async function main() {
  try {
    switch (command) {
      case 'scan':
        await handleScan(configPath);
        break;

      case 'check':
        await handleCheck(args[1], configPath);
        break;

      case 'report':
        await handleReport(configPath, options);
        break;

      case '--version':
      case '-v':
        console.log(`@openclawHQ/security-audit v${packageJson.version}`);
        process.exit(0);
        break;

      case '--help':
      case '-h':
      case undefined:
        showHelp();
        process.exit(0);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(2);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(2);
  }
}

async function handleScan(configPath) {
  console.log(`Scanning configuration: ${configPath}\n`);
  const results = await scan(configPath);

  // Display results
  displayScanResults(results);

  // Determine exit code based on severity
  const hasCritical = results.some(r => r.severity === 'CRITICAL');
  const hasHigh = results.some(r => r.severity === 'HIGH');

  process.exit(hasCritical || hasHigh ? 1 : 0);
}

async function handleCheck(checkName, configPath) {
  if (!checkName) {
    console.error('Error: Check name is required');
    console.error('Usage: openclaw-audit check <check-name> <config-path>');
    process.exit(2);
  }

  console.log(`Running check: ${checkName}\n`);

  try {
    const result = await runCheck(checkName, configPath);
    displayCheckResult(result);
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(`Check failed: ${error.message}`);
    process.exit(2);
  }
}

async function handleReport(configPath, options) {
  console.log(`Generating report for: ${configPath}\n`);
  const results = await scan(configPath);
  const report = generateReport(results, options);

  const format = options.format || 'text';

  switch (format) {
    case 'json':
      console.log(JSON.stringify(report, null, 2));
      break;
    case 'markdown':
      console.log(report.markdown);
      break;
    case 'text':
    default:
      console.log(report.text);
  }

  const hasCritical = results.some(r => r.severity === 'CRITICAL');
  process.exit(hasCritical ? 1 : 0);
}

function displayScanResults(results) {
  if (results.length === 0) {
    console.log('\x1b[32m✓ No security issues found!\x1b[0m\n');
    return;
  }

  const bySeverity = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };

  results.forEach(result => {
    bySeverity[result.severity].push(result);
  });

  if (bySeverity.CRITICAL.length > 0) {
    console.log(`\x1b[31mCRITICAL Issues (${bySeverity.CRITICAL.length})\x1b[0m`);
    bySeverity.CRITICAL.forEach(r => {
      console.log(`✗ ${r.name} (${r.id})`);
      console.log(`  ${r.message}`);
      if (r.location) console.log(`  Location: ${r.location}`);
      if (r.recommendation) console.log(`  Recommendation: ${r.recommendation}`);
      console.log();
    });
  }

  if (bySeverity.HIGH.length > 0) {
    console.log(`\x1b[33mHIGH Issues (${bySeverity.HIGH.length})\x1b[0m`);
    bySeverity.HIGH.forEach(r => {
      console.log(`⚠ ${r.name} (${r.id})`);
      console.log(`  ${r.message}`);
      if (r.location) console.log(`  Location: ${r.location}`);
      if (r.recommendation) console.log(`  Recommendation: ${r.recommendation}`);
      console.log();
    });
  }

  if (bySeverity.MEDIUM.length > 0) {
    console.log(`\x1b[36mMEDIUM Issues (${bySeverity.MEDIUM.length})\x1b[0m`);
    bySeverity.MEDIUM.forEach(r => {
      console.log(`ℹ ${r.name} (${r.id})`);
      console.log(`  ${r.message}`);
      if (r.location) console.log(`  Location: ${r.location}`);
      if (r.recommendation) console.log(`  Recommendation: ${r.recommendation}`);
      console.log();
    });
  }

  if (bySeverity.LOW.length > 0) {
    console.log(`\x1b[34mLOW Issues (${bySeverity.LOW.length})\x1b[0m`);
    bySeverity.LOW.forEach(r => {
      console.log(`○ ${r.name} (${r.id})`);
      console.log(`  ${r.message}`);
      if (r.location) console.log(`  Location: ${r.location}`);
      if (r.recommendation) console.log(`  Recommendation: ${r.recommendation}`);
      console.log();
    });
  }

  const total = results.length;
  console.log('Summary');
  console.log(`Total Issues: ${total}`);
  console.log(
    `  Critical: ${bySeverity.CRITICAL.length} | High: ${bySeverity.HIGH.length} | Medium: ${bySeverity.MEDIUM.length} | Low: ${bySeverity.LOW.length}`
  );
}

function displayCheckResult(result) {
  if (result.passed) {
    console.log(`\x1b[32m✓ Check passed: ${result.name}\x1b[0m`);
  } else {
    console.log(`\x1b[31m✗ Check failed: ${result.name}\x1b[0m`);
    console.log(`Severity: ${result.severity}`);
    console.log(`Message: ${result.message}`);
    if (result.recommendation) {
      console.log(`Recommendation: ${result.recommendation}`);
    }
  }
}

function parseOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      options.format = args[i + 1];
      i++;
    } else if (args[i] === '--severity' && args[i + 1]) {
      options.severity = args[i + 1];
      i++;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
OpenClaw Security Audit Toolkit v${packageJson.version}

Usage: openclaw-audit [command] [options]

Commands:
  scan <config-path>           Run a complete security audit
  check <check-name> <config>  Execute a specific security check
  report <config-path>         Generate a security report
  --version, -v                Show version
  --help, -h                   Show this help message

Options:
  --format <format>            Output format: text, json, markdown (default: text)
  --severity <level>           Filter by severity: CRITICAL, HIGH, MEDIUM, LOW

Examples:
  openclaw-audit scan /etc/openclaw/gateway.yaml
  openclaw-audit check auth-missing /etc/openclaw/gateway.yaml
  openclaw-audit report /etc/openclaw/gateway.yaml --format json

Available Checks:
  - gateway-exposure      (CRITICAL) - Gateway listening on 0.0.0.0
  - auth-missing          (CRITICAL) - Authentication not configured
  - api-key-in-config     (HIGH)     - Hardcoded API keys
  - tls-disabled          (HIGH)     - TLS/SSL not enabled
  - default-port          (HIGH)     - Default port without firewall
  - webhook-validation    (MEDIUM)   - Webhook signature validation
  - session-timeout       (MEDIUM)   - Session timeout configuration
  - logging-config        (LOW)      - Audit logging enabled

Documentation: https://github.com/OpenClawHQ/security-toolkit
Report Issues: https://github.com/OpenClawHQ/security-toolkit/issues
  `);
}

main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(2);
});
