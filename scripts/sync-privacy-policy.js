#!/usr/bin/env node

/**
 * Script to sync privacy policy from docs to frontend assets
 * Removes frontmatter and updates dates to today
 */

const fs = require('fs');
const path = require('path');

const DOCS_PRIVACY_POLICY = path.join(__dirname, '../../docs/docs/privacy-policy.md');
const FRONTEND_PRIVACY_POLICY = path.join(__dirname, '../assets/legal/privacy-policy.js');

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function syncPrivacyPolicy() {
  try {
    // Read the markdown file from docs
    const markdownContent = fs.readFileSync(DOCS_PRIVACY_POLICY, 'utf-8');
    
    // Remove frontmatter (lines between ---)
    let content = markdownContent;
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    content = content.replace(frontmatterRegex, '');
    
    // Remove leading/trailing whitespace
    content = content.trim();
    
    // Get today's date
    const today = new Date();
    const todayFormatted = formatDate(today);
    
    // Replace [DATE] placeholders with today's date
    content = content.replace(/\[DATE\]/g, todayFormatted);
    
    // Wrap in JS export format
    const jsContent = `export default \`${content}\`;`;
    
    // Write to frontend assets
    fs.writeFileSync(FRONTEND_PRIVACY_POLICY, jsContent, 'utf-8');
    
    console.log('✅ Privacy policy synced successfully!');
    console.log(`   Source: ${DOCS_PRIVACY_POLICY}`);
    console.log(`   Target: ${FRONTEND_PRIVACY_POLICY}`);
    console.log(`   Date set to: ${todayFormatted}`);
  } catch (error) {
    console.error('❌ Error syncing privacy policy:', error.message);
    process.exit(1);
  }
}

syncPrivacyPolicy();
