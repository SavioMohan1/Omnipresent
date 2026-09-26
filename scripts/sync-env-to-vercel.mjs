import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const content = fs.readFileSync(envPath, 'utf8');

const lines = content.split('\n');
const envVars = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    envVars[key] = val;
  }
}

console.log('Found env vars to sync:', Object.keys(envVars));

for (const [key, val] of Object.entries(envVars)) {
  console.log(`Setting ${key} on Vercel production...`);
  try {
    const cmd = `npx vercel env add ${key} production --value "${val}" --yes --force`;
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    console.log(`✓ ${key}: OK`);
  } catch (err) {
    console.error(`✗ Error adding ${key}:`, err.message);
  }
}

console.log('Environment sync completed!');
