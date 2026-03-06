import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanConfig } from './scanner.js';
import { generateReport as generateReportFormatter } from './reporter.js';
import { CHECKS } from './checks/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scan a configuration file and run all security checks
 * @param {string} configPath - Path to the configuration file
 * @returns {Promise<Array>} Array of check results
 */
export async function scan(configPath) {
  const config = scanConfig(configPath);

  const results = [];

  for (const checkName of Object.keys(CHECKS)) {
    try {
      const checkModule = CHECKS[checkName];
      const result = await checkModule.run(config);

      results.push({
        id: checkName,
        name: checkModule.name,
        severity: checkModule.severity,
        passed: result.passed,
        message: result.message,
        location: result.location,
        recommendation: result.recommendation
      });
    } catch (error) {
      console.warn(`Warning: Check "${checkName}" failed: ${error.message}`);
    }
  }

  return results.filter(r => !r.passed); // Return only failed checks
}

/**
 * Run a specific security check
 * @param {string} checkName - Name of the check to run
 * @param {string} configPath - Path to the configuration file
 * @returns {Promise<Object>} Check result
 */
export async function runCheck(checkName, configPath) {
  if (!CHECKS[checkName]) {
    throw new Error(`Unknown check: ${checkName}`);
  }

  const config = scanConfig(configPath);
  const checkModule = CHECKS[checkName];

  const result = await checkModule.run(config);

  return {
    id: checkName,
    name: checkModule.name,
    severity: checkModule.severity,
    passed: result.passed,
    message: result.message,
    location: result.location,
    recommendation: result.recommendation
  };
}

/**
 * Generate a formatted report from scan results
 * @param {Array} results - Array of check results from scan()
 * @param {Object} options - Report options (format, etc.)
 * @returns {Object} Report object with text, json, and markdown properties
 */
export function generateReport(results, options = {}) {
  return generateReportFormatter(results, options);
}

/**
 * Get list of available checks
 * @returns {Array} Array of check metadata
 */
export function getAvailableChecks() {
  return Object.entries(CHECKS).map(([id, module]) => ({
    id,
    name: module.name,
    severity: module.severity,
    description: module.description
  }));
}

export default {
  scan,
  runCheck,
  generateReport,
  getAvailableChecks
};
