#!/usr/bin/env node
/**
 * Assert a snap's rendered output changes when user inputs change.
 *
 * Usage:
 *   npm run build
 *   node scripts/assert-snap-output-variation.mjs <slug> \
 *     --post-target '?action=generate' \
 *     --inputs-a '{"prompt":"one","palette":"arcade","shape":"creature"}' \
 *     --inputs-b '{"prompt":"two","palette":"arcade","shape":"creature"}' \
 *     --element grid --prop cells
 */
import process from "node:process";
import { pathToFileURL } from "node:url";

function usage(exitCode = 1) {
  console.error(`Usage: node scripts/assert-snap-output-variation.mjs <slug> --post-target <query-or-path> --inputs-a <json> --inputs-b <json> [--element <id>] [--prop <prop>] [--base <url>] [--fid <number>]\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = [...argv];
  if (args.includes("--help") || args.includes("-h")) usage(0);
  const slug = args.shift();
  if (!slug || slug.startsWith("--")) usage(1);
  const options = {
    slug,
    base: "https://snap-factory.vercel.app",
    fid: 12345,
    element: "grid",
    prop: "cells",
  };
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (!flag?.startsWith("--") || value === undefined) usage(1);
    if (flag === "--post-target") options.postTarget = value;
    else if (flag === "--inputs-a") options.inputsA = JSON.parse(value);
    else if (flag === "--inputs-b") options.inputsB = JSON.parse(value);
    else if (flag === "--element") options.element = value;
    else if (flag === "--prop") options.prop = value;
    else if (flag === "--base") options.base = value.replace(/\/$/, "");
    else if (flag === "--fid") options.fid = Number(value);
    else usage(1);
  }
  if (!options.postTarget || !options.inputsA || !options.inputsB) usage(1);
  return options;
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function resolveTarget(base, slug, target) {
  if (target.startsWith("http://") || target.startsWith("https://")) return target;
  if (target.startsWith("?")) return `${base}/snaps/${slug}${target}`;
  if (target.startsWith("/")) return `${base}${target}`;
  return `${base}/snaps/${slug}/${target}`;
}

function envelope({ fid, inputs, base }) {
  return {
    header: base64urlJson({ alg: "none", typ: "JWT" }),
    payload: base64urlJson({
      fid,
      user: { fid },
      inputs,
      audience: base,
      timestamp: Math.floor(Date.now() / 1000),
      surface: { type: "standalone" },
    }),
    signature: "variation-test",
  };
}

async function appRequest(app, url, init) {
  if (typeof app.request === "function") return app.request(url, init);
  if (typeof app.fetch === "function") return app.fetch(new Request(url, init));
  throw new Error("dist/index.js default export does not expose request() or fetch()");
}

function signatureFor(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return Object.keys(item).sort().map((key) => `${key}:${JSON.stringify(item[key])}`).join(",");
        }
        return JSON.stringify(item);
      })
      .join("|");
  }
  return JSON.stringify(value);
}

async function post(app, options, inputs) {
  const target = resolveTarget(options.base, options.slug, options.postTarget);
  const response = await appRequest(app, target, {
    method: "POST",
    headers: {
      Accept: "application/vnd.farcaster.snap+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelope({ fid: options.fid, inputs, base: options.base })),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`POST ${target} returned non-JSON status ${response.status}: ${text.slice(0, 240)}`);
  }
  if (response.status !== 200) throw new Error(`POST ${target} returned ${response.status}: ${text.slice(0, 240)}`);
  const element = json?.ui?.elements?.[options.element];
  if (!element) throw new Error(`Output missing element ${JSON.stringify(options.element)}`);
  const value = options.prop === "." ? element : element?.props?.[options.prop];
  if (value === undefined) throw new Error(`Element ${options.element} missing props.${options.prop}`);
  return { json, signature: signatureFor(value) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  process.env.SNAP_PUBLIC_BASE_URL = options.base;
  process.env.SKIP_JFS_VERIFICATION = "1";
  const appModule = await import(pathToFileURL(`${process.cwd()}/dist/index.js`).href);
  const app = appModule.default;
  const a = await post(app, options, options.inputsA);
  const b = await post(app, options, options.inputsB);
  if (a.signature === b.signature) {
    console.error(`FAIL: ${options.slug} output did not change for different inputs on ${options.element}.props.${options.prop}`);
    console.error(`inputs A: ${JSON.stringify(options.inputsA)}`);
    console.error(`inputs B: ${JSON.stringify(options.inputsB)}`);
    process.exit(1);
  }
  console.log(`OK: ${options.slug} output varies for ${options.element}.props.${options.prop}`);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
