const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(FRONTEND_ROOT, 'locales');
const EN_FILE = path.join(LOCALES_DIR, 'en-EN.json');
const IT_FILE = path.join(LOCALES_DIR, 'it-IT.json');
const TYPES_FILE = path.join(FRONTEND_ROOT, 'types', 'i18n.ts');

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, data) { fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8'); }

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full)); else files.push(full);
  }
  return files;
}

function collectUsage(rootDir) {
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
  const excludedDirFragments = [
    `${path.sep}locales${path.sep}`,
    `${path.sep}generated${path.sep}`,
    `${path.sep}config${path.sep}`,
    `${path.sep}constants${path.sep}`,
    `${path.sep}scripts${path.sep}`,
    `${path.sep}plugins${path.sep}`,
    `${path.sep}ios${path.sep}`,
    `${path.sep}android${path.sep}`
  ];
  const files = walkDir(rootDir).filter((f) => {
    if (!exts.has(path.extname(f))) return false;
    for (const frag of excludedDirFragments) if (f.includes(frag)) return false;
    return true;
  });
  const exact = new Set();
  const prefixes = new Set();
  const isAllNumericKey = (k) => k.split('.').every((seg) => /^\d+$/.test(seg));
  const isLikelyConfigString = (s) => /\//.test(s) || /^https?:/i.test(s) || /^(com|org|net|io|dev)\./i.test(s);
  const literalCall = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
  const literalCallI18n = /\bi18n\.t\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
  const templatePrefix = /\bt\(\s*`([a-zA-Z0-9_.-]+)\$\{/g;
  const templatePrefixI18n = /\bi18n\.t\(\s*`([a-zA-Z0-9_.-]+)\$\{/g;
  const concatPrefix = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*\+/g;
  const concatPrefixI18n = /\bi18n\.t\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*\+/g;
  const rawDottedString = /(['"])(([A-Za-z0-9_-]+\.)+[A-Za-z0-9_-]+)\1/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = literalCall.exec(content)) !== null) if (!isAllNumericKey(m[1]) && !isLikelyConfigString(m[1])) exact.add(m[1]);
    while ((m = literalCallI18n.exec(content)) !== null) if (!isAllNumericKey(m[1]) && !isLikelyConfigString(m[1])) exact.add(m[1]);
    while ((m = templatePrefix.exec(content)) !== null) prefixes.add(m[1]);
    while ((m = templatePrefixI18n.exec(content)) !== null) prefixes.add(m[1]);
    while ((m = concatPrefix.exec(content)) !== null) prefixes.add(m[1]);
    while ((m = concatPrefixI18n.exec(content)) !== null) prefixes.add(m[1]);
    while ((m = rawDottedString.exec(content)) !== null) if (!isAllNumericKey(m[2]) && !isLikelyConfigString(m[2])) exact.add(m[2]);
  }
  return { exact, prefixes };
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) keys.push(...flattenKeys(v, p)); else keys.push(p);
  }
  return keys;
}

function pruneByUsage(obj, usage, prefix = '') {
  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) {
      const pruned = pruneByUsage(v, usage, p);
      if (Object.keys(pruned).length > 0) result[k] = pruned;
    } else {
      if (usage.exact.has(p)) { result[k] = v; continue; }
      let keepByPrefix = false;
      for (const pref of usage.prefixes) { if (p.startsWith(pref)) { keepByPrefix = true; break; } }
      if (keepByPrefix) result[k] = v;
    }
  }
  return result;
}

function buildTreeFromKeys(keys) {
  const root = {};
  for (const key of keys) {
    const parts = key.split('.');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      if (isLeaf) node[part] = 'string'; else { node[part] = node[part] || {}; node = node[part]; }
    }
  }
  return root;
}

function formatPropName(name) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `"${name}"`; }

function renderInterface(name, tree, indent = '') {
  const lines = [];
  lines.push(`${indent}export interface ${name} {`);
  const keys = Object.keys(tree).sort();
  for (const k of keys) {
    const v = tree[k];
    if (typeof v === 'string') lines.push(`${indent}  ${formatPropName(k)}: ${v};`);
    else {
      lines.push(`${indent}  ${formatPropName(k)}: {`);
      const sub = renderInterface('X', v, indent + '  ').slice(1, -1);
      lines.push(...sub.map((l) => l.replace(/^\s{2}/, '')));
      lines.push(`${indent}  };`);
    }
  }
  lines.push(`${indent}}`);
  return lines;
}

function updateTranslationKeyInterface(typesFilePath, usedKeys) {
  const src = fs.readFileSync(typesFilePath, 'utf8');
  const startIdx = src.indexOf('export interface TranslationKey');
  if (startIdx === -1) return false;
  let i = startIdx; let depth = 0; let inHeader = true; let endIdx = -1;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') { depth++; inHeader = false; }
    else if (ch === '}') { depth--; if (!inHeader && depth === 0) { endIdx = i; break; } }
  }
  if (endIdx === -1) return false;
  const tree = buildTreeFromKeys(usedKeys);
  const iface = renderInterface('TranslationKey', tree).join('\n');
  const before = src.slice(0, startIdx);
  const after = src.slice(endIdx + 1);
  fs.writeFileSync(typesFilePath, `${before}${iface}\n${after}`, 'utf8');
  return true;
}

function main() {
  const usage = collectUsage(FRONTEND_ROOT);
  const en = readJson(EN_FILE);
  const it = readJson(IT_FILE);

  // Potatura: mantieni solo chiavi usate/prefisso. NON aggiungere nulla.
  const enPruned = pruneByUsage(en, usage);
  const itPruned = pruneByUsage(it, usage);

  if (!fs.existsSync(EN_FILE + '.backup')) fs.copyFileSync(EN_FILE, EN_FILE + '.backup');
  if (!fs.existsSync(IT_FILE + '.backup')) fs.copyFileSync(IT_FILE, IT_FILE + '.backup');
  writeJson(EN_FILE, enPruned);
  writeJson(IT_FILE, itPruned);

  const enKeys = flattenKeys(enPruned);
  updateTranslationKeyInterface(TYPES_FILE, enKeys);

  console.log(JSON.stringify({ counts: { usedExact: usage.exact.size, usedPrefixes: usage.prefixes.size, enAfter: enKeys.length } }, null, 2));
}

main();


