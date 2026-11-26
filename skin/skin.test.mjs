import test from "node:test";
import assert from "node:assert/strict";
import { summarize, loadProfile, render, TEMPLATES, THEMES } from "./render.mjs";

const user = { login: "octo", name: "A & B <x>", bio: "Builds\n  things", location: "Earth", public_repos: 4, followers: 1250, created_at: "2019-05-01T00:00:00Z" };
const repos = [
  { fork: false, language: "Go", stargazers_count: 5 },
  { fork: false, language: "Go", stargazers_count: 2 },
  { fork: false, language: "Rust", stargazers_count: 1 },
  { fork: false, language: null, stargazers_count: 0 },
  { fork: true, language: "C", stargazers_count: 99 },
];

test("summarize skips forks and ranks languages", () => {
  const d = summarize(user, repos);
  assert.equal(d.bio, "Builds things");
  assert.deepEqual(d.stats, [["Repos", 4], ["Stars", 8], ["Followers", 1250], ["Joined", "2019"]]);
  assert.deepEqual(d.languages.map((l) => l.name), ["Go", "Rust"]);
  assert.equal(d.languages[0].pct, 2 / 3);
});

test("every template and theme renders escaped SVG", () => {
  const d = summarize(user, repos);
  for (const template of Object.keys(TEMPLATES))
    for (const theme of Object.keys(THEMES))
      for (const svg of Object.values(render(d, template, theme))) {
        assert.ok(svg.startsWith("<svg") && svg.trimEnd().endsWith("</svg>"), `${template}/${theme}`);
        assert.ok(!svg.includes("<x>") && !svg.includes("A & B"), `${template}/${theme} must escape user text`);
      }
  assert.ok(render(d, "classic", "dracula")["header.svg"].includes("A &amp; B &lt;x&gt;"));
  assert.ok(render(d, "orbit", "light")["stats.svg"].includes(">1.3k<"));
  assert.ok(render(d, "terminal", "neon")["stats.svg"].includes(">1.3k<"));
});

test("empty profile still renders", () => {
  const d = summarize({ login: "new", public_repos: 0, followers: 0, created_at: "2024-01-01T00:00:00Z" }, []);
  for (const template of Object.keys(TEMPLATES)) assert.ok(render(d, template, "neon")["header.svg"].includes("Hi, I&#39;m @new"));
  assert.ok(render(d, "classic", "neon")["stats.svg"].includes("No public code yet"));
  assert.ok(render(d, "terminal", "neon")["stats.svg"].includes("no public code yet"));
});

test("loadProfile pages through repos and explains a missing user", async (t) => {
  const page = (n) => Array.from({ length: n }, () => ({ fork: false, language: "Go", stargazers_count: 1 }));
  t.mock.method(globalThis, "fetch", async (url) => {
    const body = url.endsWith("/users/octo") ? user : url.endsWith("&page=1") ? page(100) : url.endsWith("&page=2") ? page(5) : null;
    return { ok: !!body, status: body ? 200 : 404, json: async () => body, text: async () => "" };
  });
  const d = await loadProfile("octo");
  assert.equal(d.stats[1][1], 105);
  assert.equal(globalThis.fetch.mock.callCount(), 3);
  await assert.rejects(loadProfile("ghost"), /No GitHub user named "ghost"/);
});
