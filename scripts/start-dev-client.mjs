import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';

function lanIPv4() {
  const nets = os.networkInterfaces();
  const preferred = [];
  const fallback = [];
  for (const [name, entries] of Object.entries(nets)) {
    if (!entries) continue;
    const isWifi = /wi-?fi|wlan|wireless/i.test(name);
    for (const e of entries) {
      if (e.internal || (e.family !== 'IPv4' && e.family !== 4)) continue;
      if (e.address.startsWith('192.168.') || e.address.startsWith('10.')) {
        (isWifi ? preferred : fallback).push(e.address);
      }
    }
  }
  return preferred[0] ?? fallback[0] ?? '127.0.0.1';
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function pickPort(start = 8081, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    const port = start + i;
    // Skip common local services that used to collide with Expo.
    if (port === 8081) {
      // Prefer 8081 when free; otherwise try next.
    }
    if (await canListen(port)) {
      return port;
    }
  }
  return start;
}

const host = lanIPv4();
const extraArgs = process.argv.slice(2);
const port = await pickPort(8081);

process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
// Never bake a teammate's LAN IP into the API default — production is the shared default.
if (!process.env.EXPO_PUBLIC_API_BASE?.trim()) {
  process.env.EXPO_PUBLIC_API_BASE = 'https://checkin-api.learnnowsyria.com';
}

console.log(`[start-dev-client] LAN ${host}:${port}`);
console.log(`[start-dev-client] Phone URL → http://${host}:${port}`);
console.log(`[start-dev-client] API → ${process.env.EXPO_PUBLIC_API_BASE}`);

const args = [
  'expo',
  'start',
  '--dev-client',
  '--host',
  'lan',
  '--port',
  String(port),
  ...extraArgs,
];

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 0));
