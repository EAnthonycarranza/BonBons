import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const args = process.argv.slice(2),
  portIndex = args.findIndex((arg) => ["--port", "-p"].includes(arg));
const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || "3000";
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", ...args],
  { stdio: "inherit", env: process.env },
);
let busy = false;
async function tick() {
  if (busy || !process.env.BONBONS_INTERNAL_API_TOKEN) return;
  busy = true;
  try {
    await fetch(`http://127.0.0.1:${port}/api/internal/order-notifications`, {
      method: "POST",
      headers: { "x-internal-token": process.env.BONBONS_INTERNAL_API_TOKEN },
      signal: AbortSignal.timeout(55000),
    });
  } catch {
  } finally {
    busy = false;
  }
}
const timer = setInterval(tick, 60000);
timer.unref();
const initial = setTimeout(tick, 5000);
initial.unref();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    clearInterval(timer);
    clearTimeout(initial);
    child.kill(signal);
  });
child.on("error", () => {
  console.error("The web server could not start.");
  process.exit(1);
});
child.on("exit", (code) => {
  clearInterval(timer);
  clearTimeout(initial);
  process.exit(code ?? 0);
});
