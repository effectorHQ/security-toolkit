/**
 * Format scan results into human-readable reports
 */

/**
 * Generate a formatted report from scan results
 * @param {Array} results - Array of check results
 * @param {Object} options - Report options
 * @returns {Object} Report object with text, json, and markdown properties
 */
export function generateReport(results, options = {}) {
  const timestamp = new Date().toISOString();
  const bySeverity = categorizeResults(results);

  return {
    text: formatAsText(results, bySeverity, timestamp),
    json: formatAsJson(results, bySeverity, timestamp),
    markdown: formatAsMarkdown(results, bySeverity, timestamp)
  };
}

function categorizeResults(results) {
  const categorized = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };

  results.forEach(result => {
    if (categorized[result.severity]) {
      categorized[result.severity].push(result);
    }
  });

  return categorized;
}

function formatAsText(results, bySeverity, timestamp) {
  let output = '';
  output += 'OpenClaw Security Audit Report\n';
  output += '===============================\n\n';
  output += `Generated: ${timestamp}\n\n`;

  if (results.length === 0) {
    output += 'Status: PASSED - No security issues found!\n';
    return output;
  }

  // CRITICAL issues
  if (bySeverity.CRITICAL.length > 0) {
    output += `CRITICAL Issues (${bySeverity.CRITICAL.length})\n`;
    output += '-------------------\n';
    bySeverity.CRITICAL.forEach(result => {
      output += formatIssue(result, '✗', '\x1b[31m', '\x1b[0m');
    });
  }

  // HIGH issues
  if (bySeverity.HIGH.length > 0) {
    output += `HIGH Issues (${bySeverity.HIGH.length})\n`;
    output += '-------------------\n';
    bySeverity.HIGH.forEach(result => {
      output += formatIssue(result, '⚠', '\x1b[33m', '\x1b[0m');
    });
  }

  // MEDIUM issues
  if (bySeverity.MEDIUM.length > 0) {
    output += `MEDIUM Issues (${bySeverity.MEDIUM.length})\n`;
    output += '-------------------\n';
    bySeverity.MEDIUM.forEach(result => {
      output += formatIssue(result, 'ℹ', '\x1b[36m', '\x1b[0m');
    });
  }

  // LOW issues
  if (bySeverity.LOW.length > 0) {
    output += `LOW Issues (${bySeverity.LOW.length})\n`;
    output += '-------------------\n';
    bySeverity.LOW.forEach(result => {
      output += formatIssue(result, '○', '\x1b[34m', '\x1b[0m');
    });
  }

  // Summary
  output += '\nSummary\n';
  output += '-------\n';
  output += `Total Issues: ${results.length}\n`;
  output += `  Critical: ${bySeverity.CRITICAL.length} | `;
  output += `High: ${bySeverity.HIGH.length} | `;
  output += `Medium: ${bySeverity.MEDIUM.length} | `;
  output += `Low: ${bySeverity.LOW.length}\n`;

  if (bySeverity.CRITICAL.length > 0) {
    output += 'Status: FAILED - Critical issues must be addressed immediately\n';
  } else if (bySeverity.HIGH.length > 0) {
    output += 'Status: FAILED - High-priority issues should be addressed\n';
  } else {
    output += 'Status: PASSED - No critical or high-severity issues found\n';
  }

  return output;
}

function formatIssue(result, symbol, colorStart, colorEnd) {
  let output = `${symbol} ${result.name} (${result.id})\n`;
  output += `  ${result.message}\n`;
  if (result.location) {
    output += `  Location: ${result.location}\n`;
  }
  if (result.recommendation) {
    output += `  Recommendation: ${result.recommendation}\n`;
  }
  output += '\n';
  return output;
}

function formatAsJson(results, bySeverity, timestamp) {
  return {
    timestamp,
    summary: {
      total: results.length,
      critical: bySeverity.CRITICAL.length,
      high: bySeverity.HIGH.length,
      medium: bySeverity.MEDIUM.length,
      low: bySeverity.LOW.length,
      status: bySeverity.CRITICAL.length > 0 ? 'FAILED' : 'PASSED'
    },
    issues: results.map(result => ({
      id: result.id,
      name: result.name,
      severity: result.severity,
      message: result.message,
      location: result.location || null,
      recommendation: result.recommendation || null
    }))
  };
}

function formatAsMarkdown(results, bySeverity, timestamp) {
  let output = '';
  output += '# OpenClaw Security Audit Report\n\n';
  output += `**Generated**: ${timestamp}\n\n`;

  if (results.length === 0) {
    output += '## Status\n\n';
    output += '✅ **PASSED** - No security issues found!\n\n';
    return output;
  }

  // Summary table
  output += '## Summary\n\n';
  output += '| Severity | Count |\n';
  output += '|----------|-------|\n';
  output += `| CRITICAL | ${bySeverity.CRITICAL.length} |\n`;
  output += `| HIGH | ${bySeverity.HIGH.length} |\n`;
  output += `| MEDIUM | ${bySeverity.MEDIUM.length} |\n`;
  output += `| LOW | ${bySeverity.LOW.length} |\n`;
  output += `| **Total** | **${results.length}** |\n\n`;

  const status = bySeverity.CRITICAL.length > 0 ? '❌ FAILED' : '✅ PASSED';
  output += `**Status**: ${status}\n\n`;

  // CRITICAL issues
  if (bySeverity.CRITICAL.length > 0) {
    output += '## ❌ CRITICAL Issues\n\n';
    bySeverity.CRITICAL.forEach(result => {
      output += formatMarkdownIssue(result);
    });
  }

  // HIGH issues
  if (bySeverity.HIGH.length > 0) {
    output += '## ⚠️ HIGH Issues\n\n';
    bySeverity.HIGH.forEach(result => {
      output += formatMarkdownIssue(result);
    });
  }

  // MEDIUM issues
  if (bySeverity.MEDIUM.length > 0) {
    output += '## ℹ️ MEDIUM Issues\n\n';
    bySeverity.MEDIUM.forEach(result => {
      output += formatMarkdownIssue(result);
    });
  }

  // LOW issues
  if (bySeverity.LOW.length > 0) {
    output += '## 💡 LOW Issues\n\n';
    bySeverity.LOW.forEach(result => {
      output += formatMarkdownIssue(result);
    });
  }

  return output;
}

function formatMarkdownIssue(result) {
  let output = `### ${result.name} (${result.id})\n\n`;
  output += `**Message**: ${result.message}\n\n`;
  if (result.location) {
    output += `**Location**: \`${result.location}\`\n\n`;
  }
  if (result.recommendation) {
    output += `**Recommendation**: ${result.recommendation}\n\n`;
  }
  return output;
}

export default {
  generateReport
};
