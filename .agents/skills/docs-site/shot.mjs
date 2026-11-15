#!/usr/bin/env node
// Screenshot a docs page in headless Chrome, over the DevTools protocol. No dependencies (Node 22+).
// Chrome is found in the usual places; set CHROME_PATH to use another binary.
//
//   node shot.mjs <url> <out.png> [--width 1440] [--height 900] [--theme light|dark]
//                 [--full] [--scroll <px>] [--selector <css>] [--wait <ms>] [--eval <js>]
//
// --full      capture the whole page height (capped at 12000 px)
// --scroll    scroll the window to this Y before capturing the viewport
// --selector  scroll this element into view (top of viewport, 90 px offset) before capturing
// --eval      run this JavaScript in the page before capturing; its JSON result is printed
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const [url, out] = args;
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
if (!url || !out) {
  console.error("usage: shot.mjs <url> <out.png> [--width n] [--height n] [--theme light|dark] [--full] [--scroll px] [--selector css] [--wait ms] [--eval js]");
  process.exit(2);
}
const width = Number(opt("width", 1440));
const height = Number(opt("height", 900));
const theme = opt("theme", "light");
const wait = Number(opt("wait", 700));
const scroll = opt("scroll");
const selector = opt("selector");
const evalJs = opt("eval");

const CHROME = process.env.CHROME_PATH ?? [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => existsSync(path));
if (!CHROME) {
  console.error("No Chrome or Chromium found. Set CHROME_PATH to its binary.");
  process.exit(2);
}
const port = 9400 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "shot-"))}`, `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(100);
  }
  throw new Error("Chrome did not start");
}

try {
  const ws = new WebSocket(await target());
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await send("Page.navigate", { url });
  for (let i = 0; i < 150 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(100);
  await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true");
  await sleep(wait);

  if (selector) {
    const found = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 90); return true; })()`);
    if (!found) console.error(`selector not found: ${selector}`);
    await sleep(250);
  } else if (scroll) {
    await evaluate(`window.scrollTo(0, ${Number(scroll)})`);
    await sleep(250);
  }
  if (evalJs) console.log(JSON.stringify(await evaluate(evalJs)));

  let params = { format: "png" };
  if (flag("full")) {
    const h = Math.min(12000, await evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)"));
    await send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 1, mobile: width < 600 });
    await sleep(300);
  }
  const { data } = await send("Page.captureScreenshot", params);
  writeFileSync(out, Buffer.from(data, "base64"));
  const errors = events.filter((e) => e.method === "Runtime.exceptionThrown").map((e) => e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text);
  if (errors.length) console.error("page errors:\n" + errors.join("\n"));
  console.log(out);
  ws.close();
} finally {
  chrome.kill();
}
