import { spawn } from 'node:child_process';
import os from 'node:os';

function lanIPv4() {
  const nets = os.networkInterfaces();
  const preferred = [];
  const fallback = [];
  for (const [name, entries] of Object.entries(nets)) {
    if (!entries) continue;
    const isWifi = /wi-?fi|wlan|wireless/i.test(name);
    for (const e of entries) {
      if (e.internal || e.family !== 'IPv4') continue;
      if (e.address.startsWith('192.168.') || e.address.startsWith('10.')) {
        (isWifi ? preferred : fallback).push(e.address);
      }
    }
  }
  return preferred[0] ?? fallback[0] ?? '127.0.0.1';
}

const host = lanIPv4();
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
console.log(`[start-dev-client] REACT_NATIVE_PACKAGER_HOSTNAME=${host}`);

const args = ['expo', 'start', '--dev-client', '--host', 'lan', '--port', '8081', ...process.argv.slice(2)];
const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 0));
