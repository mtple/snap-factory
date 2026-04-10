/**
 * snap-factory entry point.
 *
 * Auto-discovers every directory under src/snaps/ that has an index.ts (or .js
 * post-build) exporting a default Hono app, and mounts it at /snaps/<dirname>.
 *
 * Each snap directory should look like:
 *   src/snaps/<name>/index.ts
 *
 * with `export default app;` where `app` is a Hono instance that uses
 * registerSnapHandler from @farcaster/snap-hono.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isCompiled = __dirname.includes(`${path.sep}dist${path.sep}`) || __dirname.endsWith(`${path.sep}dist`);
const snapEntryFilename = isCompiled ? "index.js" : "index.ts";

const app = new Hono();

// Plain GET / health check (no Accept negotiation here — snaps live under /snaps/<name>).
app.get("/", (c) => {
  return c.text(
    [
      "snap-factory is running.",
      "browse /snaps for the list, /snaps/<name> for individual snaps.",
      "snaps respond with Farcaster Snap JSON when Accept: application/vnd.farcaster.snap+json is set.",
    ].join("\n"),
  );
});

const snapsDir = path.join(__dirname, "snaps");
const discovered: string[] = [];

if (fs.existsSync(snapsDir)) {
  const entries = fs.readdirSync(snapsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const entryFile = path.join(snapsDir, entry.name, snapEntryFilename);
    if (!fs.existsSync(entryFile)) continue;
    try {
      const moduleUrl = pathToFileURL(entryFile).href;
      // eslint-disable-next-line no-await-in-loop
      const mod = (await import(moduleUrl)) as { default?: Hono };
      if (mod.default) {
        app.route(`/snaps/${entry.name}`, mod.default);
        discovered.push(entry.name);
      } else {
        console.warn(`[snap-factory] ${entry.name}/${snapEntryFilename} has no default export, skipping`);
      }
    } catch (err) {
      console.error(`[snap-factory] failed to load snap "${entry.name}":`, err);
    }
  }
}

console.log(`[snap-factory] registered ${discovered.length} snap(s):`, discovered.join(", ") || "(none)");

app.get("/snaps", (c) => {
  return c.json({ snaps: discovered });
});

export default app;

// Local dev: only start the HTTP server when this file is the process entry point.
// Vercel and other serverless runtimes import the default export instead.
const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const port = parseInt(process.env.PORT || "3003", 10);
  serve({ fetch: app.fetch, port });
  console.log(`[snap-factory] listening on http://localhost:${port}`);
}
