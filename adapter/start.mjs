#!/usr/bin/env node
// Wrapper to start the Brain Engine API server via tsx
// Usage: node adapter/start.mjs [port]

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.argv[2] || '3458';

const server = spawn('npx', ['--yes', 'tsx', join(__dirname, 'openai-server.mjs'), port], {
  stdio: 'inherit',
  shell: true,
});

server.on('close', (code) => {
  process.exit(code || 0);
});
