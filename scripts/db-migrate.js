#!/usr/bin/env node
// npm's `run` shells out via cmd.exe on Windows regardless of the invoking
// terminal (PowerShell, Git Bash, etc.), so bash-style `$VAR` in package.json
// scripts silently fails to expand there. Node's process.env is shell-agnostic,
// so read the URL here instead of relying on the invoking shell to interpolate it.
const { execFileSync } = require('child_process');

const envVarName = process.argv[2];
if (!envVarName) {
  console.error('Usage: node scripts/db-migrate.js <ENV_VAR_NAME>');
  process.exit(1);
}

const dbUrl = process.env[envVarName];
if (!dbUrl) {
  console.error(`${envVarName} is not set. Set it in your shell before running this script.`);
  process.exit(1);
}

execFileSync('npx', ['supabase', 'db', 'push', '--db-url', dbUrl], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
