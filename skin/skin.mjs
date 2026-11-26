// Redraws skin/header.svg and skin/stats.svg from public GitHub data, using the look in skin/config.json.
// Usage: SKIN_USER=<login> node skin/skin.mjs   (or: node skin/skin.mjs <login>)
import { readFile, writeFile } from "node:fs/promises";
import { TEMPLATES, THEMES, loadProfile, render } from "./render.mjs";

const login = process.env.SKIN_USER || process.argv[2];
if (!login) throw new Error("Set SKIN_USER (or pass a username): node skin/skin.mjs <username>");
const { template = "classic", theme = "github-dark" } = JSON.parse(await readFile(new URL("config.json", import.meta.url), "utf8"));
if (!TEMPLATES[template]) throw new Error(`Unknown template "${template}" in skin/config.json. Pick one of: ${Object.keys(TEMPLATES).join(", ")}`);
if (!THEMES[theme]) throw new Error(`Unknown theme "${theme}" in skin/config.json. Pick one of: ${Object.keys(THEMES).join(", ")}`);

// Fetch everything before writing anything, so a failed run keeps the previous images.
const d = await loadProfile(login, process.env.GITHUB_TOKEN);
for (const [file, svg] of Object.entries(render(d, template, theme))) await writeFile(new URL(file, import.meta.url), svg);
await writeFile(new URL("profile.json", import.meta.url), JSON.stringify(d, null, 2) + "\n"); // the builder previews with this
console.log(`Wrote skin/header.svg and skin/stats.svg for @${login} (${template}, ${theme})`);
