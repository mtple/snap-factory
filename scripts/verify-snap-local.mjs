#!/usr/bin/env node
/**
 * Local Snap preflight verifier.
 *
 * Usage:
 *   npm run snap:preflight -- <slug>
 *   npm run snap:verify -- <slug> --post-target '?action=vote' --inputs '{"choice":"fast"}'
 *
 * The script imports dist/index.js, calls the Hono app in-process, validates the
 * initial Snap JSON against the constraints that most often break Farcaster
 * rendering, checks HTML/OG fallback routes, and can optionally exercise one
 * POST flow using a JFS-shaped payload with SKIP_JFS_VERIFICATION=1.
 */

import process from "node:process";
import { pathToFileURL } from "node:url";

const LIMITS = {
  maxElements: 64,
  maxRootChildren: 7,
  maxChildren: 6,
  maxDepth: 5,
  maxTextLength: 320,
  maxButtonLabel: 30,
  maxBadgeLabel: 30,
  maxToggleOptions: 6,
  minToggleOptions: 2,
  maxToggleLabel: 30,
  maxBars: 6,
  maxBarLabel: 40,
  minGridCols: 2,
  maxGridCols: 32,
  minGridRows: 2,
  maxGridRows: 16,
  minGridRowHeight: 8,
  maxGridRowHeight: 64,
};

function usage(exitCode = 1) {
  console.error(`Usage: node scripts/verify-snap-local.mjs <slug> [options]\n\nOptions:\n  --post-target <path-or-query>  Exercise one POST flow. Query-only values are resolved against /snaps/<slug>.\n  --inputs <json>               Inputs object for the POST payload. Defaults to {}.\n  --fid <number>                Test FID. Defaults to 1.\n  --base <url>                  Local base URL. Defaults to http://localhost.\n  --help                        Show this help.\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = [...argv];
  if (args.includes("--help") || args.includes("-h")) usage(0);
  const slug = args.shift();
  if (!slug || slug.startsWith("--")) usage(1);
  const options = { slug, inputs: {}, fid: 1, base: "http://localhost" };
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (!flag?.startsWith("--") || value === undefined) usage(1);
    if (flag === "--post-target") options.postTarget = value;
    else if (flag === "--inputs") options.inputs = JSON.parse(value);
    else if (flag === "--fid") options.fid = Number(value);
    else if (flag === "--base") options.base = value.replace(/\/$/, "");
    else usage(1);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail(`Invalid slug ${JSON.stringify(slug)}. Use kebab-case.`);
  }
  return options;
}

const failures = [];
const warnings = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function note(message) {
  notes.push(message);
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function jsonResponseEnvelope({ fid, inputs, base }) {
  const now = Math.floor(Date.now() / 1000);
  return {
    header: base64urlJson({ alg: "none", typ: "JWT" }),
    payload: base64urlJson({
      fid,
      user: { fid },
      inputs,
      audience: base,
      timestamp: now,
      surface: { type: "standalone" },
    }),
    signature: "local-preflight",
  };
}

function resolveTarget(base, slug, target) {
  if (!target) return null;
  if (target.startsWith("http://") || target.startsWith("https://")) return target;
  if (target.startsWith("?")) return `${base}/snaps/${slug}${target}`;
  if (target.startsWith("/")) return `${base}${target}`;
  return `${base}/snaps/${slug}/${target}`;
}

async function appRequest(app, url, init) {
  if (typeof app.request === "function") return app.request(url, init);
  if (typeof app.fetch === "function") return app.fetch(new Request(url, init));
  throw new Error("dist/index.js default export does not expose request() or fetch()");
}

async function readJsonResponse(app, url, init) {
  const response = await appRequest(app, url, init);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    fail(`${init?.method ?? "GET"} ${url} did not return JSON. Status ${response.status}. Body: ${text.slice(0, 240)}`);
  }
  return { response, text, json };
}

function getElements(page) {
  const elements = page?.ui?.elements;
  if (!elements || typeof elements !== "object" || Array.isArray(elements)) {
    fail("Snap JSON missing ui.elements object");
    return {};
  }
  return elements;
}

function validateElementRef(ref, elements, path, depth, visited = new Set()) {
  if (depth > LIMITS.maxDepth) {
    fail(`${path} exceeds max nesting depth ${LIMITS.maxDepth}`);
    return;
  }
  const element = elements[ref];
  if (!element) {
    fail(`${path} references missing element ${JSON.stringify(ref)}`);
    return;
  }
  if (visited.has(ref)) {
    fail(`${path} has cyclic child reference ${JSON.stringify(ref)}`);
    return;
  }
  const nextVisited = new Set(visited);
  nextVisited.add(ref);
  const children = element.children;
  if (children !== undefined) {
    if (!Array.isArray(children)) {
      fail(`${path}.${ref}.children is not an array`);
    } else {
      // The root container has its own 7-child limit. Nested containers max at 6.
      if (depth > 1 && children.length > LIMITS.maxChildren) {
        fail(`${path}.${ref} has ${children.length} children; max is ${LIMITS.maxChildren}`);
      }
      for (const child of children) validateElementRef(child, elements, `${path}.${ref}`, depth + 1, nextVisited);
    }
  }
}

function validateSnapPage(page, label) {
  if (!page || typeof page !== "object") {
    fail(`${label}: missing JSON object`);
    return;
  }
  if (page.version !== "2.0") warn(`${label}: version is ${JSON.stringify(page.version)}; new/touched snaps should use "2.0"`);
  if (!page.ui || typeof page.ui !== "object") fail(`${label}: missing ui object`);
  if (!page.ui?.root) fail(`${label}: missing ui.root`);
  const elements = getElements(page);
  const elementNames = Object.keys(elements);
  if (elementNames.length > LIMITS.maxElements) {
    fail(`${label}: ${elementNames.length} elements; max is ${LIMITS.maxElements}`);
  }
  const root = elements[page.ui?.root];
  if (!root) fail(`${label}: ui.root references missing element ${JSON.stringify(page.ui?.root)}`);
  const rootChildren = Array.isArray(root?.children) ? root.children : [];
  if (rootChildren.length > LIMITS.maxRootChildren) {
    fail(`${label}: root has ${rootChildren.length} children; max is ${LIMITS.maxRootChildren}`);
  }
  if (page.ui?.root) validateElementRef(page.ui.root, elements, label, 1);

  let hasShare = false;
  let submitTargets = [];
  for (const [id, element] of Object.entries(elements)) {
    const type = element?.type;
    const props = element?.props ?? {};
    const onPress = element?.on?.press;
    if (type === "text" && typeof props.content === "string" && props.content.length > LIMITS.maxTextLength) {
      fail(`${label}: text ${id} is ${props.content.length} chars; max is ${LIMITS.maxTextLength}`);
    }
    if (type === "button") {
      if (typeof props.label === "string" && props.label.length > LIMITS.maxButtonLabel) {
        fail(`${label}: button ${id} label is ${props.label.length} chars; max is ${LIMITS.maxButtonLabel}`);
      }
      if (onPress?.action === "compose_cast") hasShare = true;
      if (onPress?.action === "submit") submitTargets.push(onPress.params?.target);
    }
    if (type === "badge" && typeof props.label === "string" && props.label.length > LIMITS.maxBadgeLabel) {
      fail(`${label}: badge ${id} label is ${props.label.length} chars; max is ${LIMITS.maxBadgeLabel}`);
    }
    if (type === "toggle_group") {
      const options = props.options;
      if (!Array.isArray(options)) fail(`${label}: toggle_group ${id} missing options array`);
      else {
        if (options.length < LIMITS.minToggleOptions || options.length > LIMITS.maxToggleOptions) {
          fail(`${label}: toggle_group ${id} has ${options.length} options; expected ${LIMITS.minToggleOptions}-${LIMITS.maxToggleOptions}`);
        }
        for (const option of options) {
          const labelText = typeof option === "string" ? option : option?.label;
          if (typeof labelText === "string" && labelText.length > LIMITS.maxToggleLabel) {
            fail(`${label}: toggle_group ${id} option ${JSON.stringify(labelText)} is over ${LIMITS.maxToggleLabel} chars`);
          }
        }
      }
    }
    if (type === "bar_chart") {
      const bars = props.bars;
      if (!Array.isArray(bars)) fail(`${label}: bar_chart ${id} missing bars array`);
      else {
        if (bars.length > LIMITS.maxBars) fail(`${label}: bar_chart ${id} has ${bars.length} bars; max is ${LIMITS.maxBars}`);
        for (const bar of bars) {
          if (typeof bar?.label === "string" && bar.label.length > LIMITS.maxBarLabel) {
            fail(`${label}: bar_chart ${id} label ${JSON.stringify(bar.label)} is over ${LIMITS.maxBarLabel} chars`);
          }
        }
      }
    }
    if (type === "cell_grid") {
      const { cols, rows, rowHeight } = props;
      if (cols < LIMITS.minGridCols || cols > LIMITS.maxGridCols) fail(`${label}: cell_grid ${id} cols ${cols} outside ${LIMITS.minGridCols}-${LIMITS.maxGridCols}`);
      if (rows < LIMITS.minGridRows || rows > LIMITS.maxGridRows) fail(`${label}: cell_grid ${id} rows ${rows} outside ${LIMITS.minGridRows}-${LIMITS.maxGridRows}`);
      if (rowHeight !== undefined && (rowHeight < LIMITS.minGridRowHeight || rowHeight > LIMITS.maxGridRowHeight)) {
        fail(`${label}: cell_grid ${id} rowHeight ${rowHeight} outside ${LIMITS.minGridRowHeight}-${LIMITS.maxGridRowHeight}`);
      }
      if ((props.select === "single" || props.select === "multiple") && element?.on?.press) {
        fail(`${label}: cell_grid ${id} combines select mode with on.press`);
      }
    }
  }
  if (!hasShare) fail(`${label}: no compose_cast share button found`);
  return { submitTargets };
}

async function requestImage(app, url) {
  const originalConsoleError = console.error;
  try {
    // Hono logs route exceptions before returning 500. Capture the status below
    // instead so expected local root-OG fallback failures do not spam preflight.
    console.error = () => {};
    const response = await appRequest(app, url);
    const contentType = response.headers.get("content-type") ?? "";
    await response.arrayBuffer();
    return { status: response.status, contentType, error: null };
  } catch (error) {
    return { status: 0, contentType: "", error };
  } finally {
    console.error = originalConsoleError;
  }
}

async function verifyFallback(app, base, slug) {
  const htmlUrl = `${base}/snaps/${slug}`;
  const html = await appRequest(app, htmlUrl, { headers: { Accept: "text/html" } });
  const htmlText = await html.text();
  if (html.status !== 200) fail(`HTML fallback returned ${html.status}`);
  if (!/property=["']og:title["']|name=["']twitter:title["']/.test(htmlText)) warn("HTML fallback did not expose og/twitter title meta");
  const ogMatch = htmlText.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    ?? htmlText.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const ogUrl = ogMatch?.[1];
  if (!ogUrl) {
    warn("HTML fallback did not expose an og:image meta tag");
    return;
  }

  const advertised = await requestImage(app, ogUrl);
  if (advertised.status === 200 && advertised.contentType.includes("image/")) return;

  // Local root /~/og-image can call fetch(http://localhost/...) inside the app
  // without a listening server. Fall back to the per-snap route so local
  // preflight still proves an image renderer exists; live verification still
  // checks the advertised URL after deploy.
  const perSnapOgUrl = `${base}/snaps/${slug}/~/og-image`;
  const perSnap = await requestImage(app, perSnapOgUrl);
  if (perSnap.status === 200 && perSnap.contentType.includes("image/")) {
    warn(`Advertised OG image ${ogUrl} returned ${advertised.status || advertised.error?.message}; per-snap OG image passed locally`);
    return;
  }

  fail(`OG image failed. Advertised ${ogUrl} -> ${advertised.status || advertised.error?.message}; per-snap ${perSnapOgUrl} -> ${perSnap.status || perSnap.error?.message}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  process.env.SNAP_PUBLIC_BASE_URL = options.base;
  process.env.SKIP_JFS_VERIFICATION = "1";

  const appModule = await import(pathToFileURL(`${process.cwd()}/dist/index.js`).href);
  const app = appModule.default;
  const snapUrl = `${options.base}/snaps/${options.slug}`;

  const initial = await readJsonResponse(app, snapUrl, {
    headers: { Accept: "application/vnd.farcaster.snap+json" },
  });
  if (initial.response.status !== 200) fail(`GET ${snapUrl} returned ${initial.response.status}`);
  const initialValidation = initial.json ? validateSnapPage(initial.json, "GET") : { submitTargets: [] };
  await verifyFallback(app, options.base, options.slug);

  const postTarget = options.postTarget ?? null;
  if (postTarget) {
    const target = resolveTarget(options.base, options.slug, postTarget);
    const post = await readJsonResponse(app, target, {
      method: "POST",
      headers: {
        Accept: "application/vnd.farcaster.snap+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonResponseEnvelope(options)),
    });
    if (post.response.status !== 200) fail(`POST ${target} returned ${post.response.status}: ${post.text.slice(0, 240)}`);
    if (post.json) validateSnapPage(post.json, "POST");
    note(`POST target verified: ${target}`);
  } else if (initialValidation?.submitTargets?.length) {
    note(`Submit targets found but not exercised: ${initialValidation.submitTargets.filter(Boolean).join(", ")}`);
  }

  if (notes.length) console.log(notes.map((m) => `note: ${m}`).join("\n"));
  if (warnings.length) console.warn(warnings.map((m) => `warning: ${m}`).join("\n"));
  if (failures.length) {
    console.error(failures.map((m) => `FAIL: ${m}`).join("\n"));
    process.exit(1);
  }
  console.log(`OK: ${options.slug} local snap preflight passed`);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
