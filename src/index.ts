/**
 * snap-factory entry — single Hono app for the entire project.
 *
 * Each snap lives at src/snaps/<name>/index.ts and exports a default Hono
 * sub-app. The codegen step (scripts/generate-registry.ts, run via the
 * prebuild script) writes src/snap-registry.ts with explicit static imports
 * for every snap. This file mounts each registered snap at /snaps/<name>.
 *
 * Static imports are mandatory because Vercel's Hono framework preset
 * deploys this as an Edge function. Edge has no filesystem and bundlers
 * cannot resolve runtime fs operations. The registry approach gives us:
 *
 *   - One file per snap (no need to hand-edit a central router for new snaps)
 *   - Build-time isolation: tsc --noEmit fails before push if any snap has a
 *     type error, so broken code never reaches Vercel
 *   - Edge-runtime compatible (everything is statically resolvable)
 *
 * Default export is the bare Hono app — Vercel's `framework: "hono"` preset
 * knows how to invoke `app.fetch` directly. No `handle()` wrapper needed.
 */
import { Hono } from "hono";
import { snaps } from "./snap-registry.js";

const app = new Hono();

// Root health check.
app.get("/", (c) => {
  return c.text(
    "snap factory — built by snap wizard\n" +
      `snaps live at /snaps/[name]\n` +
      `currently registered: ${Object.keys(snaps).length}\n` +
      "github.com/mtple/snap-factory\n",
  );
});

// JSON listing of all registered snap names.
app.get("/snaps", (c) => {
  return c.json({ snaps: Object.keys(snaps) });
});

// Mount each snap as a sub-app under /snaps/<name>.
for (const [name, sub] of Object.entries(snaps)) {
  app.route(`/snaps/${name}`, sub);
}

export default app;
