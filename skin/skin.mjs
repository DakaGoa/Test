// Renders animated profile-README SVGs (header + stats) from public GitHub data.
// Usage: SKIN_USER=<login> THEME=<theme> node skin/skin.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const theme = (bg, bg2, fg, muted, border, palette) => ({ bg, bg2, fg, muted, border, palette });
export const THEMES = {
  "github-dark": theme("#0d1117", "#161b22", "#e6edf3", "#8b949e", "#30363d", ["#58a6ff", "#3fb950", "#d29922", "#f778ba", "#a371f7"]),
  dracula: theme("#282a36", "#343746", "#f8f8f2", "#8c96c6", "#44475a", ["#bd93f9", "#ff79c6", "#50fa7b", "#f1fa8c", "#8be9fd"]),
  neon: theme("#0a0014", "#1a0033", "#f5f0ff", "#a491cc", "#3d1f66", ["#ff2bd6", "#00f0ff", "#b4ff00", "#ffb800", "#8a5cff"]),
  ocean: theme("#011627", "#0b2942", "#d6deeb", "#86a7c4", "#1d3b53", ["#82aaff", "#7fdbca", "#c792ea", "#ffcb8b", "#f78c6c"]),
  light: theme("#ffffff", "#f6f8fa", "#1f2328", "#59636e", "#d1d9e0", ["#0969da", "#1a7f37", "#9a6700", "#bf3989", "#8250df"]),
};

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const fmt = (v) => (typeof v !== "number" || v < 1000 ? String(v) : (v / 1000).toFixed(v < 10000 ? 1 : 0).replace(/\.0$/, "") + "k");
const rnd = (i, k) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1; // deterministic, so SVGs only change when data does
// Fade in after `delay` s; the base opacity stays 1, so viewers without SMIL still see everything.
const fadeIn = (delay, dur = 0.6) => `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${(delay / (delay + dur)).toFixed(3)};1" dur="${delay + dur}s"/>`;

export function summarize(user, repos) {
  const own = repos.filter((r) => !r.fork);
  const counts = {};
  for (const r of own) if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    login: user.login,
    name: user.name || user.login,
    bio: (user.bio || "").replace(/\s+/g, " ").trim(),
    location: user.location || "",
    stats: [
      ["Repos", user.public_repos],
      ["Stars", own.reduce((s, r) => s + r.stargazers_count, 0)],
      ["Followers", user.followers],
      ["Joined", String(new Date(user.created_at).getUTCFullYear())],
    ],
    languages: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, n]) => ({ name, pct: n / total })),
  };
}

export function header(d, t) {
  const tagline = clip(d.bio || `Hi, I'm @${d.login}`, 56);
  const step = 0.07, cw = 13.2; // seconds per typed char; width of a 22px monospace char
  const widths = [...Array(tagline.length + 1).keys()].map((i) => +(i * cw).toFixed(1));
  const typed = [...widths, ...Array(Math.ceil(3 / step)).fill(widths.at(-1))]; // type, then hold ~3s, then loop
  const typeAnim = (attr, offset) =>
    `<animate attributeName="${attr}" values="${typed.map((w) => w + offset).join(";")}" dur="${(typed.length * step).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`;
  const meta = [`@${d.login}`, d.location].filter(Boolean).join("  ·  ");

  const dots = Array.from({ length: 22 }, (_, i) => {
    const dur = (6 + rnd(i, 3) * 8).toFixed(1);
    return `<circle cx="${(rnd(i, 1) * 1200).toFixed(0)}" cy="310" r="${(1 + rnd(i, 2) * 2.5).toFixed(1)}" fill="${t.palette[i % 5]}">
      <animate attributeName="cy" values="310;-10" dur="${dur}s" begin="-${(rnd(i, 4) * dur).toFixed(1)}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;.7;0" dur="${dur}s" begin="-${(rnd(i, 4) * dur).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
  }).join("\n    ");

  const tiles = [];
  for (let c = 0; c < 14; c++)
    for (let r = 0; r < 7; r++) {
      const level = rnd(c * 7 + r, 5);
      if (level < 0.25) continue;
      tiles.push(`<rect x="${830 + c * 22}" y="${73 + r * 22}" width="16" height="16" rx="4" fill="${t.palette[Math.floor(level * 4) % 5]}" opacity="${(level * 0.6).toFixed(2)}">
      <animate attributeName="opacity" values="${(level * 0.6).toFixed(2)};${Math.min(1, level + 0.3).toFixed(2)};${(level * 0.6).toFixed(2)}" dur="3s" begin="${(c * 0.12).toFixed(2)}s" repeatCount="indefinite"/></rect>`);
    }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300" role="img" aria-label="${esc(d.name)}: ${esc(tagline)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
    <linearGradient id="ink" x1="0" x2="1"><stop offset="0" stop-color="${t.palette[0]}"/><stop offset="1" stop-color="${t.palette[1]}"/></linearGradient>
    <clipPath id="frame"><rect width="1200" height="300" rx="18"/></clipPath>
    <clipPath id="type"><rect x="80" y="168" height="40" width="${widths.at(-1)}">${typeAnim("width", 0)}</rect></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="1200" height="300" fill="url(#bg)"/>
    ${dots}
    <g>${fadeIn(0.4, 1)}
    ${tiles.join("\n    ")}
    </g>
  </g>
  <rect x=".5" y=".5" width="1199" height="299" rx="18" fill="none" stroke="${t.border}"/>
  <text x="80" y="135" font-family="${SANS}" font-size="64" font-weight="800" fill="url(#ink)">${fadeIn(0)}${esc(clip(d.name, 22))}</text>
  <text x="80" y="196" font-family="${MONO}" font-size="22" fill="${t.fg}" clip-path="url(#type)">${esc(tagline)}</text>
  <rect x="${80 + widths.at(-1)}" y="176" width="3" height="26" fill="${t.palette[0]}">${typeAnim("x", 82)}
    <animate attributeName="opacity" values="1;1;0;0" dur="1s" repeatCount="indefinite"/></rect>
  <text x="80" y="248" font-family="${SANS}" font-size="18" fill="${t.muted}">${fadeIn(0.8)}${esc(meta)}</text>
</svg>
`;
}

export function stats(d, t) {
  const cells = d.stats
    .map(([label, value], i) => `<g>${fadeIn(0.15 * i)}
    <text x="${40 + i * 135}" y="128" font-family="${SANS}" font-size="40" font-weight="700" fill="${t.fg}">${esc(fmt(value))}</text>
    <text x="${40 + i * 135}" y="158" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(label)}</text></g>`)
    .join("\n  ");

  let x = 620;
  const bar = d.languages
    .map((l, i) => {
      const w = +(l.pct * 540).toFixed(1);
      const seg = `<rect x="${x}" y="80" width="${w}" height="12" fill="${t.palette[i]}"><animate attributeName="width" values="0;${w}" dur="1s" begin="${(0.2 * i).toFixed(1)}s" fill="freeze"/></rect>`;
      x += w;
      return seg;
    })
    .join("\n    ");
  const legend = d.languages
    .map((l, i) => {
      const lx = 620 + (i % 3) * 180, ly = 135 + Math.floor(i / 3) * 34;
      return `<g>${fadeIn(0.3 + 0.1 * i)}<circle cx="${lx + 6}" cy="${ly - 5}" r="6" fill="${t.palette[i]}"/>
    <text x="${lx + 20}" y="${ly}" font-family="${SANS}" font-size="15" fill="${t.fg}">${esc(clip(l.name, 14))} <tspan fill="${t.muted}">${Math.round(l.pct * 100)}%</tspan></text></g>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="220" viewBox="0 0 1200 220" role="img" aria-label="GitHub stats for @${esc(d.login)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
    <clipPath id="track"><rect x="620" y="80" width="540" height="12" rx="6"/></clipPath>
  </defs>
  <rect x=".5" y=".5" width="1199" height="219" rx="18" fill="url(#bg)" stroke="${t.border}"/>
  <text x="40" y="58" font-family="${SANS}" font-size="18" font-weight="600" fill="${t.palette[0]}">GitHub stats</text>
  ${cells}
  <line x1="580" y1="36" x2="580" y2="184" stroke="${t.border}"/>
  <text x="620" y="58" font-family="${SANS}" font-size="18" font-weight="600" fill="${t.palette[0]}">Top languages <tspan fill="${t.muted}" font-weight="400" font-size="14">by repo</tspan></text>
  <g clip-path="url(#track)">
    <rect x="620" y="80" width="540" height="12" fill="${t.border}"/>
    ${bar}
  </g>
  ${legend || `<text x="620" y="140" font-family="${SANS}" font-size="15" fill="${t.muted}">No public code yet</text>`}
</svg>
`;
}

async function gh(path) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "readme-skin", ...(token && { authorization: `Bearer ${token}` }) },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const login = process.env.SKIN_USER || process.argv[2];
  const name = process.env.THEME || "github-dark";
  if (!login) throw new Error("Set SKIN_USER (or pass a username): node skin/skin.mjs <username>");
  if (!THEMES[name]) throw new Error(`Unknown THEME "${name}". Pick one of: ${Object.keys(THEMES).join(", ")}`);

  const user = await gh(`/users/${encodeURIComponent(login)}`);
  const repos = [];
  // shortcut: stops at 1000 repos, raise the page cap if a profile ever has more
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(`/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  // Write only after every fetch succeeded, so a failed run keeps the previous images.
  const d = summarize(user, repos);
  await writeFile(new URL("header.svg", import.meta.url), header(d, THEMES[name]));
  await writeFile(new URL("stats.svg", import.meta.url), stats(d, THEMES[name]));
  console.log(`Wrote skin/header.svg and skin/stats.svg for @${login} (${name})`);
}
