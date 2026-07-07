import { spawn } from 'child_process';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findFreePort(startPort) {
  let port = startPort;
  while (true) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
    port += 1;
  }
}

const services = [
  { name: 'engine', cmd: 'bun', args: ['--watch', 'src/index.ts'], cwd: path.resolve(__dirname, '..', 'engine') },
  { name: 'backend', cmd: 'bun', args: ['--watch', 'src/index.ts'], cwd: path.resolve(__dirname, '..', 'backend') },
  { name: 'frontend', cmd: 'bun', args: ['run', 'dev'], cwd: path.resolve(__dirname, '..', 'frontend') },
];

const children = [];

// Load .env files (simple parser) so child processes inherit local env values
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    // ignore
  }
}

// load common .env files
loadEnvFile(path.resolve(__dirname, '..', 'backend', '.env'));
loadEnvFile(path.resolve(__dirname, '..', 'engine', '.env'));
loadEnvFile(path.resolve(__dirname, '..', 'frontend', '.env'));

const requestedPort = Number(process.env.PORT ?? 3000);
const backendPort = await findFreePort(requestedPort);
process.env.PORT = String(backendPort);
process.env.VITE_API_URL = `http://localhost:${backendPort}`;

function spawnService(svc) {
  console.log(`[runner] starting ${svc.name} (cwd=${svc.cwd})`);
  const child = spawn(svc.cmd, svc.args, { cwd: svc.cwd, shell: true, env: process.env });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${svc.name}] ${data}`);
  });
  child.stderr.on('data', (data) => {
    process.stderr.write(`[${svc.name}] ${data}`);
  });

  child.on('exit', (code, signal) => {
    console.log(`[runner] ${svc.name} exited code=${code} signal=${signal}`);
  });

  children.push(child);
}

for (const svc of services) spawnService(svc);

function shutdown() {
  console.log('[runner] shutting down children...');
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch (e) {}
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// keep the process alive
process.stdin.resume();
