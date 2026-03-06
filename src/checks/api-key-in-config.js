import { findLineNumber } from '../scanner.js';

export const name = 'API Key in Config';
export const severity = 'HIGH';
export const description =
  'Detects hardcoded API keys in configuration files instead of using environment variables';

/**
 * Check if API keys are hardcoded in configuration
 * API keys should always be stored in environment variables, not config files
 */
export async function run(configData) {
  const content = configData.content;
  const config = configData.config;

  // Patterns to detect API keys
  const apiKeyPatterns = [
    /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{20,}['"]?/gi,
    /sk[_-]?live[_-][a-zA-Z0-9_\-]{20,}/gi,
    /sk[_-]?test[_-][a-zA-Z0-9_\-]{20,}/gi,
    /secret[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{20,}['"]?/gi,
    /token\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{40,}['"]?/gi,
    /password\s*[:=]\s*['"]?[^\s'"]+['"]?/gi
  ];

  const issues = [];

  for (const pattern of apiKeyPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      // Skip common default/example values
      if (
        match[0].includes('YOUR_API_KEY') ||
        match[0].includes('example') ||
        match[0].includes('CHANGEME')
      ) {
        continue;
      }

      const lineNum = content.substring(0, match.index).split('\n').length;

      issues.push({
        match: match[0],
        lineNum: lineNum,
        location: `gateway.yaml:${lineNum} - ${match[0].substring(0, 50)}...`
      });
    }
  }

  if (issues.length > 0) {
    const firstIssue = issues[0];
    return {
      passed: false,
      message: `Found ${issues.length} hardcoded credential(s) in configuration file. Credentials should be stored in environment variables.`,
      location: firstIssue.location,
      recommendation:
        'Move all API keys, passwords, and secrets to environment variables. Use process.env.VARIABLE_NAME or equivalent in your runtime. Example: export OPENCLAW_API_KEY=sk_live_xxxxx'
    };
  }

  return {
    passed: true,
    message: 'No hardcoded API keys or credentials detected in configuration',
    location: null,
    recommendation: null
  };
}

export default { name, severity, description, run };
