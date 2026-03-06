import { readFileSync } from 'fs';
import path from 'path';

/**
 * Simple YAML-like parser for configuration files
 * Handles basic key: value pairs and nested structures
 */
function parseYaml(content) {
  const config = {};
  const lines = content.split('\n');
  let currentSection = config;
  const stack = [{ level: 0, obj: config }];

  for (let line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Calculate indentation level
    const match = line.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    const level = Math.floor(indent / 2);

    // Remove indentation and parse
    const content = line.trim();

    // Handle key: value pairs
    if (content.includes(':')) {
      const [key, ...valueParts] = content.split(':');
      const value = valueParts.join(':').trim();

      // Adjust stack level
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      currentSection = stack[stack.length - 1].obj;

      // Parse value types
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (value === 'null' || value === '') parsedValue = null;
      else if (!isNaN(value) && value !== '') parsedValue = Number(value);

      currentSection[key.trim()] = parsedValue;

      // If value is empty, it might be a section
      if (value === '' || value === null) {
        currentSection[key.trim()] = {};
        stack.push({ level, obj: currentSection[key.trim()] });
      }
    } else {
      // Handle list items or section headers
      if (content.startsWith('-')) {
        if (!Array.isArray(currentSection._items)) {
          currentSection._items = [];
        }
        currentSection._items.push(content.substring(1).trim());
      }
    }
  }

  return config;
}

/**
 * Scan and parse OpenClaw configuration file
 * Supports gateway.yaml and other YAML-based configs
 * @param {string} configPath - Path to the configuration file
 * @returns {Object} Parsed configuration object
 */
export function scanConfig(configPath) {
  try {
    const absolutePath = path.resolve(configPath);
    const content = readFileSync(absolutePath, 'utf8');

    // Detect file type
    if (absolutePath.endsWith('.yaml') || absolutePath.endsWith('.yml')) {
      return {
        type: 'yaml',
        path: absolutePath,
        content,
        config: parseYaml(content)
      };
    } else if (absolutePath.endsWith('.json')) {
      return {
        type: 'json',
        path: absolutePath,
        content,
        config: JSON.parse(content)
      };
    } else {
      // Try to auto-detect
      try {
        return {
          type: 'json',
          path: absolutePath,
          content,
          config: JSON.parse(content)
        };
      } catch {
        return {
          type: 'yaml',
          path: absolutePath,
          content,
          config: parseYaml(content)
        };
      }
    }
  } catch (error) {
    throw new Error(`Failed to read configuration file: ${error.message}`);
  }
}

/**
 * Helper function to get a nested value from config
 * @param {Object} config - Configuration object
 * @param {string} path - Dot-notation path (e.g., "gateway.bind_address")
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default
 */
export function getConfigValue(config, path, defaultValue = undefined) {
  if (!config || !path) return defaultValue;

  const keys = path.split('.');
  let current = config.config || config;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Find line number of a key in the configuration content
 * @param {string} content - Raw file content
 * @param {string} key - Key to find
 * @returns {number} Line number (1-indexed), or -1 if not found
 */
export function findLineNumber(content, key) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(key + ':') || lines[i].includes(`"${key}"`)) {
      return i + 1;
    }
  }
  return -1;
}

export default {
  scanConfig,
  getConfigValue,
  findLineNumber
};
