// Shared by the CLI (skin/skin.mjs) and the builder page (index.html): loading data, templates and themes.

const theme = (bg, bg2, fg, muted, border, palette) => ({ bg, bg2, fg, muted, border, palette });
export const THEMES = {
  "github-dark": theme("#0d1117", "#161b22", "#e6edf3", "#8b949e", "#30363d", ["#58a6ff", "#3fb950", "#d29922", "#f778ba", "#a371f7"]),
  dracula: theme("#282a36", "#343746", "#f8f8f2", "#8c96c6", "#44475a", ["#bd93f9", "#ff79c6", "#50fa7b", "#f1fa8c", "#8be9fd"]),
  neon: theme("#0a0014", "#1a0033", "#f5f0ff", "#a491cc", "#3d1f66", ["#ff2bd6", "#00f0ff", "#b4ff00", "#ffb800", "#8a5cff"]),
  ocean: theme("#011627", "#0b2942", "#d6deeb", "#86a7c4", "#1d3b53", ["#82aaff", "#7fdbca", "#c792ea", "#ffcb8b", "#f78c6c"]),
  light: theme("#ffffff", "#f6f8fa", "#1f2328", "#59636e", "#d1d9e0", ["#0969da", "#1a7f37", "#9a6700", "#bf3989", "#8250df"]),
  midnight: theme("#05070f", "#0d1326", "#e5ecff", "#8a97bd", "#1f2a4a", ["#7aa2ff", "#a78bfa", "#38bdf8", "#f472b6", "#facc15"]),
  aurora: theme("#071a1f", "#0d1f33", "#e6fbff", "#8fb8c4", "#1c3d4a", ["#4ade80", "#22d3ee", "#a78bfa", "#f0abfc", "#fde047"]),
  sunset: theme("#1a0f14", "#2a1520", "#ffeef0", "#c49aa6", "#4a2a36", ["#ff7a59", "#ffc15e", "#ff4f8b", "#c084fc", "#5eead4"]),
  forest: theme("#0f1a14", "#16251c", "#e6f2e9", "#8fb39b", "#2a4034", ["#6ee7a0", "#c3e88d", "#f2c14e", "#7dd3fc", "#f78c6c"]),
  phosphor: theme("#000a03", "#031a0a", "#c8ffd4", "#6fbf84", "#0f3a1c", ["#00ff66", "#7dffa8", "#39ff14", "#00c853", "#b2ff59"]),
  mono: theme("#111111", "#1b1b1b", "#f2f2f2", "#9a9a9a", "#333333", ["#ffffff", "#bdbdbd", "#8c8c8c", "#d9d9d9", "#6b6b6b"]),
  paper: theme("#faf7f2", "#f1ebe1", "#2b2622", "#6e6359", "#ddd3c5", ["#c2410c", "#0f766e", "#7c3aed", "#b45309", "#be185d"]),
  rose: theme("#fff5f7", "#ffe9ee", "#3b1f2b", "#8a5a6b", "#f5c6d3", ["#c8175f", "#9333ea", "#ea580c", "#0e7490", "#15803d"]),
};

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

export async function loadProfile(login, token) {
  const get = async (path) => {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        accept: "application/vnd.github+json",
        ...(!globalThis.document && { "user-agent": "readme-skin" }), // browsers send their own
        ...(token && { authorization: `Bearer ${token}` }),
      },
    });
    if (res.status === 404) throw new Error(`No GitHub user named "${login}".`);
    if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };
  const u = encodeURIComponent(login);
  const user = await get(`/users/${u}`);
  const repos = [];
  // shortcut: stops at 1000 repos, raise the page cap if a profile ever has more
  for (let page = 1; page <= 10; page++) {
    const batch = await get(`/users/${u}/repos?per_page=100&type=owner&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return summarize(user, repos);
}

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const fmt = (v) => (typeof v !== "number" || v < 1000 ? String(v) : (v / 1000).toFixed(v < 10000 ? 1 : 0).replace(/\.0$/, "") + "k");
const rnd = (i, k) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1; // deterministic, so SVGs only change when data does
// Animate attr from→to after `delay` s. The delay lives in keyTimes (not `begin`), so nothing shows its
// final state before starting; the base attribute is the final value, so viewers without SMIL still see it.
const enter = (attr, from, to, delay, dur = 0.6) =>
  `<animate attributeName="${attr}" values="${from};${from};${to}" keyTimes="0;${(delay / (delay + dur)).toFixed(3)};1" dur="${(delay + dur).toFixed(2)}s"/>`;
const fadeIn = (delay, dur) => enter("opacity", 0, 1, delay, dur);

const open = (w, h, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">`;
const grads = (t) => `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
    <linearGradient id="ink" x1="0" x2="1"><stop offset="0" stop-color="${t.palette[0]}"/><stop offset="1" stop-color="${t.palette[1]}"/></linearGradient>`;
const tagline = (d, n = 56) => clip(d.bio || `Hi, I'm @${d.login}`, n);
const meta = (d) => [`@${d.login}`, d.location].filter(Boolean).join("  ·  ");

// Monospace text that types itself out, holds ~3s and loops, after `wait` s of blank cursor.
// shortcut: assumes 0.6em-wide glyphs, so emoji or CJK bios get cut off; measure the text if that matters
function typed(text, { x, y, size = 22, fill, cursor, wait = 0 }) {
  const step = 0.07, cw = size * 0.6;
  const widths = [...Array(text.length + 1).keys()].map((i) => +(i * cw).toFixed(1));
  const full = widths.at(-1);
  const frames = [...Array(Math.round(wait / step)).fill(0), ...widths, ...Array(Math.ceil(3 / step)).fill(full)];
  const anim = (attr, offset) =>
    `<animate attributeName="${attr}" values="${frames.map((w) => +(w + offset).toFixed(1)).join(";")}" dur="${(frames.length * step).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`;
  return `<clipPath id="type"><rect x="${x}" y="${y - size * 1.3}" height="${size * 1.8}" width="${full}">${anim("width", 0)}</rect></clipPath>
  <text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${fill}" clip-path="url(#type)">${esc(text)}</text>
  <rect x="${x + full + 2}" y="${(y - size * 0.9).toFixed(1)}" width="3" height="${(size * 1.2).toFixed(1)}" fill="${cursor}">${anim("x", x + 2)}
    <animate attributeName="opacity" values="1;1;0;0" dur="1s" repeatCount="indefinite"/></rect>`;
}

function classicHeader(d, t) {
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

  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>
    ${grads(t)}
    <clipPath id="frame"><rect width="1200" height="300" rx="18"/></clipPath>
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
  ${typed(tagline(d), { x: 80, y: 196, fill: t.fg, cursor: t.palette[0] })}
  <text x="80" y="248" font-family="${SANS}" font-size="18" fill="${t.muted}">${fadeIn(0.8)}${esc(meta(d))}</text>
</svg>
`;
}

function cardStats(d, t) {
  const cells = d.stats
    .map(([label, value], i) => `<g>${fadeIn(0.15 * i)}
    <text x="${40 + i * 135}" y="128" font-family="${SANS}" font-size="40" font-weight="700" fill="${t.fg}">${esc(fmt(value))}</text>
    <text x="${40 + i * 135}" y="158" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(label)}</text></g>`)
    .join("\n  ");

  let x = 620;
  const bar = d.languages
    .map((l, i) => {
      const w = +(l.pct * 540).toFixed(1);
      const seg = `<rect x="${x}" y="80" width="${w}" height="12" fill="${t.palette[i]}">${enter("width", 0, w, 0.2 * i, 1)}</rect>`;
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

  return `${open(1200, 220, `GitHub stats for @${d.login}`)}
  <defs>
    ${grads(t)}
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

const chrome = (t, w, h, title) => `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="14" fill="url(#bg)" stroke="${t.border}"/>
  <line x1="1" y1="44" x2="${w - 1}" y2="44" stroke="${t.border}"/>
  ${[3, 2, 1].map((c, i) => `<circle cx="${28 + i * 22}" cy="22" r="6" fill="${t.palette[c]}"/>`).join("")}
  <text x="${w / 2}" y="27" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${t.muted}">${esc(title)}</text>`;
const prompt = (t, y, cmd, delay) =>
  `<text x="40" y="${y}" font-family="${MONO}" font-size="20" fill="${t.fg}">${fadeIn(delay)}<tspan fill="${t.palette[1]}">❯</tspan> ${esc(cmd)}</text>`;

function terminalHeader(d, t) {
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>${grads(t)}</defs>
  ${chrome(t, 1200, 300, meta(d))}
  ${prompt(t, 90, "whoami", 0)}
  <text x="40" y="132" font-family="${MONO}" font-size="30" font-weight="700" fill="${t.palette[0]}">${fadeIn(0.4)}${esc(clip(d.name, 40))}</text>
  ${prompt(t, 182, "cat about.txt", 0.8)}
  ${typed(tagline(d, 70), { x: 40, y: 222, size: 20, fill: t.fg, cursor: t.palette[0], wait: 1.2 })}
</svg>
`;
}

function terminalStats(d, t) {
  const rows = d.stats
    .map(([label, value], i) => `<g>${fadeIn(0.3 + 0.12 * i)}
    <text x="40" y="${122 + i * 30}" font-family="${MONO}" font-size="18" fill="${t.muted}">${esc(label.toLowerCase())}</text>
    <text x="190" y="${122 + i * 30}" font-family="${MONO}" font-size="18" font-weight="700" fill="${t.fg}">${esc(fmt(value))}</text></g>`)
    .join("\n  ");
  const langs = d.languages
    .map((l, i) => {
      const y = 122 + i * 24, filled = Math.round(l.pct * 20);
      const blocks = Array.from({ length: 20 }, (_, b) => `<rect x="${760 + b * 11}" y="${y - 13}" width="9" height="14" fill="${b < filled ? t.palette[i] : t.border}"/>`).join("");
      return `<g>${fadeIn(0.5 + 0.12 * i)}
    <text x="600" y="${y}" font-family="${MONO}" font-size="18" fill="${t.fg}">${esc(clip(l.name, 13))}</text>${blocks}
    <text x="1000" y="${y}" font-family="${MONO}" font-size="18" fill="${t.muted}">${Math.round(l.pct * 100)}%</text></g>`;
    })
    .join("\n  ");

  return `${open(1200, 240, `GitHub stats for @${d.login}`)}
  <defs>${grads(t)}</defs>
  ${chrome(t, 1200, 240, "skin stats")}
  ${prompt(t, 82, `skin stats --user ${d.login}`, 0)}
  ${rows}
  <line x1="560" y1="104" x2="560" y2="216" stroke="${t.border}" stroke-dasharray="3 5"/>
  ${langs || `<text x="600" y="122" font-family="${MONO}" font-size="18" fill="${t.muted}">no public code yet</text>`}
</svg>
`;
}

function orbitHeader(d, t) {
  const cx = 1010, cy = 150;
  const stars = Array.from({ length: 45 }, (_, i) => {
    const dur = 2 + rnd(i, 3) * 4;
    return `<circle cx="${(rnd(i, 1) * 1200).toFixed(0)}" cy="${(rnd(i, 2) * 300).toFixed(0)}" r="${(0.6 + rnd(i, 5) * 1.2).toFixed(1)}" fill="${t.fg}">
      <animate attributeName="opacity" values=".15;.8;.15" dur="${dur.toFixed(1)}s" begin="-${(rnd(i, 4) * dur).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
  }).join("\n    ");
  // Planets are the top languages, colored like the stats legend; a profile with no code gets three plain ones.
  const bodies = d.languages.length ? d.languages : [{ pct: 0.3 }, { pct: 0.2 }, { pct: 0.1 }];
  const planets = bodies
    .map((l, i) => {
      const r = 44 + i * 22, a = Math.round(rnd(i, 6) * 360);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-dasharray="2 6"/>
    <g transform="rotate(${a} ${cx} ${cy})"><animateTransform attributeName="transform" type="rotate" from="${a} ${cx} ${cy}" to="${a + 360} ${cx} ${cy}" dur="${9 + i * 5}s" repeatCount="indefinite"/>
      <circle cx="${cx + r}" cy="${cy}" r="${(4 + l.pct * 10).toFixed(1)}" fill="${t.palette[i]}"/></g>`;
    })
    .join("\n    ");

  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>
    ${grads(t)}
    <radialGradient id="glow"><stop offset="0" stop-color="${t.palette[0]}" stop-opacity=".55"/><stop offset="1" stop-color="${t.palette[0]}" stop-opacity="0"/></radialGradient>
    <clipPath id="frame"><rect width="1200" height="300" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="1200" height="300" fill="url(#bg)"/>
    ${stars}
    ${planets}
    <circle cx="${cx}" cy="${cy}" r="34" fill="url(#glow)"><animate attributeName="r" values="30;40;30" dur="4s" repeatCount="indefinite"/></circle>
    <circle cx="${cx}" cy="${cy}" r="13" fill="${t.palette[0]}"/>
  </g>
  <rect x=".5" y=".5" width="1199" height="299" rx="18" fill="none" stroke="${t.border}"/>
  <text x="72" y="128" font-family="${SANS}" font-size="58" font-weight="800" fill="url(#ink)">${fadeIn(0)}${esc(clip(d.name, 22))}</text>
  ${typed(tagline(d), { x: 72, y: 186, size: 20, fill: t.fg, cursor: t.palette[0], wait: 0.6 })}
  <text x="72" y="238" font-family="${SANS}" font-size="18" fill="${t.muted}">${fadeIn(0.8)}${esc(meta(d))}</text>
</svg>
`;
}

function minimalHeader(d, t) {
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <rect x=".5" y=".5" width="1199" height="299" rx="18" fill="${t.bg}" stroke="${t.border}"/>
  <text x="80" y="128" font-family="${SANS}" font-size="60" font-weight="300" letter-spacing="-1" fill="${t.fg}">${fadeIn(0)}${esc(clip(d.name, 26))}</text>
  <line x1="82" y1="160" x2="202" y2="160" stroke="${t.palette[0]}" stroke-width="4" stroke-dasharray="120" stroke-dashoffset="0">${enter("stroke-dashoffset", 120, 0, 0.3, 0.9)}</line>
  <text x="80" y="212" font-family="${SANS}" font-size="22" fill="${t.fg}">${fadeIn(0.6)}${esc(tagline(d, 70))}</text>
  <text x="80" y="252" font-family="${SANS}" font-size="17" fill="${t.muted}">${fadeIn(0.9)}${esc(meta(d))}</text>
</svg>
`;
}

// Full-bleed header: clips `body` to the rounded frame and draws the border on top.
const framed = (t, body, fill = "url(#bg)") => `<clipPath id="frame"><rect width="1200" height="300" rx="18"/></clipPath>
  <g clip-path="url(#frame)">
    <rect width="1200" height="300" fill="${fill}"/>
    ${body}
  </g>
  <rect x=".5" y=".5" width="1199" height="299" rx="18" fill="none" stroke="${t.border}"/>`;
const title = (d, x, y, size, { fill = "url(#ink)", anchor = "start", max = 22, weight = 800 } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}">${fadeIn(0)}${esc(clip(d.name, max))}</text>`;
const metaLine = (d, t, x, y, anchor = "start", fill = t.muted) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${SANS}" font-size="18" fill="${fill}">${fadeIn(0.8)}${esc(meta(d))}</text>`;
const joined = (d) => d.stats.find(([label]) => label === "Joined")?.[1] ?? "";

function waveHeader(d, t) {
  const waves = [0, 1, 2]
    .map((i) => {
      const y = 228 + i * 20, amp = 16 - i * 3;
      let path = `M0 ${y}`;
      for (let x = 0; x < 1800; x += 300) path += ` q75 ${-amp} 150 0 t150 0`; // one crest + trough per 300px, so a -300 shift loops
      return `<path d="${path} V300 H0Z" fill="${t.palette[i]}" opacity="${(0.25 + i * 0.12).toFixed(2)}">
      <animateTransform attributeName="transform" type="translate" values="0 0;-300 0" dur="${7 - i * 2}s" repeatCount="indefinite"/></path>`;
    })
    .join("\n    ");
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>${grads(t)}</defs>
  ${framed(t, waves)}
  ${title(d, 80, 112, 60)}
  ${typed(tagline(d), { x: 80, y: 160, fill: t.fg, cursor: t.palette[0] })}
  ${metaLine(d, t, 80, 196)}
</svg>
`;
}

function glowHeader(d, t) {
  const flicker = `<animate attributeName="opacity" values="1;1;.35;1;.8;1;1" keyTimes="0;.55;.57;.6;.62;.64;1" dur="5s" repeatCount="indefinite"/>`;
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>
    ${grads(t)}
    <filter id="glow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${framed(t, "", t.bg)}
  <rect x="36" y="30" width="1128" height="240" rx="26" fill="none" stroke="${t.palette[2]}" stroke-width="2" opacity=".75" filter="url(#glow)"/>
  <text x="600" y="148" text-anchor="middle" font-family="${SANS}" font-size="72" font-weight="700" fill="none" stroke="${t.palette[0]}" stroke-width="2.5" filter="url(#glow)">${flicker}${esc(clip(d.name, 24))}</text>
  <text x="600" y="202" text-anchor="middle" font-family="${SANS}" font-size="24" fill="${t.palette[1]}" filter="url(#glow)">${fadeIn(0.6, 1)}${esc(tagline(d, 60))}</text>
  ${metaLine(d, t, 600, 246, "middle")}
</svg>
`;
}

function horizonHeader(d, t) {
  const vx = 900, hy = 196; // vanishing point x, horizon y
  const stripes = [0, 1, 2, 3, 4].map((i) => `<rect x="800" y="${158 + i * 9}" width="200" height="${(1 + i * 1.2).toFixed(1)}" fill="black"/>`).join("");
  const fan = Array.from({ length: 17 }, (_, i) => `<line x1="${vx}" y1="${hy}" x2="${vx + (i - 8) * 170}" y2="300"/>`).join("");
  const move = (attr, i) =>
    `<animate attributeName="${attr}" values="${hy};300" keyTimes="0;1" keySplines=".6 0 1 1" calcMode="spline" dur="3s" begin="-${(i * 0.5).toFixed(1)}s" repeatCount="indefinite"/>`;
  const rows = Array.from({ length: 6 }, (_, i) => `<line x1="0" x2="1200" y1="${hy}" y2="${hy}">${move("y1", i)}${move("y2", i)}</line>`).join("");
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>
    ${grads(t)}
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.palette[3]}"/><stop offset="1" stop-color="${t.palette[0]}"/></linearGradient>
    <mask id="cut"><rect width="1200" height="300" fill="white"/>${stripes}</mask>
  </defs>
  ${framed(t, `<circle cx="${vx}" cy="150" r="78" fill="url(#sun)" mask="url(#cut)"/>
    <rect y="${hy}" width="1200" height="${300 - hy}" fill="${t.bg}"/>
    <g stroke="${t.palette[1]}" stroke-width="1.5" opacity=".55">${fan}${rows}</g>
    <line x1="0" x2="1200" y1="${hy}" y2="${hy}" stroke="${t.palette[0]}" stroke-width="2"/>`)}
  ${title(d, 72, 104, 58, { max: 20 })}
  ${typed(tagline(d, 50), { x: 72, y: 148, size: 20, fill: t.fg, cursor: t.palette[0] })}
  ${metaLine(d, t, 72, 180)}
</svg>
`;
}

function blueprintHeader(d, t) {
  const cells = [["DRAWN BY", `@${d.login}`], ["LOCATION", d.location || "—"], ["SINCE", joined(d)], ["SHEET", "1 / 1"]];
  const block = cells
    .map(([k, v], i) => {
      const x = 860 + (i % 2) * 150, y = 196 + Math.floor(i / 2) * 38;
      return `<rect x="${x}" y="${y}" width="150" height="38" fill="none" stroke="${t.palette[0]}" stroke-opacity=".6"/>
  <text x="${x + 8}" y="${y + 13}" font-family="${MONO}" font-size="9" letter-spacing="1" fill="${t.muted}">${k}</text>
  <text x="${x + 8}" y="${y + 30}" font-family="${MONO}" font-size="14" fill="${t.fg}">${esc(clip(String(v), 16))}</text>`;
    })
    .join("\n  ");
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>
    ${grads(t)}
    <pattern id="minor" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="${t.border}"/></pattern>
    <pattern id="major" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#minor)"/><path d="M100 0H0V100" fill="none" stroke="${t.palette[0]}" stroke-opacity=".3"/></pattern>
  </defs>
  ${framed(t, `<rect width="1200" height="300" fill="url(#major)"/>`, t.bg)}
  ${title(d, 80, 118, 56, { fill: t.fg, weight: 600 })}
  <g stroke="${t.palette[0]}" stroke-width="1.5">
    <line x1="80" y1="146" x2="560" y2="146" stroke-dasharray="480">${enter("stroke-dashoffset", 480, 0, 0.3, 1)}</line>
    <line x1="80" y1="138" x2="80" y2="154"/><line x1="560" y1="138" x2="560" y2="154"/>
  </g>
  <text x="320" y="168" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.palette[0]}">fig. 1 — profile of @${esc(d.login)}</text>
  ${typed(tagline(d), { x: 80, y: 222, size: 20, fill: t.fg, cursor: t.palette[0], wait: 1 })}
  <g transform="translate(1010 96)" stroke="${t.palette[0]}" fill="none">
    <circle r="52" stroke-dasharray="4 6"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="60s" repeatCount="indefinite"/></circle>
    <circle r="36" stroke-opacity=".5"/><line x1="-62" x2="62"/><line y1="-62" y2="62"/>
  </g>
  <text x="1010" y="30" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.palette[0]}">N</text>
  ${block}
</svg>
`;
}

function equalizerHeader(d, t) {
  const bars = Array.from({ length: 30 }, (_, i) => {
    const hs = [0, 1, 2, 3, 4].map((k) => Math.round(20 + rnd(i, k + 7) * 150)), loop = [...hs, hs[0]];
    const dur = (1.6 + rnd(i, 13) * 1.2).toFixed(2);
    return `<rect x="${650 + i * 17}" y="${240 - hs[0]}" width="11" height="${hs[0]}" rx="2" fill="url(#eq)">
      <animate attributeName="height" values="${loop.join(";")}" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="y" values="${loop.map((h) => 240 - h).join(";")}" dur="${dur}s" repeatCount="indefinite"/></rect>`;
  }).join("\n    ");
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>
    ${grads(t)}
    <linearGradient id="eq" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${t.palette[0]}"/><stop offset="1" stop-color="${t.palette[1]}"/></linearGradient>
  </defs>
  ${framed(t, `${bars}
    <line x1="650" y1="244" x2="1161" y2="244" stroke="${t.border}" stroke-width="2"/>`)}
  ${title(d, 72, 118, 56, { max: 17 })}
  ${typed(tagline(d, 46), { x: 72, y: 166, size: 20, fill: t.fg, cursor: t.palette[0] })}
  ${metaLine(d, t, 72, 210)}
</svg>
`;
}

function idcardHeader(d, t) {
  const initials = (d.name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join("") || d.login[0] || "?").toUpperCase();
  const seed = d.login || "skin";
  const code = [];
  for (let i = 0, x = 990; x < 1150; i++) {
    const w = 1 + ((seed.charCodeAt(i % seed.length) + i) % 4); // barcode drawn from the username, so it is stable
    code.push(`<rect x="${x}" y="214" width="${w}" height="46"/>`);
    x += w + 2 + (i % 3);
  }
  const field = (label, value, x, y, delay) => `<g>${fadeIn(delay)}
    <text x="${x}" y="${y}" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${t.muted}">${label}</text>
    <text x="${x}" y="${y + 30}" font-family="${SANS}" font-size="24" font-weight="600" fill="${t.fg}">${esc(clip(String(value), 18))}</text></g>`;
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>${grads(t)}</defs>
  ${framed(t, "")}
  <circle cx="170" cy="150" r="74" fill="${t.bg2}" stroke="${t.border}"/>
  <circle cx="170" cy="150" r="86" fill="none" stroke="${t.palette[0]}" stroke-width="2" stroke-dasharray="6 10">
    <animateTransform attributeName="transform" type="rotate" values="0 170 150;360 170 150" dur="24s" repeatCount="indefinite"/></circle>
  <text x="170" y="170" text-anchor="middle" font-family="${SANS}" font-size="56" font-weight="800" fill="url(#ink)">${esc(initials)}</text>
  <rect x="1010" y="36" width="150" height="30" rx="15" fill="none" stroke="${t.palette[0]}"/>
  <text x="1085" y="56" text-anchor="middle" font-family="${MONO}" font-size="12" letter-spacing="3" fill="${t.palette[0]}">DEVELOPER</text>
  <g>${fadeIn(0)}
    <text x="300" y="70" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${t.muted}">NAME</text>
    <text x="300" y="106" font-family="${SANS}" font-size="36" font-weight="700" fill="${t.fg}">${esc(clip(d.name, 30))}</text></g>
  ${field("HANDLE", `@${d.login}`, 300, 148, 0.3)}
  ${field("BASED IN", d.location || "—", 560, 148, 0.45)}
  ${field("SINCE", joined(d), 800, 148, 0.6)}
  ${typed(tagline(d, 50), { x: 300, y: 252, size: 18, fill: t.fg, cursor: t.palette[0], wait: 1 })}
  <g fill="${t.fg}" opacity=".7">${code.join("")}</g>
</svg>
`;
}

function lavaHeader(d, t) {
  const blobs = t.palette
    .map((c, i) => {
      const pts = [0, 1, 2, 3].map((k) => [Math.round(100 + rnd(i, k + 20) * 1000), Math.round(30 + rnd(i, k + 30) * 240)]), loop = [...pts, pts[0]];
      const dur = 14 + i * 3;
      return `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="${Math.round(90 + rnd(i, 40) * 70)}" fill="${c}" opacity=".55">
      <animate attributeName="cx" values="${loop.map((p) => p[0]).join(";")}" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${loop.map((p) => p[1]).join(";")}" dur="${dur}s" repeatCount="indefinite"/></circle>`;
    })
    .join("\n    ");
  const line = tagline(d);
  return `${open(1200, 300, `${d.name}: ${line}`)}
  <defs>
    ${grads(t)}
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>
  </defs>
  ${framed(t, `<g filter="url(#blur)">${blobs}</g>`, t.bg)}
  ${title(d, 600, 140, 64, { fill: t.fg, anchor: "middle", max: 26 })}
  ${typed(line, { x: Math.round(600 - line.length * 6.6), y: 192, fill: t.fg, cursor: t.palette[0], wait: 0.6 })}
  ${metaLine(d, t, 600, 240, "middle", t.fg) /* muted text gets lost over the bright blobs */}
</svg>
`;
}

function tickerHeader(d, t) {
  const cw = 10.8; // 18px monospace
  const items = [
    ...d.stats.map(([label, value]) => [label.toUpperCase(), fmt(value), t.fg]),
    ...d.languages.map((l, i) => [clip(l.name, 14), `${Math.round(l.pct * 100)}%`, t.palette[i]]),
  ];
  const unit = items
    .map(([label, value, color]) => `<tspan dx="24" fill="${t.muted}">${esc(label)}</tspan><tspan dx="10" fill="${color}" font-weight="700">${esc(value)}</tspan><tspan dx="24" fill="${t.border}">•</tspan>`)
    .join("");
  const unitW = items.reduce((w, [label, value]) => w + (label.length + value.length + 1) * cw + 58, 0);
  const copies = Math.ceil(2400 / unitW); // enough copies that a one-unit shift loops without a gap
  return `${open(1200, 300, `${d.name}: ${tagline(d)}`)}
  <defs>${grads(t)}</defs>
  ${framed(t, `<rect y="206" width="1200" height="58" fill="${t.bg2}"/>
    <line x1="0" x2="1200" y1="206" y2="206" stroke="${t.border}"/><line x1="0" x2="1200" y1="264" y2="264" stroke="${t.border}"/>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;-${unitW.toFixed(1)} 0" dur="${(unitW / 60).toFixed(1)}s" repeatCount="indefinite"/>
      <text x="120" y="241" font-family="${MONO}" font-size="18">${unit.repeat(copies)}</text></g>
    <rect y="206" width="120" height="58" fill="${t.palette[0]}"/>
    <text x="60" y="241" text-anchor="middle" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="2" fill="${t.bg}">STATS</text>`)}
  ${title(d, 72, 104, 60)}
  ${typed(tagline(d), { x: 72, y: 150, fill: t.fg, cursor: t.palette[0] })}
  ${metaLine(d, t, 72, 186)}
</svg>
`;
}

export const TEMPLATES = {
  classic: { label: "Classic", about: "Gradient name, typed tagline, pulsing tiles", header: classicHeader, stats: cardStats },
  terminal: { label: "Terminal", about: "Your profile as a shell session", header: terminalHeader, stats: terminalStats },
  orbit: { label: "Orbit", about: "Top languages circling a star", header: orbitHeader, stats: cardStats },
  minimal: { label: "Minimal", about: "Light type and one drawn line", header: minimalHeader, stats: cardStats },
  wave: { label: "Wave", about: "Layered waves rolling under your name", header: waveHeader, stats: cardStats },
  glow: { label: "Glow", about: "Your name as a flickering neon sign", header: glowHeader, stats: cardStats },
  horizon: { label: "Horizon", about: "Striped sun over a moving grid", header: horizonHeader, stats: cardStats },
  blueprint: { label: "Blueprint", about: "Drafting grid with a title block", header: blueprintHeader, stats: cardStats },
  equalizer: { label: "Equalizer", about: "Audio bars bouncing beside your name", header: equalizerHeader, stats: cardStats },
  idcard: { label: "ID Card", about: "Monogram, labelled fields and a barcode", header: idcardHeader, stats: cardStats },
  lava: { label: "Lava", about: "Soft colour blobs drifting behind", header: lavaHeader, stats: cardStats },
  ticker: { label: "Ticker", about: "Your stats scrolling like a market feed", header: tickerHeader, stats: cardStats },
};

// Every template draws the same two files, so README.md stays the same whichever one is picked.
export const render = (d, template, themeName) => ({
  "header.svg": TEMPLATES[template].header(d, THEMES[themeName]),
  "stats.svg": TEMPLATES[template].stats(d, THEMES[themeName]),
});
