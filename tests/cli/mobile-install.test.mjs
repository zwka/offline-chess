import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workspaces = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    const commandPath = join(workspace, "offline-chess");
    if (existsSync(commandPath)) {
      runCommand(commandPath, ["--shutdown"], makeEnvironment(workspace, 4170));
    }
    rmSync(workspace, { force: true, recursive: true });
  }
});

describe("offline-chess mobile install CLI", () => {
  it("prints usage and exits non-zero for invalid flags", () => {
    const commandPath = join(repositoryRoot, "offline-chess");
    const result = spawnSync(commandPath, ["--unknown"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage: \.\/offline-chess --install-mobile \| --shutdown/);
  });

  it("checks for cloudflared before installing or building dependencies", () => {
    const workspace = createWorkspace();
    const environment = {
      ...makeEnvironment(workspace, 4170),
      MOBILE_TEST_CLOUDFLARED_MODE: "missing",
    };

    const result = runCommand(
      join(workspace, "offline-chess"),
      ["--install-mobile"],
      environment,
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /cloudflared is required/);
    assert.equal(existsSync(join(workspace, "events.jsonl")), false);
  });

  it("leaves an unrelated listener alone when the selected port is occupied", async () => {
    const workspace = createWorkspace();
    const listener = await startFixtureListener();
    const environment = makeEnvironment(workspace, listener.port);

    try {
      const result = runCommand(
        join(workspace, "offline-chess"),
        ["--install-mobile"],
        environment,
      );

      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`Port ${listener.port} is already in use`));
      assert.equal(existsSync(join(workspace, "events.jsonl")), false);

      const response = await fetch(`http://127.0.0.1:${listener.port}/`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, /<title>Offline Chess<\/title>/);
      assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
    } finally {
      await closeFixtureListener(listener.server);
    }
  });

  it("prints a tunnel URL, serves the Suite Landing Page, reuses a healthy session, and shuts down cleanly", async () => {
    const workspace = createWorkspace();
    const port = await reservePort();
    const environment = makeEnvironment(workspace, port);
    const commandPath = join(workspace, "offline-chess");

    const firstStart = runCommand(commandPath, ["--install-mobile"], environment);
    assert.equal(firstStart.status, 0, firstStart.error?.message ?? firstStart.stderr);
    assert.match(firstStart.stdout, /https:\/\/suite-mobile-test\.trycloudflare\.com/);

    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<title>Offline Chess<\/title>/);
    assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);

    const eventsBeforeReuse = readEvents(workspace);
    assert.deepEqual(
      eventsBeforeReuse.map(({ executable, args }) => `${executable} ${args.join(" ")}`),
      [
        "npm install",
        "npm run build",
        "npm run preview",
        `cloudflared tunnel --url http://127.0.0.1:${port}`,
      ],
    );

    const previewPid = requiredPid(eventsBeforeReuse, "npm", "preview");
    const tunnelPid = requiredPid(eventsBeforeReuse, "cloudflared", "tunnel");
    assert.equal(isProcessRunning(previewPid), true);
    assert.equal(isProcessRunning(tunnelPid), true);

    const secondStart = runCommand(commandPath, ["--install-mobile"], environment);
    assert.equal(secondStart.status, 0, secondStart.error?.message ?? secondStart.stderr);
    assert.equal(secondStart.stdout, firstStart.stdout);
    assert.equal(readEvents(workspace).length, eventsBeforeReuse.length);

    const shutdown = runCommand(commandPath, ["--shutdown"], environment);
    assert.equal(shutdown.status, 0, shutdown.error?.message ?? shutdown.stderr);
    assert.match(shutdown.stdout, /Mobile install session stopped/);
    await waitForProcessExit(previewPid);
    await waitForProcessExit(tunnelPid);
    await assert.rejects(() => fetch(`http://127.0.0.1:${port}/`));

    const stateDirectory = join(workspace, ".offline-chess");
    assert.equal(existsSync(join(stateDirectory, "session.json")), false);

    const repeatedShutdown = runCommand(commandPath, ["--shutdown"], environment);
    assert.equal(repeatedShutdown.status, 0);
    assert.match(repeatedShutdown.stdout, /No active mobile install session/);
  });

  it("stops the preview server and cleans up state when cloudflared exits during startup", async () => {
    const workspace = createWorkspace();
    const port = await reservePort();
    const environment = {
      ...makeEnvironment(workspace, port),
      MOBILE_TEST_CLOUDFLARED_MODE: "exit",
    };
    const commandPath = join(workspace, "offline-chess");

    const result = runCommand(commandPath, ["--install-mobile"], environment);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /cloudflared exited before the tunnel became ready/);
    assert.match(result.stderr, /\.offline-chess/);

    const events = readEvents(workspace);
    const previewPid = requiredPid(events, "npm", "preview");
    const tunnelPid = requiredPid(events, "cloudflared", "tunnel");
    await waitForProcessExit(previewPid);
    await waitForProcessExit(tunnelPid);
    await assert.rejects(() => fetch(`http://127.0.0.1:${port}/`));
    assert.equal(existsSync(join(workspace, ".offline-chess", "session.json")), false);
  });

  it("replaces a stale session instead of keeping its surviving preview server", async () => {
    const workspace = createWorkspace();
    const port = await reservePort();
    const environment = makeEnvironment(workspace, port);
    const commandPath = join(workspace, "offline-chess");

    const firstStart = runCommand(commandPath, ["--install-mobile"], environment);
    assert.equal(firstStart.status, 0);

    const initialEvents = readEvents(workspace);
    const oldPreviewPid = requiredPid(initialEvents, "npm", "preview");
    const oldTunnelPid = requiredPid(initialEvents, "cloudflared", "tunnel");
    process.kill(oldTunnelPid, "SIGTERM");
    await waitForProcessExit(oldTunnelPid);

    const secondStart = runCommand(commandPath, ["--install-mobile"], environment);
    assert.equal(secondStart.status, 0, secondStart.error?.message ?? secondStart.stderr);

    const events = readEvents(workspace);
    const previewPids = events
      .filter((event) => event.executable === "npm" && event.args.includes("preview"))
      .map((event) => event.pid);
    assert.equal(previewPids.length, 2);
    assert.equal(isProcessRunning(oldPreviewPid), false);
    assert.equal(isProcessRunning(previewPids[1]), true);
  });

  it("escalates to SIGKILL when a managed process ignores SIGTERM during shutdown", async () => {
    const workspace = createWorkspace();
    const port = await reservePort();
    const environment = {
      ...makeEnvironment(workspace, port),
      MOBILE_TEST_CLOUDFLARED_MODE: "ignore-term",
    };
    const commandPath = join(workspace, "offline-chess");

    const start = runCommand(commandPath, ["--install-mobile"], environment);
    assert.equal(start.status, 0, start.error?.message ?? start.stderr);

    const tunnelPid = requiredPid(readEvents(workspace), "cloudflared", "tunnel");
    const shutdown = runCommand(commandPath, ["--shutdown"], environment);
    assert.equal(shutdown.status, 0, shutdown.error?.message ?? shutdown.stderr);
    await waitForProcessExit(tunnelPid);
  });
});

function createWorkspace() {
  const workspace = mkdtempSync(join(tmpdir(), "offline-chess-mobile-"));
  workspaces.push(workspace);
  mkdirSync(join(workspace, "scripts"));
  mkdirSync(join(workspace, "fake-bin"));

  copyFileSync(join(repositoryRoot, "offline-chess"), join(workspace, "offline-chess"));
  chmodSync(join(workspace, "offline-chess"), 0o755);
  copyFileSync(
    join(repositoryRoot, "scripts", "mobile-tunnel.mjs"),
    join(workspace, "scripts", "mobile-tunnel.mjs"),
  );

  writeExecutable(join(workspace, "fake-bin", "npm"), fakeNpmSource);
  writeExecutable(join(workspace, "fake-bin", "cloudflared"), fakeCloudflaredSource);
  writeFileSync(join(workspace, "fetch-preload.mjs"), fetchPreloadSource);
  return workspace;
}

function writeExecutable(path, source) {
  writeFileSync(path, source);
  chmodSync(path, 0o755);
}

function makeEnvironment(workspace, port) {
  const preload = JSON.stringify(join(workspace, "fetch-preload.mjs"));
  return {
    ...process.env,
    PATH: `${join(workspace, "fake-bin")}:${process.env.PATH ?? ""}`,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${preload}`.trim(),
    OFFLINE_CHESS_PORT: String(port),
    MOBILE_TEST_EVENTS: join(workspace, "events.jsonl"),
    MOBILE_TEST_FETCH_EVENTS: join(workspace, "tunnel-fetches.jsonl"),
    MOBILE_TEST_TUNNEL_URL: "https://suite-mobile-test.trycloudflare.com",
  };
}

function runCommand(commandPath, args, env) {
  return spawnSync(commandPath, args, {
    cwd: tmpdir(),
    env,
    encoding: "utf8",
    timeout: 20_000,
  });
}

function readEvents(workspace) {
  return readFileSync(join(workspace, "events.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

function requiredPid(events, executable, argument) {
  const event = events.find(
    (candidate) => candidate.executable === executable && candidate.args.includes(argument),
  );
  if (typeof event?.pid !== "number") throw new Error(`No ${executable} PID recorded`);
  return event.pid;
}

function isProcessRunning(pid) {
  const result = spawnSync("/bin/ps", ["-p", String(pid), "-o", "stat="], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 && !result.stdout.trim().startsWith("Z");
}

async function waitForProcessExit(pid) {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline && isProcessRunning(pid)) await delay(50);
  assert.equal(isProcessRunning(pid), false);
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a test port");
  await closeFixtureListener(server);
  return address.port;
}

async function startFixtureListener() {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<!doctype html><head><link rel="manifest" href="/manifest.webmanifest"><title>Offline Chess</title></head><body></body>');
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start the fixture listener");
  return { server, port: address.port };
}

async function closeFixtureListener(server) {
  await new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
}

const fakeNpmSource = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { createServer } from "node:http";

const args = process.argv.slice(2);
const event = { executable: "npm", args, pid: process.pid };
appendFileSync(process.env.MOBILE_TEST_EVENTS, JSON.stringify(event) + "\\n");

if (args[0] === "run" && args[1] === "preview") {
  const html = '<!doctype html><html lang="en" data-theme="dark"><head><link rel="manifest" href="/manifest.webmanifest" /><title>Offline Chess</title></head><body><h1>Offline Chess</h1></body></html>';
  const port = Number(process.env.OFFLINE_CHESS_PORT || "4170");
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(\`Offline Chess preview server listening at http://127.0.0.1:\${port}\\n\`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
`;

const fakeCloudflaredSource = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
if (args[0] === "--version") {
  if (process.env.MOBILE_TEST_CLOUDFLARED_MODE === "missing") process.exit(127);
  process.stdout.write("cloudflared version test\\n");
  process.exit(0);
}
appendFileSync(process.env.MOBILE_TEST_EVENTS, JSON.stringify({
  executable: "cloudflared",
  args,
  pid: process.pid,
}) + "\\n");
if (process.env.MOBILE_TEST_CLOUDFLARED_MODE === "exit") {
  process.stderr.write("fake tunnel startup failed\\n");
  process.exit(3);
}
process.stdout.write("https://" + new URL(process.env.MOBILE_TEST_TUNNEL_URL).host + "\\n");
process.on("SIGTERM", () => {
  if (process.env.MOBILE_TEST_CLOUDFLARED_MODE !== "ignore-term") process.exit(0);
});
process.on("SIGINT", () => process.exit(0));
setInterval(() => {}, 60_000);
`;

const fetchPreloadSource = `import { appendFileSync } from "node:fs";

const fetchOriginal = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const inputUrl = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (inputUrl.hostname.endsWith(".trycloudflare.com")) {
    appendFileSync(process.env.MOBILE_TEST_FETCH_EVENTS, JSON.stringify({ url: inputUrl.href }) + "\\n");
    if (process.env.MOBILE_TEST_PUBLIC_UNAVAILABLE === "1") {
      return Promise.resolve(new Response("Quick Tunnel route is still starting", { status: 530 }));
    }
    inputUrl.protocol = "http:";
    inputUrl.hostname = "127.0.0.1";
    inputUrl.port = process.env.OFFLINE_CHESS_PORT;
  }
  return fetchOriginal(inputUrl, init);
};
`;
