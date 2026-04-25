#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ENGAGEMENT_PATH = path.join(ROOT, 'snap-engagement.json');
const INSIGHTS_PATH = path.join(ROOT, 'snap-insights.md');
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const API_BASE = 'https://api.neynar.com/v2/farcaster/cast';
const SCORE_FORMULA = 'score = likes * 3 + recasts * 5 + replies * 2';
const DAY_MS = 24 * 60 * 60 * 1000;

function isoNow() {
  return new Date().toISOString();
}

function asNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function getNested(obj, pathParts) {
  let current = obj;
  for (const part of pathParts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function extractStats(payload) {
  const cast = payload?.cast ?? payload?.result?.cast ?? payload;
  const likes = asNumber(
    cast?.reactions?.likes_count,
    cast?.reactions?.likes?.count,
    cast?.likes_count,
    cast?.reaction_counts?.likes,
    getNested(cast, ['viewer_context', 'likes_count']),
  );
  const recasts = asNumber(
    cast?.reactions?.recasts_count,
    cast?.reactions?.recasts?.count,
    cast?.recasts_count,
    cast?.reaction_counts?.recasts,
  );
  const replies = asNumber(
    cast?.replies?.count,
    cast?.replies_count,
    cast?.reply_count,
    cast?.reply_counts?.all,
  );
  const uniqueInteractors = asNumber(
    cast?.engagement?.unique_interactors,
    cast?.unique_interactors,
    cast?.viewer_context?.unique_interactors,
    likes + recasts + replies,
  );

  return {
    likes,
    recasts,
    replies,
    unique_interactors: uniqueInteractors,
  };
}

function score(stats) {
  return (stats.likes ?? 0) * 3 + (stats.recasts ?? 0) * 5 + (stats.replies ?? 0) * 2;
}

function isRecent(iso, days = 14) {
  const then = Date.parse(iso ?? '');
  return Number.isFinite(then) && Date.now() - then <= days * DAY_MS;
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fmt(num) {
  if (!Number.isFinite(num)) return '0.0';
  return num.toFixed(1);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|');
}

function summarizePattern(snaps, tag) {
  const names = snaps.slice(0, 3).map((snap) => snap.name).join(', ');
  return `- **${tag}** is over-indexing (${snaps.length} snap${snaps.length === 1 ? '' : 's'}; examples: ${names}). Keep testing adjacent variants.`;
}

function buildInsights(data) {
  const snaps = [...(data.snaps ?? [])];
  const recent = snaps.filter((snap) => isRecent(snap.posted_at, 14));
  const scoredRecent = recent.filter((snap) => (snap.score ?? 0) > 0).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const scoredAll = snaps.filter((snap) => (snap.score ?? 0) > 0).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const tagMap = new Map();
  for (const snap of snaps) {
    for (const tag of snap.tags ?? []) {
      const row = tagMap.get(tag) ?? { tag, scores: [], snaps: [] };
      row.scores.push(snap.score ?? 0);
      row.snaps.push(snap);
      tagMap.set(tag, row);
    }
  }
  const tagRows = [...tagMap.values()]
    .filter((row) => row.snaps.length >= 2)
    .map((row) => ({
      tag: row.tag,
      avgScore: avg(row.scores),
      count: row.snaps.length,
      topSnaps: row.snaps.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count)
    .slice(0, 12);

  const observed = tagRows
    .filter((row) => row.avgScore > 0)
    .slice(0, 5)
    .map((row) => summarizePattern(row.topSnaps, row.tag));

  const tryNext = [];
  if (scoredAll.length < 10) {
    tryNext.push('- **Keep broad exploration** — fewer than 10 scored snaps have signal. Prioritize varied mechanics and careful tagging.');
  }
  const topTags = tagRows.filter((row) => row.avgScore > 0).slice(0, 3).map((row) => row.tag);
  if (topTags.length) {
    tryNext.push(`- **Exploit winners lightly** — combine ${topTags.map((tag) => `\`${tag}\``).join(', ')} with one fresh mechanic so the feed does not feel repetitive.`);
  }
  const coldTags = tagRows.filter((row) => row.count >= 2 && row.avgScore === 0).slice(0, 3).map((row) => row.tag);
  if (coldTags.length) {
    tryNext.push(`- **De-emphasize cold tags for now** — ${coldTags.map((tag) => `\`${tag}\``).join(', ')} need either a sharper hook or a pause.`);
  }
  if (!tryNext.length) {
    tryNext.push('- **Bootstrap experiments** — no engagement signal yet. Try different components, themes, and CTAs until the refresh has enough data.');
  }

  const topRows = scoredRecent.slice(0, 10).map((snap, index) => {
    const stats = snap.stats ?? {};
    return `| ${index + 1} | ${mdEscape(snap.name)} | ${snap.score ?? 0} | ${stats.likes ?? 0} | ${stats.recasts ?? 0} | ${stats.replies ?? 0} | ${(snap.tags ?? []).map(mdEscape).join(', ')} |`;
  });

  const tagTable = tagRows.map((row) => `| ${mdEscape(row.tag)} | ${fmt(row.avgScore)} | ${row.count} |`);

  return `# Snap Insights

_Last updated: ${isoNow()}_

This file is generated from \`snap-engagement.json\` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

${topRows.length ? `| # | Snap | Score | Likes | Recasts | Replies | Tags |\n|---:|------|------:|------:|--------:|--------:|------|\n${topRows.join('\n')}` : '_(none yet — no scored snaps in the last 14 days)_'}

## Patterns observed

${observed.length ? observed.join('\n') : '_(not enough nonzero engagement yet to identify durable patterns)_'}

## Tag performance

${tagTable.length ? `| Tag | Avg Score | Count |\n|-----|----------:|------:|\n${tagTable.join('\n')}` : '| Tag | Avg Score | Count |\n|-----|----------:|------:|\n| _(no data yet)_ | | |'}

## What to try next

${tryNext.join('\n')}

## Scoring formula

\`${SCORE_FORMULA}\`

This rewards conversation and distribution more than passive likes.

## How this file gets updated

The daily SnapWizard engagement-refresh cron job:

1. Reads every entry in \`snap-engagement.json\`
2. Fetches fresh cast stats from Neynar for each \`cast_hash\`
3. Updates \`stats\`, \`score\`, and \`last_checked\`
4. Rewrites this file with top performers, observed patterns, and tag breakdowns
5. Commits and pushes the results with the Hermes SnapWizard git tool
`;
}

async function fetchCast(castHash) {
  const url = new URL(API_BASE);
  url.searchParams.set('identifier', castHash);
  url.searchParams.set('type', 'hash');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-api-key': NEYNAR_API_KEY,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Neynar ${response.status} for ${castHash}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

async function main() {
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is required to refresh SnapWizard engagement stats.');
  }

  const raw = await fs.readFile(ENGAGEMENT_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.snaps)) {
    throw new Error('snap-engagement.json must contain a top-level snaps array.');
  }

  const checkedAt = isoNow();
  let refreshed = 0;
  const failures = [];

  for (const snap of data.snaps) {
    if (!snap.cast_hash) continue;
    try {
      const payload = await fetchCast(snap.cast_hash);
      const stats = extractStats(payload);
      snap.stats = stats;
      snap.score = score(stats);
      snap.last_checked = checkedAt;
      refreshed += 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (error) {
      failures.push(`${snap.name ?? snap.cast_hash}: ${error.message}`);
    }
  }

  await fs.writeFile(ENGAGEMENT_PATH, `${JSON.stringify(data, null, 2)}\n`);
  await fs.writeFile(INSIGHTS_PATH, buildInsights(data));

  console.log(`Refreshed ${refreshed}/${data.snaps.length} snap engagement records.`);
  if (failures.length) {
    console.warn(`Failures (${failures.length}):`);
    for (const failure of failures.slice(0, 10)) console.warn(`- ${failure}`);
    if (failures.length > 10) console.warn(`- ...${failures.length - 10} more`);
  }

  if (refreshed === 0 && data.snaps.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
