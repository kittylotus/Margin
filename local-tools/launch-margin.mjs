import { spawn, spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { homedir, hostname, networkInterfaces, platform } from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import process from 'node:process';

const argv = new Set(process.argv.slice(2));
const root = process.cwd();
const port = process.env.PORT || '3000';
const verbose = argv.has('--verbose');
const color = Boolean(process.stdout.isTTY && !argv.has('--no-color') && !process.env.NO_COLOR);

const ansi = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  pink: '\x1b[38;5;205m', purple: '\x1b[38;5;141m', blue: '\x1b[38;5;117m',
  green: '\x1b[38;5;82m', cyan: '\x1b[38;5;81m', yellow: '\x1b[38;5;220m', red: '\x1b[38;5;203m', gray: '\x1b[38;5;245m',
};
const c = (code, text) => color ? `${code}${text}${ansi.reset}` : text;
const pad = (value, width) => String(value).padEnd(width, ' ');
const tag = (name, tone = ansi.gray) => `${c(ansi.dim, '[')}${c(tone, pad(name, 7))}${c(ansi.dim, ']')}`;

function commandExists(command) {
  const probe = platform() === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0;
}

function stateDirectory() {
  if (process.env.MARGIN_CONFIG_DIR?.trim()) return path.resolve(process.env.MARGIN_CONFIG_DIR.trim());
  if (platform() === 'win32') return path.join(process.env.LOCALAPPDATA || process.env.APPDATA || homedir(), 'Margin');
  if (platform() === 'darwin') return path.join(homedir(), 'Library', 'Application Support', 'Margin');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config'), 'margin');
}

function codeFile() { return path.join(stateDirectory(), 'access-code.txt'); }
function makeAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]);
  return [0, 4, 8, 12].map((start) => chars.slice(start, start + 4).join('')).join('-');
}
function getAccessCode(rotate = false) {
  if (process.env.MARGIN_ACCESS_CODE?.trim()) return process.env.MARGIN_ACCESS_CODE.trim();
  const file = codeFile();
  if (!rotate && existsSync(file)) return readFileSync(file, 'utf8').trim();
  mkdirSync(path.dirname(file), { recursive: true });
  const code = makeAccessCode();
  writeFileSync(file, `${code}\n`, { mode: 0o600 });
  return code;
}

function isTailscale(address) {
  const [a, b] = address.split('.').map(Number);
  return a === 100 && b >= 64 && b <= 127;
}

function networkAddresses() {
  const result = [];
  for (const [name, values] of Object.entries(networkInterfaces())) {
    for (const item of values || []) {
      if (item.family !== 'IPv4' || item.internal || item.address.startsWith('169.254.')) continue;
      const kind = isTailscale(item.address) || /tailscale/i.test(name)
        ? 'Tailscale'
        : /wi-?fi|wlan|wireless/i.test(name)
          ? 'LAN Wi-Fi'
          : /ethernet|lan/i.test(name)
            ? 'LAN Ethernet'
            : 'LAN';
      result.push({ address: item.address, name, kind });
    }
  }
  return [...new Map(result.map((item) => [item.address, item])).values()];
}

function printLogo() {
  const lines = [
    '███╗   ███╗ █████╗ ██████╗  ██████╗ ██╗███╗   ██╗',
    '████╗ ████║██╔══██╗██╔══██╗██╔════╝ ██║████╗  ██║',
    '██╔████╔██║███████║██████╔╝██║  ███╗██║██╔██╗ ██║',
    '██║╚██╔╝██║██╔══██║██╔══██╗██║   ██║██║██║╚██╗██║',
    '██║ ╚═╝ ██║██║  ██║██║  ██║╚██████╔╝██║██║ ╚████║',
    '╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝',
  ];
  const tones = [ansi.pink, ansi.pink, ansi.purple, ansi.purple, ansi.blue, ansi.blue];
  console.log('');
  lines.forEach((line, index) => console.log(c(tones[index], line)));
  console.log(c(ansi.gray, '                         local reading workstation'));
  console.log(c(ansi.dim,  '                         desktop  //  browser  //  mobile'));
  console.log('');
}

async function runInstall(command) {
  return await new Promise((resolve) => {
    const child = spawn(command, ['install'], { cwd: root, stdio: 'inherit' });
    child.on('exit', (code, signal) => resolve(signal ? 130 : (code ?? 1)));
  });
}

async function chooseMode() {
  if (argv.has('--lan') || argv.has('--remote')) return 'lan';
  if (argv.has('--local')) return 'local';
  if (!process.stdin.isTTY) return 'local';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`${tag('MODE', ansi.cyan)} Choose how Margin should listen.`);
  console.log(`         ${c(ansi.bold, '[1]')} This computer only`);
  console.log(`         ${c(ansi.bold, '[2]')} Local network / PWA`);
  const answer = (await rl.question(`\n         Choose ${c(ansi.dim, '[1]')}: `)).trim();
  rl.close();
  return answer === '2' ? 'lan' : 'local';
}

function nextCli() {
  return path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
}

function printFailureTail(lines) {
  const useful = lines.filter((line) => line.trim()).slice(-24);
  if (!useful.length) return;
  console.error(`\n${tag('PANIC', ansi.red)} Next exited unexpectedly. Recent output:`);
  for (const line of useful) console.error(c(ansi.dim, `         ${line}`));
}

async function runNext(host, env) {
  const logPath = path.join(root, '.margin-runner.log');
  const log = createWriteStream(logPath, { flags: 'w' });
  const args = [nextCli(), 'dev', '--hostname', host, '--port', port];
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: ['inherit', 'pipe', 'pipe'] });
  const recent = [];
  let readyShown = false;

  const handleLine = (line) => {
    if (!line) return;
    recent.push(line);
    if (recent.length > 60) recent.shift();
    if (/Ready in/i.test(line) && !readyShown) {
      readyShown = true;
      console.log(`${tag('SERVE', ansi.green)} ${c(ansi.green, line.replace(/^.?\s*/, ''))}`);
    } else if (/EADDRINUSE|\b(error|failed|fatal|exception)\b/i.test(line)) {
      console.error(`${tag('ERROR', ansi.red)} ${line}`);
    } else if (/^⚠|\bwarning\b/i.test(line)) {
      console.warn(`${tag('WARN', ansi.yellow)} ${line.replace(/^⚠\s*/, '')}`);
    }
  };

  const makeConsumer = (stream) => {
    let buffered = '';
    return {
      push(chunk) {
        const text = chunk.toString();
        log.write(text);
        if (verbose) stream.write(text);
        buffered += text;
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop() || '';
        if (!verbose) for (const raw of lines) handleLine(raw.trimEnd());
      },
      flush() {
        if (!verbose && buffered.trim()) handleLine(buffered.trimEnd());
        buffered = '';
      },
    };
  };

  const stdout = makeConsumer(process.stdout);
  const stderr = makeConsumer(process.stderr);
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));

  const stop = () => {
    try { child.kill('SIGINT'); } catch {}
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const code = await new Promise((resolve) => child.on('exit', (exitCode, signal) => resolve(signal ? 130 : (exitCode ?? 1))));
  stdout.flush();
  stderr.flush();
  log.end();
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  if (code !== 0 && code !== 130) printFailureTail(recent);
  return code;
}

printLogo();

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`${tag('ERROR', ansi.red)} Node 22.13+ is required. Found ${process.versions.node}.`);
  process.exit(1);
}
console.log(`${tag('BOOT', ansi.cyan)} Preparing Margin runner.`);
console.log(`${tag('RUNTIME', ansi.gray)} Node ${process.versions.node}.`);

const runner = commandExists('bun') ? 'bun' : commandExists('npm') ? 'npm' : '';
if (!runner) {
  console.error(`${tag('ERROR', ansi.red)} Bun or npm is required.`);
  process.exit(1);
}

const needInstall = !existsSync(path.join(root, 'node_modules', 'next', 'package.json')) || !existsSync(path.join(root, 'node_modules', 'get-youtube-transcript', 'package.json'));
if (needInstall) {
  console.log(`${tag('DEPS', ansi.yellow)} Dependencies missing. Installing with ${runner === 'bun' ? 'Bun' : 'npm'}…`);
  const installCode = await runInstall(runner);
  if (installCode) process.exit(installCode);
}
console.log(`${tag('DEPS', ansi.green)} JavaScript dependencies are ready ${c(ansi.dim, `(${runner === 'bun' ? 'Bun' : 'npm'})`)}.`);

const mode = await chooseMode();
const lan = mode === 'lan';
const noAuth = lan && argv.has('--no-auth');
const accessCode = lan ? getAccessCode(argv.has('--rotate-code')) : '';
const host = lan ? '0.0.0.0' : '127.0.0.1';
const addresses = networkAddresses();
const env = {
  ...process.env,
  PORT: port,
  MARGIN_REQUIRE_AUTH: lan && !noAuth ? '1' : '0',
  ...(lan && !noAuth ? { MARGIN_ACCESS_CODE: accessCode } : {}),
};

console.log('');
console.log(`${tag('READY', ansi.green)} Margin will listen on port ${c(ansi.cyan, port)}.`);
console.log(`${c(ansi.cyan, 'Local'.padEnd(15))} http://127.0.0.1:${port}`);
if (lan) {
  for (const item of addresses) {
    console.log(`${c(item.kind === 'Tailscale' ? ansi.blue : ansi.cyan, item.kind.padEnd(15))} http://${item.address}:${port} ${c(ansi.dim, `[${item.name}]`)}`);
  }
  if (noAuth) {
    console.log(`${tag('AUTH', ansi.yellow)} Access gate is OFF ${c(ansi.dim, '(--no-auth)')}.`);
  } else {
    console.log(`${tag('AUTH', ansi.green)} Access gate enabled. Code: ${c(ansi.bold, accessCode)}`);
    console.log(`         Remembered for 30 days per browser.`);
  }
  console.log(`${tag('PWA', ansi.purple)} HTTPS is required on other devices for install/service workers.`);
  console.log(`         Chromium desktop may use ${c(ansi.dim, '--unsafely-treat-insecure-origin-as-secure')}.`);
}
console.log(`${tag('LOG', ansi.gray)} Raw Next output → ${c(ansi.dim, '.margin-runner.log')}${verbose ? c(ansi.yellow, '  [verbose]') : ''}`);
console.log(`${tag('STOP', ansi.gray)} Ctrl+C stops Margin.`);
console.log(`${tag('TIP', ansi.gray)} Use ${c(ansi.dim, '--verbose')} to show the raw dev stream live.`);
console.log('');

const code = await runNext(host, env);
process.exit(code);
