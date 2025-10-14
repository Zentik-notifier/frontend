#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to generate TypeScript types from the en-EN.json translation file
 * Usage: node scripts/generate-i18n-types.js
 */

const LOCALE_FILE = path.join(__dirname, '../locales/en-EN.json');
const OUTPUT_FILE = path.join(__dirname, '../types/translations.generated.ts');

/**
 * Check if a key needs to be quoted (starts with number or contains special chars)
 */
function needsQuotes(key) {
  return /^[0-9]/.test(key) || /[^a-zA-Z0-9_$]/.test(key);
}

/**
 * Format a key for TypeScript interface
 */
function formatKey(key) {
  return needsQuotes(key) ? `"${key}"` : key;
}

/**
 * Convert a JSON object to TypeScript interface structure
 */
function jsonToTypeScript(obj, indent = 2) {
  const spaces = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    const formattedKey = formatKey(key);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${spaces}${formattedKey}: {\n`;
      result += jsonToTypeScript(value, indent + 2);
      result += `${spaces}};\n`;
    } else {
      result += `${spaces}${formattedKey}: string;\n`;
    }
  }

  return result;
}

/**
 * Generate path types for nested keys
 */
function generatePathTypes(obj, prefix = '') {
  let paths = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      paths.push(...generatePathTypes(value, currentPath));
    } else {
      paths.push(currentPath);
    }
  }

  return paths;
}

/**
 * Get value type for a specific path
 */
function getValueType(obj, path) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    current = current[key];
    if (current === undefined) return 'never';
  }

  if (typeof current === 'object' && current !== null) {
    return 'TranslationKey[' + path.split('.').map(k => `"${k}"`).join('][') + ']';
  }

  return 'string';
}

/**
 * Main function
 */
function generateTypes() {
  console.log('🔄 Reading translation file...');
  
  // Read the en-EN.json file
  const translationData = JSON.parse(fs.readFileSync(LOCALE_FILE, 'utf-8'));

  console.log('✨ Generating TypeScript types...');

  // Generate the interface
  let output = `// This file is auto-generated. Do not edit manually.\n`;
  output += `// Run 'npm run generate:i18n-types' to regenerate.\n\n`;

  // Generate main Translation interface
  output += `export interface Translation {\n`;
  output += jsonToTypeScript(translationData);
  output += `}\n\n`;

  // Generate union type for all possible paths
  const paths = generatePathTypes(translationData);

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  console.log(`✅ Types generated successfully at: ${OUTPUT_FILE}`);
  console.log(`📊 Generated ${paths.length} translation keys`);
}

// Run the script
try {
  generateTypes();
} catch (error) {
  console.error('❌ Error generating types:', error.message);
  process.exit(1);
}
