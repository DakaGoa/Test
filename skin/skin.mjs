// Draws every template × theme from public GitHub data into skin/out/<template>-<theme>-{header,stats}.svg.
// The builder's Activate button points the profile README at one of them, so switching needs no rebuild.
// Usage: SKIN_USER=<login> node skin/skin.mjs   (or: node skin/skin.mjs <login>)
import { mkdir, writeFile } from "node:fs/promises";
import { TEMPLATES, THEMES, loadProfile, render } from "./render.mjs";

const login = process.env.SKIN_USER || process.argv[2];
if (!login) throw new Error("Set SKIN_USER (or pass a username): node skin/skin.mjs <username>");

// Fetch everything before writing anything, so a failed run keeps the previous images.
const d = await loadProfile(login, process.env.GITHUB_TOKEN);
const out = new URL("out/", import.meta.url);
await mkdir(out, { recursive: true });
for (const template of Object.keys(TEMPLATES))
  for (const theme of Object.keys(THEMES))
    for (const [file, svg] of Object.entries(render(d, template, theme))) await writeFile(new URL(`${template}-${theme}-${file}`, out), svg);
await writeFile(new URL("profile.json", import.meta.url), JSON.stringify(d, null, 2) + "\n"); // the builder previews with this
console.log(`Wrote ${Object.keys(TEMPLATES).length * Object.keys(THEMES).length} skins to skin/out for @${login}`);
